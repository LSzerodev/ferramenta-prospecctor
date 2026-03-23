/**
 * Substitui placeholders no texto da prospeccao pelos dados de cada contato.
 * Usa `name` como nome preferido e mantem `title` como alias antigo.
 */

function resolveTemplateValues(item) {
  const name = item.name ?? item.title ?? '';
  const nameOriginal = item.nameOriginal ?? item.titleOriginal ?? '';
  const cleanName = item.cleanName ?? item.titleLimpo ?? '';

  return {
    name,
    nome: name,
    title: name,
    nameOriginal,
    titleOriginal: nameOriginal,
    cleanName,
    titleLimpo: cleanName,
    phone: item.phone ?? '',
    website: item.website ?? '',
    ramo: item.ramo ?? '',
    url: item.url ?? '',
  };
}

/**
 * @param {string} template
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
export function applyMessageTemplate(template, item) {
  if (typeof template !== 'string') return '';

  let out = template;
  const values = resolveTemplateValues(item);
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{${key}}`).join(value == null ? '' : String(value));
  }
  return out;
}

export function normalizeTemplateBodyPlaceholders(template) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{titleOriginal\}/g, '{nameOriginal}').replace(/\{title\}/g, '{name}');
}

export const PLACEHOLDER_HINTS = [
  { key: '{name}', desc: 'Nome limpo da pessoa' },
  { key: '{nome}', desc: 'Alias em portugues para {name}' },
  { key: '{nameOriginal}', desc: 'Nome ou titulo completo como veio no seu arquivo' },
  { key: '{phone}', desc: 'Telefone' },
  { key: '{ramo}', desc: 'Categoria / especialidade (ex.: esteticista)' },
  { key: '{website}', desc: 'Site, se tiver' },
  { key: '{url}', desc: 'Link do Google Maps, se tiver' },
  { key: '{title}', desc: 'Alias antigo de compatibilidade para {name}' },
];
