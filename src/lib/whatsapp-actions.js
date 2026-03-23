/**
 * Ações no WhatsApp Web: abrir nova conversa, pesquisar número, confirmar conversa aberta,
 * digitar em contenteditable, enviar. Sem page.waitForTimeout; usa delay/wait.
 */

import { SELECTORS } from '../config/selectors.js';
import { delay, delayRange } from './delay.js';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

/**
 * Clica no botão que abre nova conversa (openButton). Se não existir, retorna false.
 */
export async function openNewChat(page) {
  const sel = SELECTORS.openButton;
  const el = await page.$(sel);
  if (!el) return false;
  await el.click();
  return true;
}

/**
 * (Opcional) Clica no elemento pessoaCLick antes de digitar o número.
 */
export async function pessoaClick(page) {
  if (!SELECTORS.pessoaCLick) return true;
  const el = await page.$(SELECTORS.pessoaCLick);
  if (!el) return false;
  await el.click();
  return true;
}

/**
 * Foca no campo de pesquisa (phoneInput) e espera estar visível.
 * Retorna true se encontrou e focou em até timeout ms.
 */
export async function focusSearch(page, timeout = 15000) {
  const sel = SELECTORS.phoneInput;
  try {
    await page.waitForSelector(sel, { timeout, visible: true });
  } catch {
    return false;
  }
  await page.focus(sel);
  return true;
}

/**
 * Digita no campo de pesquisa (contenteditable): Ctrl+A, Backspace, keyboard.type.
 */
export async function typeInSearch(page, phone, opts = {}) {
  const sel = SELECTORS.phoneInput;
  try {
    await page.waitForSelector(sel, { timeout: 10000, visible: true });
  } catch {
    return false;
  }
  await page.focus(sel);
  await page.keyboard.down(MOD);
  await page.keyboard.press('KeyA');
  await page.keyboard.up(MOD);
  await page.keyboard.press('Backspace');
  const minTypingMs = typeof opts.minTypingMs === 'number' ? opts.minTypingMs : 30000; // 30s
  const maxTypingMs = typeof opts.maxTypingMs === 'number' ? opts.maxTypingMs : 60000; // 60s
  for (const ch of String(phone)) {
    await page.keyboard.type(ch);
    await delayRange(minTypingMs, maxTypingMs);
  }
  return true;
}

/**
 * Pressiona Enter (para confirmar pesquisa / abrir conversa).
 */
export async function pressEnter(page) {
  await page.keyboard.press('Enter');
}

/**
 * Espera o messageInput ficar visível (conversa aberta). Retry: tenta até maxRetries vezes,
 * com Enter + wait entre tentativas.
 */
export async function waitForMessageInput(page, timeout = 20000, maxRetries = 2) {
  const sel = SELECTORS.messageInput;
  for (let r = 0; r <= maxRetries; r++) {
    try {
      await page.waitForSelector(sel, { timeout: r === 0 ? timeout : 8000, visible: true });
      return true;
    } catch {
      if (r < maxRetries) {
        await pressEnter(page);
        await delay(1500);
      }
    }
  }
  return false;
}

/**
 * Digita texto no campo da mensagem (contenteditable): focus, Ctrl+A, Backspace, keyboard.type.
 */
export async function typeMessage(page, text, opts = {}) {
  const sel = SELECTORS.messageInput;
  try {
    await page.waitForSelector(sel, { timeout: 10000, visible: true });
  } catch {
    return false;
  }
  await page.focus(sel);
  await page.keyboard.down(MOD);
  await page.keyboard.press('KeyA');
  await page.keyboard.up(MOD);
  await page.keyboard.press('Backspace');
  const minTypingMs = typeof opts.minTypingMs === 'number' ? opts.minTypingMs : 30000; // 30s
  const maxTypingMs = typeof opts.maxTypingMs === 'number' ? opts.maxTypingMs : 60000; // 60s
  for (const ch of String(text)) {
    await page.keyboard.type(ch);
    await delayRange(minTypingMs, maxTypingMs);
  }
  return true;
}

/**
 * Clica no botão enviar. Se não existir, tenta keyboard.press('Enter') como fallback.
 */
export async function clickSend(page, useEnterFallback = true) {
  const el = await page.$(SELECTORS.sendButton);
  if (el) {
    await el.click();
    return true;
  }
  if (useEnterFallback) {
    await page.keyboard.press('Enter');
    return true;
  }
  return false;
}

/**
 * Limpa o campo (contenteditable): focus, Ctrl+A, Backspace.
 */
export async function clearField(page, selector) {
  const el = await page.$(selector);
  if (!el) return false;
  await page.focus(selector);
  await page.keyboard.down(MOD);
  await page.keyboard.press('KeyA');
  await page.keyboard.up(MOD);
  await page.keyboard.press('Backspace');
  return true;
}
