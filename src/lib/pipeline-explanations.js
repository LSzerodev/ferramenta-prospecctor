/**
 * Textos simples sobre cada lista gerada e motivos de “ignorado”.
 */

export const OUTPUT_EXPLANATIONS = {
  pessoas: {
    tituloSimples: 'Pessoas para contato',
    umaFrase:
      'É a lista boa: cada linha é alguém que o sistema achou que é uma pessoa (não empresa), com nome usável e telefone quando existia.',
    arquivoInterno: 'Salvo automaticamente para o WhatsApp usar.',
  },
  clinicas: {
    tituloSimples: 'Lugares que parecem empresa',
    umaFrase:
      'Aqui ficaram clínicas, consultórios com nome de marca, etc. O WhatsApp automático NÃO usa esta lista — é só para você ver o que foi separado.',
    arquivoInterno: 'Guardado para consulta; não é erro, é separação.',
  },
  invalidos: {
    tituloSimples: 'Ignorados na hora de mandar mensagem',
    umaFrase:
      'Estes registros o sistema não confiou para disparo automático: nome estranho, muito curto, ou parecia endereço/cidade em vez de pessoa.',
    arquivoInterno: 'Você pode abrir a lista e conferir um por um.',
  },
};

const REASON_HUMAN = {
  titulo_na_blacklist_ou_muito_curto:
    'O nome depois da limpeza parece cidade, cargo genérico ou palavra bloqueada — não dá para tratar como pessoa com segurança.',
  nome_limpo_muito_curto: 'O nome ficou com menos de 3 letras — muito curto para usar.',
};

/**
 * @param {string} [code]
 * @returns {string}
 */
export function humanizeInvalidReason(code) {
  if (!code) return 'Motivo não informado.';
  return REASON_HUMAN[code] ?? `Motivo técnico: ${code}.`;
}

/**
 * @param {object} item
 */
export function enrichInvalidoForUi(item) {
  const reason = item?.reason;
  return {
    ...item,
    motivoParaVoce: humanizeInvalidReason(reason),
  };
}
