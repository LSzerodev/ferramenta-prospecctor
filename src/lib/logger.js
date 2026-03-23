/**
 * Logs padronizados por índice do item (START, SEARCH_OK, CHAT_OK, MSG_OK, SENT_OK, SKIP).
 */

const STATUS = {
  START: 'START',
  SEARCH_OK: 'SEARCH_OK',
  CHAT_OK: 'CHAT_OK',
  MSG_OK: 'MSG_OK',
  SENT_OK: 'SENT_OK',
  SKIP: 'SKIP',
};

/**
 * Log de um passo do pipeline para um item.
 * @param {number} index - índice do item no DB
 * @param {string} [name] - nome do contato
 * @param {string} [phone] - telefone
 * @param {string} status - START | SEARCH_OK | CHAT_OK | MSG_OK | SENT_OK | SKIP
 * @param {string} [reason] - motivo (ex.: para SKIP)
 */
export function logStep(index, name, phone, status, reason = '') {
  const ts = new Date().toISOString().slice(11, 23);
  const parts = [`[${ts}]`, `[${index}]`, status];
  if (name != null) parts.push(name);
  if (phone != null) parts.push(phone);
  if (reason) parts.push(`(${reason})`);
  console.log(parts.join(' '));
}

export { STATUS };
