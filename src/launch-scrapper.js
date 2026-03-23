import puppeteer from 'puppeteer';
import { SELECTORS } from './config/selectors.js';
import { delayRange, delayWithJitter, wait } from './lib/delay.js';
import { readJson, writeJson } from './lib/file-io.js';
import { logStep, STATUS } from './lib/logger.js';
import { applyMessageTemplate } from './lib/message-template.js';
import { DEFAULT_SCRAPPER_CONFIG, readScrapperConfig } from './lib/scrapper-config.js';
import {
  clearField,
  clickSend,
  focusSearch,
  openNewChat,
  pessoaClick,
  pressEnter,
  typeInSearch,
  typeMessage,
  waitForMessageInput,
} from './lib/whatsapp-actions.js';

const PROGRESS_FILE = 'progress.json';
const MENSAGENS_FILE = 'mensagens-prospeccao.json';
const MIN_DELAY_MS = 2000;
const JITTER_MS = 1000;

const FALLBACK_TEMPLATE =
  'Oii {name} tudo bem? Vi seu perfil aqui no google e me chamou atencao sua atuacao na area de {ramo}';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    reset: args.includes('--reset'),
    dryRun: args.includes('--dryRun') || args.includes('--dry-run'),
  };
}

function resolveDelayFromEnv(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  return Math.round(parsed);
}

/**
 * @returns {Promise<string>}
 */
async function resolveMessageTemplateBody() {
  const envId = process.env.SCRAPPER_TEMPLATE_ID?.trim();
  const config = await readJson(MENSAGENS_FILE);
  if (!config?.templates?.length) {
    console.log('Nenhum modelo em mensagens-prospeccao.json - usando texto padrao.\n');
    return FALLBACK_TEMPLATE;
  }
  const id = envId || config.activeTemplateId;
  const template = config.templates.find((item) => item.id === id) || config.templates[0];
  if (!template?.body) return FALLBACK_TEMPLATE;
  console.log(`Modelo de mensagem: "${template.name ?? template.id}" (id: ${template.id})\n`);
  return String(template.body);
}

async function resolveTypingConfig() {
  const savedConfig = await readScrapperConfig();
  const phoneTypingDelayMs = resolveDelayFromEnv(
    process.env.SCRAPPER_PHONE_TYPING_DELAY_MS,
    savedConfig.phoneTypingDelayMs ?? DEFAULT_SCRAPPER_CONFIG.phoneTypingDelayMs
  );
  const messageTypingDelayMs = resolveDelayFromEnv(
    process.env.SCRAPPER_MESSAGE_TYPING_DELAY_MS,
    savedConfig.messageTypingDelayMs ?? DEFAULT_SCRAPPER_CONFIG.messageTypingDelayMs
  );

  console.log(
    `Tempo por digito do numero: ${phoneTypingDelayMs}ms | Tempo por caractere da mensagem: ${messageTypingDelayMs}ms\n`
  );

  return {
    phoneTypingDelayMs,
    messageTypingDelayMs,
  };
}

async function main() {
  const { reset, dryRun } = parseArgs();

  if (dryRun) {
    console.log('Modo ensaio: o WhatsApp abre, mas NAO clica em enviar.\n');
  }

  const [templateBody, typingConfig] = await Promise.all([resolveMessageTemplateBody(), resolveTypingConfig()]);

  const pessoasDb = await readJson('pessoas-DB.json');
  if (!pessoasDb || !Array.isArray(pessoasDb) || pessoasDb.length === 0) {
    console.log('Nao ha ninguem na lista de contatos ainda. Envie seu JSON no site e clique em organizar primeiro.');
    return;
  }

  let lastIndex = 0;
  if (!reset) {
    const progress = await readJson(PROGRESS_FILE);
    if (progress && typeof progress.lastIndex === 'number' && progress.lastIndex >= 0) {
      lastIndex = progress.lastIndex;
      if (lastIndex >= pessoasDb.length) {
        console.log(
          `O progresso salvo (${lastIndex}) ja passou do tamanho da lista atual (${pessoasDb.length}).\n` +
            'Marque reset ao iniciar ou zere o progresso antes de tentar de novo.'
        );
        return;
      }
      console.log(`Continuando a partir do numero ${lastIndex + 1} da lista (${pessoasDb.length - lastIndex} faltando).\n`);
    }
  } else {
    await writeJson(PROGRESS_FILE, { lastIndex: 0 });
    console.log('Progresso zerado. Comecando do primeiro da lista.\n');
  }

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './profile-zap',
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle2' });

  for (let i = lastIndex; i < pessoasDb.length; i++) {
    const item = pessoasDb[i];
    const name = item.name ?? item.title;
    const nameOriginal = item.nameOriginal ?? item.titleOriginal;
    const { phone, website, ramo } = item;

    if (!phone) {
      logStep(i, name, phone, STATUS.SKIP, 'sem_telefone');
      continue;
    }

    logStep(i, name, phone, STATUS.START);

    await openNewChat(page);
    await wait(page, 500);
    await pessoaClick(page);
    await wait(page, 300);

    const searchFocused = await focusSearch(page, 15000);
    if (!searchFocused) {
      logStep(i, name, phone, STATUS.SKIP, 'campo_pesquisa_nao_encontrado');
      continue;
    }
    logStep(i, name, phone, STATUS.SEARCH_OK);

    const typed = await typeInSearch(page, phone, {
      minTypingMs: typingConfig.phoneTypingDelayMs,
      maxTypingMs: typingConfig.phoneTypingDelayMs,
    });
    if (!typed) {
      logStep(i, name, phone, STATUS.SKIP, 'falha_digitar_numero');
      continue;
    }

    await wait(page, 2000);
    await pressEnter(page);
    await wait(page, 2000);

    const chatOpened = await waitForMessageInput(page, 20000, 2);
    if (!chatOpened) {
      logStep(i, name, phone, STATUS.SKIP, 'conversa_nao_abriu');
      continue;
    }
    logStep(i, name, phone, STATUS.CHAT_OK);

    const script = applyMessageTemplate(templateBody, {
      name,
      title: name,
      phone,
      website,
      nameOriginal,
      titleOriginal: nameOriginal,
      ramo,
      url: item.url,
    });

    const msgTyped = await typeMessage(page, script, {
      minTypingMs: typingConfig.messageTypingDelayMs,
      maxTypingMs: typingConfig.messageTypingDelayMs,
    });
    if (!msgTyped) {
      logStep(i, name, phone, STATUS.SKIP, 'falha_digitar_mensagem');
      continue;
    }
    logStep(i, name, phone, STATUS.MSG_OK);

    if (!dryRun) {
      await delayRange(4000, 4000);
      await clickSend(page, true);
      logStep(i, name, phone, STATUS.SENT_OK);
    } else {
      logStep(i, name, phone, STATUS.SKIP, 'dryRun_nao_enviou');
    }

    await writeJson(PROGRESS_FILE, { lastIndex: i + 1 });

    await wait(page, 500);
    await clearField(page, SELECTORS.phoneInput);
    await clearField(page, SELECTORS.messageInput);
    await delayWithJitter(MIN_DELAY_MS, JITTER_MS);
  }

  await browser.close();
  console.log('\nEnvio automatico terminou.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
