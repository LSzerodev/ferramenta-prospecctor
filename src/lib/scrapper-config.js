import { readJson, writeJson } from './file-io.js';

const SCRAPPER_CONFIG_FILE = 'scrapper-config.json';

export const DEFAULT_SCRAPPER_CONFIG = {
  phoneTypingDelayMs: 2000,
  messageTypingDelayMs: 1000,
};

function normalizeDelay(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 60000) return 60000;
  return Math.round(parsed);
}

export function normalizeScrapperConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    phoneTypingDelayMs: normalizeDelay(source.phoneTypingDelayMs, DEFAULT_SCRAPPER_CONFIG.phoneTypingDelayMs),
    messageTypingDelayMs: normalizeDelay(source.messageTypingDelayMs, DEFAULT_SCRAPPER_CONFIG.messageTypingDelayMs),
  };
}

export async function readScrapperConfig() {
  const saved = await readJson(SCRAPPER_CONFIG_FILE);
  const normalized = normalizeScrapperConfig(saved);

  if (
    !saved ||
    saved.phoneTypingDelayMs !== normalized.phoneTypingDelayMs ||
    saved.messageTypingDelayMs !== normalized.messageTypingDelayMs
  ) {
    await writeJson(SCRAPPER_CONFIG_FILE, normalized);
  }

  return normalized;
}

export async function writeScrapperConfig(input) {
  const normalized = normalizeScrapperConfig(input);
  await writeJson(SCRAPPER_CONFIG_FILE, normalized);
  return normalized;
}
