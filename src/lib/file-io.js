/**
 * Leitura e escrita de JSON em src/db.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'src', 'db');

export function getDbDir() {
  return DB_DIR;
}

export async function ensureDbDir() {
  await fs.mkdir(DB_DIR, { recursive: true });
}

/**
 * Lê um JSON em src/db.
 * @param {string} filename - nome do arquivo (ex.: pessoas-DB.json)
 */
export async function readJson(filename) {
  const filePath = path.join(DB_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Escreve um JSON em src/db.
 */
export async function writeJson(filename, data) {
  await ensureDbDir();
  const filePath = path.join(DB_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
