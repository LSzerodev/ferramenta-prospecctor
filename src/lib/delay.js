/**
 * Delay e wait sem depender de page.waitForTimeout (removido em Puppeteer recente).
 */

/** Delay em ms (Promise que resolve após ms milissegundos). */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Espera ms milissegundos. Se a página tiver waitForTimeout (Puppeteer antigo), usa;
 * senão usa delay(ms).
 */
export async function wait(page, ms) {
  if (page && typeof page.waitForTimeout === 'function') {
    return page.waitForTimeout(ms);
  }
  return delay(ms);
}

/**
 * Delay com jitter leve (0 a maxJitter ms) para estabilidade/rate limit.
 * @param {number} baseMs - delay base em ms
 * @param {number} [maxJitter=300] - jitter máximo em ms (aleatório 0..maxJitter)
 */
export async function delayWithJitter(baseMs, maxJitter = 300) {
  const jitter = Math.floor(Math.random() * (maxJitter + 1));
  await delay(baseMs + jitter);
}

/** Retorna inteiro aleatório entre min (inclusive) e max (inclusive) */
export function randomInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/** Aguarda um tempo aleatório entre minMs e maxMs (ambos em ms) */
export async function delayRange(minMs, maxMs) {
  if (typeof minMs !== 'number' || typeof maxMs !== 'number') {
    throw new Error('delayRange requires numeric minMs and maxMs');
  }
  const ms = randomInt(minMs, maxMs);
  await delay(ms);
}
