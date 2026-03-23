/**
 * Regras de limpeza e classificação do dataset (Google Places).
 * Ajuste as listas conforme seu domínio (ex.: psicólogos, clínicas).
 */

/** Palavras de cargo/especialidade a remover do title para extrair só o nome da pessoa */
export const PALAVRAS_REMOVER_DO_NOME = [
  'psicóloga',
  'psicologo',
  'psicólogo',
  'psicóloga infantil',
  'psicólogo infantil',
  'neuropsicóloga',
  'neuropsicologo',
  'neuropsicólogo',
  'neuropsicologa',
  'neuropsicóloga infantil',
  'dra.',
  'dr.',
  'infantil',
  'juvenil',
  'individual',
  'casal',
  'e individual',
  'e adulto',
  'unidade infantil',
  'terapia cognitivo',
  'comportamental',
  'avaliação neuropsicologica',
  'avaliação neuropsicológica',
];

/** Palavras que indicam clínica/instituto (vai para clinicas-DB) */
export const PALAVRAS_CLINICA = [
  'clínica',
  'clinica',
  'instituto',
  'instituição',
  'instituicao',
  'centro',
  'espaço',
  'espaco',
  'clinic',
];

/**
 * Títulos limpos que devem ser considerados inválidos (vai para invalidos-DB).
 * Ex.: "Unidade", "em Campo Grande", "Terapia...", fragmentos que não são nome de pessoa.
 */
export const TITULOS_INVALIDOS_BLACKLIST = [
  'unidade',
  'unidade infantil',
  'terapia',
  'avaliação',
  'avaliacao',
  'em campo grande',
  'campo grande',
  'de terapia',
  'cognitivo',
  'comportamental',
  'e individual',
  'e adulto',
  'e juvenil',
  'e casal',
  'e mulheres',
  'e crianças',
  'crianças',
  'adolescentes',
  'mulheres',
  'e adolescentes',
];

/** Comprimento mínimo do nome limpo (caracteres). Nomes muito curtos são inválidos. */
export const NOME_MIN_LENGTH = 3;
