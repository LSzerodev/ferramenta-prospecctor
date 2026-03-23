/**
 * Limpeza de texto: extrair nome da pessoa, normalizar telefone, classificar item (pessoa/clínica/inválido).
 */

import {
  PALAVRAS_REMOVER_DO_NOME,
  PALAVRAS_CLINICA,
  TITULOS_INVALIDOS_BLACKLIST,
  NOME_MIN_LENGTH,
} from '../config/cleaning-rules.js';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrai só o nome da pessoa do title (remove cargos, corta em | • , e trata " - ").
 */
export function extrairNomePessoa(titleOriginal) {
  const temTraco = titleOriginal.includes(' - ');
  let nome;

  if (temTraco) {
    const [antes, depois] = titleOriginal.split(' - ');
    const antesTemCargo = PALAVRAS_REMOVER_DO_NOME.some((p) =>
      new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(antes.trim())
    );
    nome = antesTemCargo ? depois : antes;
  } else {
    nome = titleOriginal;
  }

  for (const p of PALAVRAS_REMOVER_DO_NOME) {
    nome = nome.replace(new RegExp(`\\b${escapeRegExp(p)}\\b`, 'gi'), '');
  }

  nome = nome.split(/[|•,]/)[0];
  nome = nome.replace(/^\s*-\s*|\s*-\s*\/?\s*$/g, '').trim().replace(/\s+/g, ' ');
  return nome || titleOriginal;
}

/**
 * Normaliza telefone: remove espaços, parênteses, traços.
 * Não inventa números; apenas limpa. Formato final apenas dígitos (ex.: 5567991622065).
 */
export function normalizarPhone(phone) {
  if (phone == null || typeof phone !== 'string') return null;
  const digits = phone.replace(/\s+|\(|\)|-|\./g, '');
  const onlyDigits = digits.replace(/\D/g, '');
  return onlyDigits.length >= 10 ? onlyDigits : phone.trim() || null;
}

/**
 * Classifica um item do dataset: 'clinica' | 'pessoa' | 'invalido'.
 * invalido: título limpo na blacklist, ou nome muito curto, ou não parece nome.
 */
export function classificarItem(originalTitle, titleLimpo) {
  const trimmed = (titleLimpo || '').trim();

  const ehClinica = PALAVRAS_CLINICA.some((p) =>
    new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(originalTitle || '')
  );
  if (ehClinica) return 'clinica';

  if (trimmed.length < NOME_MIN_LENGTH) return 'invalido';

  const naBlacklist = TITULOS_INVALIDOS_BLACKLIST.some((p) =>
    new RegExp(`^${escapeRegExp(p)}$|^${escapeRegExp(p)}\\.\\.\\.?$`, 'i').test(trimmed)
  );
  if (naBlacklist) return 'invalido';

  return 'pessoa';
}
