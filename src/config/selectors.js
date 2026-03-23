/**
 * Seletores do WhatsApp Web para Puppeteer.
 * ALTERE conforme a versão atual do WhatsApp Web (podem mudar após atualizações).
 *
 * Como descobrir os seletores:
 * 1. Abra WhatsApp Web no Chrome.
 * 2. F12 → Aba Elements (ou Inspecionar).
 * 3. Use "Selecionar elemento" e clique no botão/campo desejado.
 * 4. No HTML, use o atributo mais estável: data-testid, aria-label, role, etc.
 */

export const SELECTORS = {
  /** Botão que abre nova conversa / ícone "Novo chat" */
  openButton: 'button[data-tab="2"]',

  /** (Opcional) Clique extra antes de digitar o número (ex.: aba Pesquisar). Use null se não precisar. */
  pessoaCLick: null,

  /** Campo onde digitar o número/telefone para pesquisar o contato (contenteditable no WhatsApp) */
  phoneInput: 'div[aria-label="Pesquisar nome ou número"]',

  /** Campo da mensagem (conversa aberta) - contenteditable */
  messageInput: 'div[role="textbox"][contenteditable="true"][data-tab="10"]',

  /** Botão de enviar a mensagem */
  sendButton: 'button[aria-label="Enviar"]',
};
