/**
 * API HTTP: organiza JSON, gerencia mensagens de prospeccao, inicia o scrapper e expone downloads.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import express from 'express';
import multer from 'multer';
import cors from 'cors';

import { processRawDataset, gerarDbLimpo, resolveLocalDatasetFileName } from './db-pipeline.js';
import { readJson, writeJson, getDbDir, ensureDbDir } from './lib/file-io.js';
import { OUTPUT_EXPLANATIONS, enrichInvalidoForUi } from './lib/pipeline-explanations.js';
import { PLACEHOLDER_HINTS, normalizeTemplateBodyPlaceholders } from './lib/message-template.js';
import { normalizeScrapperConfig, readScrapperConfig, writeScrapperConfig } from './lib/scrapper-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ALLOWED_DB_FILES = new Set(['pessoas-DB.json', 'clinicas-DB.json', 'invalidos-DB.json', 'progress.json']);
const LISTA_AMIGAVEL = {
  contatos: 'pessoas-DB.json',
  lugares: 'clinicas-DB.json',
  ignorados: 'invalidos-DB.json',
};
const MAX_IGNORADOS_NA_RESPOSTA = 500;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json({ limit: '80mb' }));

function defaultMensagensConfig() {
  return {
    templates: [
      {
        id: 'padrao-amigavel',
        name: 'Mensagem simpatica (padrao)',
        body: 'Oii {name} tudo bem? Vi seu perfil e me chamou atencao sua atuacao na area de {ramo}. Posso te falar rapidinho?',
      },
      {
        id: 'formal-doutora',
        name: 'Mais formal - doutor(a)',
        body: 'Ola, {name}, tudo bem? Sou da area de estetica e gostaria de conversar. Vi seu contato em {nameOriginal}.',
      },
    ],
    activeTemplateId: 'padrao-amigavel',
  };
}

function normalizeMensagensConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const templates = Array.isArray(source.templates)
    ? source.templates
        .filter((template) => template && typeof template === 'object')
        .map((template) => ({
          id: String(template.id ?? '').trim(),
          name: String(template.name ?? '').trim(),
          body: normalizeTemplateBodyPlaceholders(String(template.body ?? '')),
        }))
        .filter((template) => template.id && template.name && template.body)
    : [];

  return {
    templates,
    activeTemplateId: String(source.activeTemplateId ?? '').trim(),
  };
}

async function readMensagensConfig() {
  let data = await readJson('mensagens-prospeccao.json');
  data = normalizeMensagensConfig(data);
  if (!data.templates.length) {
    data = defaultMensagensConfig();
  } else if (!data.activeTemplateId || !data.templates.some((template) => template.id === data.activeTemplateId)) {
    data.activeTemplateId = data.templates[0].id;
  }
  await ensureDbDir();
  await writeJson('mensagens-prospeccao.json', data);
  return data;
}

function validateMensagensBody(body) {
  if (!body || typeof body !== 'object') return 'Corpo invalido.';
  const { templates, activeTemplateId } = body;
  if (!Array.isArray(templates)) return 'templates precisa ser uma lista.';
  if (templates.length > 40) return 'No maximo 40 mensagens.';

  const ids = new Set();
  for (const t of templates) {
    if (!t || typeof t !== 'object') return 'Cada mensagem precisa ser um objeto.';

    const id = String(t.id ?? '').trim();
    const name = String(t.name ?? '').trim();
    const msgBody = String(t.body ?? '');

    if (!id || id.length > 64) return 'Cada mensagem precisa de um id curto.';
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return `Id invalido: ${id}`;
    if (ids.has(id)) return `Id repetido: ${id}`;
    ids.add(id);

    if (!name || name.length > 100) return 'Cada mensagem precisa de um nome curto para voce lembrar.';
    if (!msgBody || msgBody.length > 8000) return 'Texto da mensagem vazio ou muito grande (max. 8000 caracteres).';
  }

  const active = String(activeTemplateId ?? '').trim();
  if (active && !ids.has(active)) return 'A mensagem escolhida como padrao nao existe na lista.';
  return null;
}

/** @type {import('node:child_process').ChildProcess | null} */
let scrapperChild = null;
const scrapperLogs = [];
const MAX_LOG_LINES = 2500;

