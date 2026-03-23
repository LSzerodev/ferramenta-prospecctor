/**
 * Pipeline de limpeza do dataset: le dataset original, classifica em pessoas / clinicas / invalidos,
 * escreve pessoas-DB.json, clinicas-DB.json, invalidos-DB.json.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { getDbDir, ensureDbDir, writeJson } from './lib/file-io.js';
import { extrairNomePessoa, normalizarPhone, classificarItem } from './lib/text-cleaner.js';

/** Nome do arquivo do dataset original em src/db (altere se usar outro arquivo). */
export const DATASET_FILENAME = 'dataset_crawler-google-places_2026-02-22_22-51-03-715.json';

const DATASET_KEYS = ['dataset', 'data', 'items', 'results', 'records', 'places', 'leads', 'contacts'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeDatasetRow(value) {
  if (!isRecord(value)) return false;
  return (
    'title' in value ||
    'name' in value ||
    'displayName' in value ||
    'nome' in value ||
    'phone' in value ||
    'telefone' in value ||
    'categoryName' in value ||
    'categories' in value
  );
}

function resolveDatasetList(value, depth = 0) {
  if (Array.isArray(value)) {
    if (value.length === 0 || value.some(looksLikeDatasetRow)) return value;
    return null;
  }
  if (!isRecord(value) || depth > 3) return null;

  for (const key of DATASET_KEYS) {
    const found = resolveDatasetList(value[key], depth + 1);
    if (found) return found;
  }

  for (const nested of Object.values(value)) {
    const found = resolveDatasetList(nested, depth + 1);
    if (found) return found;
  }

  return null;
}

function pickFirstString(item, keys) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function pickFirstArrayString(item, keys) {
  for (const key of keys) {
    const value = item[key];
    if (!Array.isArray(value)) continue;
    const first = value.find((entry) => typeof entry === 'string' && entry.trim());
    if (first) return first.trim();
  }
  return null;
}

function extractPhoneFromText(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const urlMatch =
    value.match(/(?:phone=|wa\.me\/|tel:)(\+?\d[\d\s().-]{7,}\d)/i) ??
    value.match(/(\+?\d[\d\s().-]{9,}\d)/);

  return urlMatch?.[1]?.trim() ?? null;
}

function normalizeInputRecord(item) {
  const name =
    pickFirstString(item, ['title', 'name', 'displayName', 'nome', 'businessName']) ??
    pickFirstString(item, ['titleOriginal']);
  const phoneRaw =
    pickFirstString(item, ['phone', 'telefone', 'phoneNumber', 'whatsapp', 'mobile', 'celular']) ??
    extractPhoneFromText(pickFirstString(item, ['website', 'site', 'url', 'link', 'mapsUrl', 'profileUrl']) ?? '');
  const ramo =
    pickFirstString(item, ['categoryName', 'category', 'ramo', 'specialty', 'speciality']) ??
    pickFirstArrayString(item, ['categories', 'tags']);

  return {
    nameOriginal: name?.trim() ?? '',
    phone: phoneRaw ?? null,
    website: pickFirstString(item, ['website', 'site']) ?? null,
    ramo: ramo ?? null,
    url: pickFirstString(item, ['url', 'link', 'mapsUrl', 'profileUrl', 'googleMapsUrl']) ?? null,
  };
}

/**
 * Classifica um dataset bruto em pessoas, clinicas e invalidos.
 * Aceita tanto um array na raiz quanto objetos com a lista dentro de data/items/results/records.
 *
 * @param {unknown} rawDb
 * @returns {{ pessoas: object[], clinicas: object[], invalidos: object[] }}
 */
export function processRawDataset(rawDb) {
  const rows = resolveDatasetList(rawDb);
  if (!rows) {
    throw new Error(
      'O JSON precisa ser uma lista de registros ou conter a lista em data/items/results/records.'
    );
  }

  const pessoas = [];
  const clinicas = [];
  const invalidos = [];

  for (const rawItem of rows) {
    if (!isRecord(rawItem)) continue;

    const item = normalizeInputRecord(rawItem);
    const originalTitle = item.nameOriginal;
    if (!originalTitle) continue;

    const cleanName = extrairNomePessoa(originalTitle);
    const phoneNorm = normalizarPhone(item.phone);
    const classification = classificarItem(originalTitle, cleanName);

    const baseRecord = {
      nameOriginal: originalTitle,
      titleOriginal: originalTitle,
      phone: phoneNorm ?? item.phone ?? null,
      website: item.website,
      ramo: item.ramo,
      url: item.url,
    };

    if (classification === 'clinica') {
      clinicas.push({
        name: originalTitle,
        title: originalTitle,
        ...baseRecord,
      });
      continue;
    }

    if (classification === 'invalido') {
      let reason = 'titulo_na_blacklist_ou_muito_curto';
      if (cleanName.length < 3) reason = 'nome_limpo_muito_curto';
      invalidos.push({
        ...baseRecord,
        cleanName,
        titleLimpo: cleanName,
        reason,
      });
      continue;
    }

    pessoas.push({
      name: cleanName,
      title: cleanName,
      ...baseRecord,
    });
  }

  return { pessoas, clinicas, invalidos };
}

/**
 * Le o dataset original e classifica itens em:
 * - pessoas: name limpo, phone normalizado, website, ramo, url, nameOriginal
 * - clinicas: name original + dados
 * - invalidos: item completo + cleanName + reason
 * Escreve os 3 JSONs em src/db.
 */
export async function gerarDbLimpo() {
  const dbDir = getDbDir();
  const datasetPath = path.join(dbDir, DATASET_FILENAME);

  let rawDb;
  try {
    rawDb = JSON.parse(await fs.readFile(datasetPath, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Dataset nao encontrado: ${datasetPath}. Coloque o JSON em src/db/ ou altere DATASET_FILENAME em db-pipeline.js`
      );
    }
    throw err;
  }

  const { pessoas, clinicas, invalidos } = processRawDataset(rawDb);

  await ensureDbDir();
  await writeJson('pessoas-DB.json', pessoas);
  await writeJson('clinicas-DB.json', clinicas);
  await writeJson('invalidos-DB.json', invalidos);

  console.log('DBs gerados em src/db:');
  console.log(`   pessoas-DB.json (${pessoas.length})`);
  console.log(`   clinicas-DB.json (${clinicas.length})`);
  console.log(`   invalidos-DB.json (${invalidos.length})`);

  return {
    counts: {
      pessoas: pessoas.length,
      clinicas: clinicas.length,
      invalidos: invalidos.length,
    },
  };
}
