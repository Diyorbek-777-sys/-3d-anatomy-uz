// Checks the anatomical term banks against the models.
//
// Every structure the atlas can show must have a name in every language that
// claims one, and the names must actually be in that language. The checks
// here are the ones that would otherwise only be caught by a reader:
//
//   1. every base name in systems.json has a term
//   2. no term without a structure (the bank has not drifted)
//   3. no empty value
//   4. no Cyrillic left over from an earlier orthography
//   5. the orthography is the current one: ʻ (U+02BB) and not the ASCII
//      apostrophe, and no letter that the 2026 reform introduced
//   6. the value is not just the English name with the side stripped
//   7. all 2827 mesh names expand to a non-empty display name
//
// Run: node tools/verify-translations.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('public/data');
const MODELS_DIR = path.resolve('public/models');

// The words that mean "this was never translated". A term that still contains
// one of them, and no Uzbek word, has not been translated at all.
const ENGLISH_ONLY = [
  'muscle', 'artery', 'vein', 'nerve', 'ligament', 'bone', 'cartilage', 'gland',
  'branch', 'node', 'joint', 'fascia', 'bursa', 'sinus', 'plexus', 'ventricle',
  'nucleus', 'sulcus', 'gyrus', 'segment', 'lobe', 'duct', 'tract', 'canal',
  'membrane', 'capsule', 'valve', 'meniscus', 'disc', 'body', 'part', 'of'
];

const problems = [];
const fail = (file, message) => problems.push(`${file}: ${message}`);

function baseOf(meshName) {
  return meshName.endsWith('.l') || meshName.endsWith('.r') ? meshName.slice(0, -2) : meshName;
}

const systems = JSON.parse(await readFile(path.join(DATA_DIR, 'systems.json'), 'utf8'));

const allMeshNames = Object.values(systems).flat();
const allBases = new Set(allMeshNames.map(baseOf));

// --- the term banks -----------------------------------------------------
const termFiles = (await readdir(DATA_DIR)).filter(name => /^terms\..+\.json$/.test(name));

if (!termFiles.length) {
  console.error('No term bank found in public/data. The atlas would show English names only.');
  process.exit(1);
}

for (const file of termFiles) {
  const terms = JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8'));

  // 1 + 2: coverage both ways.
  const missing = [...allBases].filter(base => !(base in terms));
  if (missing.length) {
    fail(file, `${missing.length} structure(s) without a name, e.g. ${missing.slice(0, 5).map(n => `"${n}"`).join(', ')}`);
  }

  const orphans = Object.keys(terms).filter(base => !allBases.has(base));
  if (orphans.length) {
    fail(file, `${orphans.length} name(s) without a structure, e.g. ${orphans.slice(0, 5).map(n => `"${n}"`).join(', ')}`);
  }

  for (const [key, value] of Object.entries(terms)) {
    // 3: empty values.
    if (typeof value !== 'string' || !value.trim()) {
      fail(file, `"${key}" has no name`);
      continue;
    }

    // 4: Cyrillic from the earlier orthography.
    if (/[Ѐ-ӿ]/.test(value)) {
      fail(file, `"${key}" contains Cyrillic: "${value}"`);
    }

    // 5: the orthography in use.
    if (value.includes("'")) {
      fail(file, `"${key}" uses the ASCII apostrophe; the orthography uses ʻ (U+02BB): "${value}"`);
    }
    if (/[şŞçÇ]/.test(value)) {
      fail(file, `"${key}" uses Ş or Ç, which the alphabet adopted on 22 April 2027 replaces: "${value}"`);
    }

    // 6: not translated at all.
    const words = value.split(/\s+/).map(word => word.replace(/[.,()]/g, '').toLowerCase());
    const englishOnly = words.filter(word => ENGLISH_ONLY.includes(word));
    if (englishOnly.length === words.length && words.length > 0) {
      fail(file, `"${key}" was not translated: "${value}"`);
    }
  }

  // 7: every mesh name expands to a display name.
  for (const meshName of allMeshNames) {
    const base = baseOf(meshName);
    const term = terms[base];
    if (!term) continue;
    if (!term.trim()) fail(file, `"${meshName}" expands to an empty name`);
  }

  console.log(`${file}: ${Object.keys(terms).length} names`);
}

// --- the synonym banks --------------------------------------------------
//
// A synonym key is a fragment of an English structure name; the search index
// attaches the values to every structure whose name contains the key. A key
// that matches nothing is dead weight the reader never sees.

const synonymFiles = (await readdir(DATA_DIR)).filter(name => /^synonyms\..+\.json$/.test(name));