function pushScrapperLog(chunk) {
  const text = String(chunk);
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (line.length === 0 && scrapperLogs.length && scrapperLogs[scrapperLogs.length - 1] === '') continue;
    scrapperLogs.push(line);
  }

  while (scrapperLogs.length > MAX_LOG_LINES) {
    scrapperLogs.shift();
  }
}

function parseDatasetFromUpload(file, body) {
  if (file?.buffer) {
    const raw = file.buffer.toString('utf-8');
    return JSON.parse(raw);
  }
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Object.keys(body).length > 0) return body;
  throw new Error('Envie um arquivo .json ou um JSON no corpo da requisicao.');
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'scrapper-whatsap-api',
    message: 'Este backend expoe apenas a API. Abra a interface web Next para usar o painel.',
    webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    docs: {
      dashboard: '/api/dashboard',
      pipelineUpload: '/api/pipeline',
      pipelineLocal: '/api/pipeline/local',
      scrapperConfig: '/api/scrapper/config',
      startScrapper: '/api/scrapper/start',
    },
  });
});

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [pessoas, clinicas, invalidos, progress, localDatasetFile] = await Promise.all([
      readJson('pessoas-DB.json'),
      readJson('clinicas-DB.json'),
      readJson('invalidos-DB.json'),
      readJson('progress.json'),
      resolveLocalDatasetFileName(),
    ]);
    const running = scrapperChild !== null && scrapperChild.exitCode === null;

    res.json({
      ok: true,
      scrapperRunning: running,
      scrapperPid: running ? scrapperChild.pid : null,
      counts: {
        pessoas: Array.isArray(pessoas) ? pessoas.length : 0,
        clinicas: Array.isArray(clinicas) ? clinicas.length : 0,
        invalidos: Array.isArray(invalidos) ? invalidos.length : 0,
      },
      progress: progress ?? { lastIndex: 0 },
      dbDir: getDbDir(),
      pipelineLocalFile: localDatasetFile,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/scrapper/config', async (_req, res) => {
  try {
    const config = await readScrapperConfig();
    res.json({ ok: true, ...config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.put('/api/scrapper/config', async (req, res) => {
  try {
    const config = await writeScrapperConfig(normalizeScrapperConfig(req.body));
    res.json({ ok: true, ...config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/mensagens-prospeccao', async (_req, res) => {
  try {
    const config = await readMensagensConfig();
    res.json({
      ok: true,
      ...config,
      placeholders: PLACEHOLDER_HINTS,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.put('/api/mensagens-prospeccao', async (req, res) => {
  const errMsg = validateMensagensBody(req.body);
  if (errMsg) {
    res.status(400).json({ ok: false, error: errMsg });
    return;
  }

  try {
    const { templates, activeTemplateId } = req.body;
    const normalized = normalizeMensagensConfig({ templates, activeTemplateId });
    const data = {
      templates: normalized.templates,
      activeTemplateId: String(activeTemplateId || templates[0]?.id || ''),
    };
    if (!data.activeTemplateId || !data.templates.some((template) => template.id === data.activeTemplateId)) {
      data.activeTemplateId = data.templates[0]?.id ?? '';
    }
    await ensureDbDir();
    await writeJson('mensagens-prospeccao.json', data);
    res.json({ ok: true, ...data, placeholders: PLACEHOLDER_HINTS });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/ver/lista/:tipo', async (req, res) => {
  const filename = LISTA_AMIGAVEL[req.params.tipo];
  if (!filename) {
    res.status(404).json({ ok: false, error: 'Tipo desconhecido. Use: contatos, lugares ou ignorados.' });
    return;
  }

  try {
    const data = await readJson(filename);
    const lista = Array.isArray(data) ? data : [];
    if (req.params.tipo === 'ignorados') {
      res.json({ ok: true, lista: lista.map(enrichInvalidoForUi) });
      return;
    }
    res.json({ ok: true, lista });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/pipeline/local', async (_req, res) => {
  try {
    const { counts, sourceFile, sourcePath } = await gerarDbLimpo();
    res.json({ ok: true, counts, source: sourcePath, sourceFile });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/pipeline', upload.single('file'), async (req, res) => {
  try {
    const raw = parseDatasetFromUpload(req.file, req.body);
    const { pessoas, clinicas, invalidos } = processRawDataset(raw);

    await ensureDbDir();
    await writeJson('pessoas-DB.json', pessoas);
    await writeJson('clinicas-DB.json', clinicas);
    await writeJson('invalidos-DB.json', invalidos);

    const ignoradosAmostra = invalidos.slice(0, MAX_IGNORADOS_NA_RESPOSTA).map(enrichInvalidoForUi);

    res.json({
      ok: true,
      counts: {
        pessoas: pessoas.length,
        clinicas: clinicas.length,
        invalidos: invalidos.length,
      },
      oQueFoiGerado: {
        pessoas: OUTPUT_EXPLANATIONS.pessoas,
        clinicas: OUTPUT_EXPLANATIONS.clinicas,
        invalidos: OUTPUT_EXPLANATIONS.invalidos,
      },
      amostra: {
        pessoas: pessoas.slice(0, 5),
        lugares: clinicas.slice(0, 3),
      },
      ignorados: {
        lista: ignoradosAmostra,
        total: invalidos.length,
        truncado: invalidos.length > MAX_IGNORADOS_NA_RESPOSTA,
      },
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/db/:filename', async (req, res) => {
  const { filename } = req.params;
  if (!ALLOWED_DB_FILES.has(filename)) {
    res.status(404).json({ ok: false, error: 'Arquivo nao permitido.' });
    return;
  }

  try {
    const data = await readJson(filename);
    if (data === null) {
      res.status(404).json({ ok: false, error: 'Ainda nao existe. Organize seu JSON primeiro.' });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/progress', async (_req, res) => {
  try {
    const progress = await readJson('progress.json');
    res.json({ ok: true, progress: progress ?? { lastIndex: 0 } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/progress/reset', async (_req, res) => {
  try {
    await writeJson('progress.json', { lastIndex: 0 });
    res.json({ ok: true, progress: { lastIndex: 0 } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/api/status', async (_req, res) => {
  try {
    const [pessoas, clinicas, invalidos, progress] = await Promise.all([
      readJson('pessoas-DB.json'),
      readJson('clinicas-DB.json'),
      readJson('invalidos-DB.json'),
      readJson('progress.json'),
    ]);
    const running = scrapperChild !== null && scrapperChild.exitCode === null;

    res.json({
      ok: true,
      scrapperRunning: running,
      pessoasCount: Array.isArray(pessoas) ? pessoas.length : 0,
      clinicasCount: Array.isArray(clinicas) ? clinicas.length : 0,
      invalidosCount: Array.isArray(invalidos) ? invalidos.length : 0,
      progress: progress ?? { lastIndex: 0 },
      dbDir: getDbDir(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/scrapper/start', async (req, res) => {
  if (scrapperChild && scrapperChild.exitCode === null) {
    res.status(409).json({ ok: false, error: 'Ja esta rodando. Pare antes de iniciar de novo.' });
    return;
  }

  const dryRun = Boolean(req.body?.dryRun);
  const reset = Boolean(req.body?.reset);
  const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId.trim() : '';
  let typingConfig = null;

  try {
    const [pessoas, progress, savedTypingConfig] = await Promise.all([
      readJson('pessoas-DB.json'),
      readJson('progress.json'),
      readScrapperConfig(),
    ]);
    const pessoasCount = Array.isArray(pessoas) ? pessoas.length : 0;
    const lastIndex =
      progress && typeof progress.lastIndex === 'number' && progress.lastIndex >= 0 ? progress.lastIndex : 0;
    typingConfig = normalizeScrapperConfig({
      ...savedTypingConfig,
      phoneTypingDelayMs:
        req.body?.phoneTypingDelayMs == null ? savedTypingConfig.phoneTypingDelayMs : req.body.phoneTypingDelayMs,
      messageTypingDelayMs:
        req.body?.messageTypingDelayMs == null
          ? savedTypingConfig.messageTypingDelayMs
          : req.body.messageTypingDelayMs,
    });

    if (pessoasCount === 0) {
      res.status(400).json({
        ok: false,
        error: 'Nao ha contatos na lista ainda. Organize o JSON primeiro para gerar pessoas-DB.json.',
      });
      return;
    }

    if (!reset && lastIndex >= pessoasCount) {
      res.status(400).json({
        ok: false,
        error: `O progresso salvo (${lastIndex}) ja chegou ao fim da lista atual (${pessoasCount}). Marque para recomecar do inicio ou zere o progresso.`,
      });
      return;
    }

    await writeScrapperConfig(typingConfig);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
    return;
  }

  const args = [path.join(ROOT, 'src', 'launch-scrapper.js')];
  if (reset) args.push('--reset');
  if (dryRun) args.push('--dryRun');

  scrapperLogs.length = 0;
  pushScrapperLog(
    `[servidor] Iniciando WhatsApp automatico${reset ? ' (lista do zero)' : ''}${dryRun ? ' - MODO ENSAIO (nao envia)' : ''}${templateId ? ` - modelo id: ${templateId}` : ''}\n`
  );
  pushScrapperLog(
    `[servidor] Tempo por digito do numero: ${typingConfig.phoneTypingDelayMs}ms | Tempo por caractere da mensagem: ${typingConfig.messageTypingDelayMs}ms\n`
  );

  scrapperChild = spawn(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ...(templateId ? { SCRAPPER_TEMPLATE_ID: templateId } : {}),
      SCRAPPER_PHONE_TYPING_DELAY_MS: String(typingConfig.phoneTypingDelayMs),
      SCRAPPER_MESSAGE_TYPING_DELAY_MS: String(typingConfig.messageTypingDelayMs),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  scrapperChild.stdout?.on('data', (d) => pushScrapperLog(d));
  scrapperChild.stderr?.on('data', (d) => pushScrapperLog(d));
  scrapperChild.on('close', (code) => {
    pushScrapperLog(`\n[servidor] Processo encerrado (codigo ${code}).\n`);
    scrapperChild = null;
  });

  res.json({ ok: true, message: 'Abra o WhatsApp Web quando o navegador aparecer.' });
});

app.post('/api/scrapper/stop', (_req, res) => {
  if (!scrapperChild || scrapperChild.exitCode !== null) {
    res.json({ ok: false, error: 'Nada rodando no momento.' });
    return;
  }
  scrapperChild.kill('SIGTERM');
  res.json({ ok: true, message: 'Pedido de parada enviado.' });
});

app.get('/api/scrapper/status', (_req, res) => {
  const running = scrapperChild !== null && scrapperChild.exitCode === null;
  res.json({ ok: true, running, pid: running ? scrapperChild.pid : null });
});

app.get('/api/scrapper/logs', (req, res) => {
  const tail = Math.min(parseInt(String(req.query.tail || '800'), 10) || 800, MAX_LOG_LINES);
  const slice = scrapperLogs.slice(-tail);
  res.json({ ok: true, lines: slice, total: scrapperLogs.length });
});

app.post('/api/fix-ramo', async (_req, res) => {
  const scriptPath = path.join(ROOT, 'src', 'db', 'update_ramo_by_title.js');
  try {
    await fs.access(scriptPath);
  } catch {
    res.status(500).json({ ok: false, error: 'Script update_ramo_by_title.js nao encontrado.' });
    return;
  }

  let replied = false;
  const reply = (fn) => {
    if (replied) return;
    replied = true;
    fn();
  };

  const chunks = [];
  const child = spawn(process.execPath, [scriptPath], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (d) => chunks.push(d));
  child.stderr?.on('data', (d) => chunks.push(d));

  child.on('close', (code) => {
    const out = Buffer.concat(chunks).toString('utf-8').trim();
    let parsed = null;

    try {
      parsed = JSON.parse(out);
    } catch {
      const lines = out.split(/\n/).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          parsed = JSON.parse(lines[i]);
          break;
        } catch {
          // continua procurando uma linha que seja JSON.
        }
      }
    }

    reply(() => {
      if (parsed && typeof parsed === 'object') {
        res.json({ ok: code === 0, exitCode: code, result: parsed, raw: out });
      } else {
        res.json({ ok: code === 0, exitCode: code, result: null, raw: out });
      }
    });
  });

  child.on('error', (err) => {
    reply(() => res.status(500).json({ ok: false, error: err.message }));
  });
});

const PORT = Number(process.env.PORT) || 3847;
const server = app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Raiz: ${ROOT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPorta ${PORT} ja esta em uso.\n` +
        `Feche o outro processo ou use outra porta, por exemplo: set PORT=3848 && npm run serve\n` +
        `(PowerShell: $env:PORT=3848; npm run serve)\n`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
