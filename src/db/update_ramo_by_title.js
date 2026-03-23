import fs from "fs";

const DB_PATH = new URL("./pessoas-DB.json", import.meta.url);
const OVERRIDES_PATH = new URL("./gender-overrides.json", import.meta.url);

function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(name) {
  return stripDiacritics(String(name || ""))
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z-]/g, "");
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  try {
    const raw = fs.readFileSync(OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function guessGenderFromTitleOriginal(titleOriginal) {
  if (typeof titleOriginal !== "string") return null;
  const s = stripDiacritics(titleOriginal).toLowerCase();

  // Prefer explicit feminine markers first.
  if (/\bneuropsicologa\b/.test(s)) return "F";
  if (/\bpsicologa\b/.test(s)) return "F";

  if (/\bneuropsicologo\b/.test(s)) return "M";
  if (/\bpsicologo\b/.test(s)) return "M";

  return null;
}

function isLikelyNonPersonKey(key) {
  if (!key) return true;
  if (key.length <= 1) return true;

  const ignore = new Set([
    "dr",
    "dra",
    "psicologo",
    "psicologa",
    "neuropsicologo",
    "neuropsicologa",
    "hospital",
    "clinica",
    "consultorios",
    "consultorio",
    "centro",
    "instituto",
    "servico",
    "saude",
    "mental",
    "caps",
    "crp",
    "itcc",
    "acpd",
  ]);

  return ignore.has(key);
}

function guessGenderFromFirstName(firstName, overrides) {
  const key = normalizeKey(firstName);
  if (!key) return null;
  if (isLikelyNonPersonKey(key)) return null;

  const ov = overrides[key];
  if (ov === "F" || ov === "M") return ov;

  // Fast, local heuristics (PT-BR). Not perfect, but works well for common cases.
  const maleAExceptions = new Set([
    "luca",
    "josua",
    "noa",
    "nikola",
    "akira",
    "isma",
  ]);

  const femaleStrong = new Set([
    "maria",
    "ana",
    "julia",
    "juliana",
    "amanda",
    "beatriz",
    "carolina",
    "camila",
    "mariana",
    "renata",
    "fernanda",
    "gabriela",
    "isabela",
    "isabella",
    "luana",
    "larissa",
    "patricia",
    "rosalia",
    "nina",
    "thamires",
  ]);

  const maleStrong = new Set([
    "patrick",
    "joao",
    "jose",
    "pedro",
    "lucas",
    "gabriel",
    "rafael",
    "bruno",
    "carlos",
    "paulo",
    "mateus",
    "matheus",
    "andre",
    "felipe",
    "marcos",
    "higor",
    "heron",
    "eliezer",
    "freedy",
  ]);

  if (femaleStrong.has(key)) return "F";
  if (maleStrong.has(key)) return "M";

  if (key.endsWith("a") && !maleAExceptions.has(key)) return "F";
  if (key.endsWith("ia")) return "F";
  if (key.endsWith("ana")) return "F";
  if (key.endsWith("ela")) return "F";
  if (key.endsWith("ine") || key.endsWith("line")) return "F";
  if (key.endsWith("isa") || key.endsWith("iza")) return "F";

  if (key.endsWith("o")) return "M";
  if (key.endsWith("son")) return "M";
  if (key.endsWith("el")) return "M";

  return null;
}

function setGenderedPrefixKeepingSuffix(value, baseMasc, baseFem, gender) {
  if (typeof value !== "string" || (gender !== "F" && gender !== "M"))
    return value;

  let suffix;
  if (value.startsWith(baseMasc)) suffix = value.slice(baseMasc.length);
  else if (value.startsWith(baseFem)) suffix = value.slice(baseFem.length);
  else return value;

  const desired = gender === "F" ? baseFem : baseMasc;
  return desired + suffix;
}

function applyGenderToRamo(ramo, gender) {
  if (typeof ramo !== "string" || !gender) return ramo;

  // Psicólogo(a) ...
  if (ramo.startsWith("Psicólogo") || ramo.startsWith("Psicóloga")) {
    return setGenderedPrefixKeepingSuffix(ramo, "Psicólogo", "Psicóloga", gender);
  }

  // Neuropsicólogo(a) ...
  if (ramo.startsWith("Neuropsicólogo") || ramo.startsWith("Neuropsicóloga")) {
    return setGenderedPrefixKeepingSuffix(
      ramo,
      "Neuropsicólogo",
      "Neuropsicóloga",
      gender,
    );
  }

  // Other ramo values are left untouched (e.g. "Terapeuta de casal").
  return ramo;
}

function main() {
  const overrides = loadOverrides();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const data = JSON.parse(raw);

  let changed = 0;
  const unknown = new Map(); // key -> display

  for (const item of data) {
    const title = item?.name ?? item?.title;
    const ramo = item?.ramo;
    if (typeof title !== "string") continue;

    const gender =
      guessGenderFromTitleOriginal(item?.titleOriginal) ??
      guessGenderFromFirstName(title, overrides);
    if (!gender) {
      const key = normalizeKey(title);
      if (key && !isLikelyNonPersonKey(key) && !unknown.has(key)) {
        unknown.set(key, title);
      }
      continue;
    }

    const nextRamo = applyGenderToRamo(ramo, gender);
    if (nextRamo !== ramo) {
      item.ramo = nextRamo;
      changed += 1;
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");

  const unknownList = [...unknown.values()].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  console.log(
    JSON.stringify(
      {
        total: Array.isArray(data) ? data.length : 0,
        changed,
        unknown_count: unknownList.length,
        unknown_examples: unknownList.slice(0, 60),
        tip:
          unknownList.length > 0
            ? 'Adicione em src/db/gender-overrides.json: { "nome": "F" | "M" } (sempre em minúsculo, sem acento).'
            : null,
      },
      null,
      2,
    ),
  );
}

main();