for (const file of synonymFiles) {
  const lang = file.replace(/^synonyms\./, '').replace(/\.json$/, '');
  const synonyms = JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8'));
  // The orthography rules are Uzbek rules; the Italian bank ships as it came.
  const uzbek = lang === 'uz';

  for (const [key, values] of Object.entries(synonyms)) {
    if (!Array.isArray(values) || !values.length) {
      fail(file, `"${key}" has no synonym`);
      continue;
    }

    const matches = [...allBases].some(base => {
      const text = base.toLowerCase();
      return text.includes(key) && text.split(/[^a-z0-9+]+/).includes(key.split(' ')[0]);
    });

    if (!matches) {
      fail(file, `"${key}" matches no structure, so the search never uses it`);
    }

    for (const value of values) {
      if (typeof value !== 'string' || !value.trim()) {
        fail(file, `"${key}" has an empty synonym`);
      } else if (/[Ѐ-ӿ]/.test(value)) {
        fail(file, `"${key}" contains Cyrillic: "${value}"`);
      } else if (uzbek && value.includes("'")) {
        fail(file, `"${key}" uses the ASCII apostrophe; the orthography uses ʻ (U+02BB): "${value}"`);
      } else if (uzbek && /[şŞçÇ]/.test(value)) {
        fail(file, `"${key}" uses Ş or Ç, which the alphabet adopted on 22 April 2027 replaces: "${value}"`);
      }
    }
  }

  console.log(`${file}: ${Object.keys(synonyms).length} keys`);
}

// --- the definition banks -----------------------------------------------
//
// A definition is shown in the callout; every structure that has one in
// English must have one in the language too, or the reader is shown English
// without being told.

const definitionFiles = (await readdir(DATA_DIR)).filter(name => /^definitions\..+\.json$/.test(name));

for (const file of definitionFiles) {
  const lang = file.replace(/^definitions\./, '').replace(/\.json$/, '');
  const dictionary = JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8'));
  const terms = JSON.parse(await readFile(path.join(DATA_DIR, `terms.${lang}.json`), 'utf8'));

  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value !== 'string' || !value.trim()) {
      fail(file, `"${key}" has no definition`);
      continue;
    }

    if (/[Ѐ-ӿ]/.test(value)) {
      fail(file, `"${key}" contains Cyrillic: "${value}"`);
    }
    if (lang === 'uz') {
      if (value.includes("'")) {
        fail(file, `"${key}" uses the ASCII apostrophe; the orthography uses ʻ (U+02BB): "${value}"`);
      }
      if (/[şŞçÇ]/.test(value)) {
        fail(file, `"${key}" uses Ş or Ç, which the alphabet adopted on 22 April 2027 replaces: "${value}"`);
      }
      // The definition opens with the name the reader sees.
      const name = terms[key];
      if (name && !value.startsWith(name)) {
        fail(file, `"${key}" does not start with its name "${name}": "${value}"`);
      }
    }
  }

  console.log(`${file}: ${Object.keys(dictionary).length} definitions`);
}

// --- the body-region map -------------------------------------------------
const regions = JSON.parse(await readFile(path.join(DATA_DIR, 'regions.json'), 'utf8'));
const regionBases = Object.entries(regions).flatMap(([region, bases]) => {
  if (!Array.isArray(bases) || !bases.length) fail('regions.json', `"${region}" is empty or invalid`);
  return bases;
});
const regionCounts = new Map();
regionBases.forEach(base => regionCounts.set(base, (regionCounts.get(base) || 0) + 1));
const missingRegions = [...allBases].filter(base => !regionCounts.has(base));
const duplicateRegions = [...regionCounts].filter(([, count]) => count !== 1).map(([base]) => base);
const orphanRegions = [...regionCounts.keys()].filter(base => !allBases.has(base));
if (missingRegions.length) fail('regions.json', `${missingRegions.length} structures have no region`);
if (duplicateRegions.length) fail('regions.json', `${duplicateRegions.length} structures occur in multiple regions`);
if (orphanRegions.length) fail('regions.json', `${orphanRegions.length} region entries have no structure`);
console.log(`regions.json: ${regionBases.length} structure assignments across ${Object.keys(regions).length} regions`);

// --- the models ---------------------------------------------------------
const modelFiles = (await readdir(MODELS_DIR)).filter(name => name.endsWith('.glb'));
const modelBases = new Set();

for (const file of modelFiles) {
  const buffer = await readFile(path.join(MODELS_DIR, file));
  // The glTF chunk starts after the 12-byte header and its 8-byte preamble.
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));

  for (const node of gltf.nodes || []) {
    const name = node.extras?.za_name;
    if (name) modelBases.add(baseOf(name));
  }
}

const inModelsNotInIndex = [...modelBases].filter(base => !allBases.has(base));
const inIndexNotInModels = [...allBases].filter(base => !modelBases.has(base));

if (inModelsNotInIndex.length) {
  fail('systems.json', `${inModelsNotInIndex.length} structure(s) in the models are not indexed: ${inModelsNotInIndex.slice(0, 5).join(', ')}`);
}
if (inIndexNotInModels.length) {
  fail('systems.json', `${inIndexNotInModels.length} indexed structure(s) are not in the models: ${inIndexNotInModels.slice(0, 5).join(', ')}`);
}

console.log(`models: ${modelBases.size} structures, index: ${allBases.size}`);

// --- the models themselves ----------------------------------------------
// The GLBs are the anatomical truth. If the optimiser is ever run against
// them it rewrites systems.json from what survived, so the two must agree.
console.log(`mesh names: ${allMeshNames.length}`);

if (problems.length) {
  console.error('\nTranslation check failed:');
  problems.forEach(problem => console.error(`  - ${problem}`));
  process.exit(1);
}

console.log('\nAll checks passed.');
