// Anatomy data derived from the Z-Anatomy models.
//
// The GLB files exported from Z-Anatomy carry the anatomical name on every mesh
// (Terminologia Anatomica, English), with a `.l` / `.r` suffix for paired
// structures. Rather than duplicating those ~2800 names in a separate data file
// that would drift out of sync, systems.json only lists which mesh belongs to
// which system, and every label is derived from the mesh name at runtime.
//
// The Uzbek term bank (public/data/terms.uz.json) is the exception: it is
// keyed by the same Z-Anatomy name, so it cannot drift either, and it only
// supplies the *display* name. The name that identifies a structure — the one
// in the URL, in systems.json and in the models themselves — stays English, so
// a shared link keeps working in every language.

import { asset } from '../utils/paths.js';
import { DEFAULT_LANG, LANGUAGE_CODES } from './languages.js';

const SIDE_SUFFIX = { '.l': 'left', '.r': 'right' };

const SIDE_LABEL = {
  uz: { left: 'chap', right: 'oʻng' },
  it: { left: 'sinistro', right: 'destro' },
  en: { left: 'left', right: 'right' }
};

export const SYSTEM_IDS = [
  'skeletal',
  'muscular',
  'joints',
  'cardiovascular',
  'lymphatic',
  'nervous',
  'visceral'
];

// System loaded on startup. The others are fetched when the user enables them,
// so the initial payload stays around 2 MB instead of ~47 MB.
export const DEFAULT_SYSTEM = 'skeletal';

export function splitSide(meshName) {
  const suffix = meshName.slice(-2);
  const side = SIDE_SUFFIX[suffix];
  return side
    ? { base: meshName.slice(0, -2), side }
    : { base: meshName, side: null };
}

export function formatBaseName(base, lang = DEFAULT_LANG, terms = null) {
  // Z-Anatomy wraps structures outside the official terminology in parentheses.
  const clean = base.replace(/^\((.*)\)$/, '$1').trim();

  // A term bank entry replaces the anatomical noun; the name in the models is
  // what it is, but the label a reader sees is what the language calls it.
  const translated = terms?.[base]?.trim();
  return translated || clean;
}

export function formatPartName(meshName, lang = DEFAULT_LANG, terms = null) {
  const { base, side } = splitSide(meshName);
  const label = formatBaseName(base, lang, terms);

  if (!side) return label;

  const sideLabel = (SIDE_LABEL[lang] || SIDE_LABEL.en)[side];
  return `${label} (${sideLabel})`;
}

export async function loadRegionsData() {
  try {
    const response = await fetch(asset('data/regions.json'));
    return response.ok ? await response.json() : {};
  } catch {
    return {};
  }
}

export async function loadSystemsData() {
  const response = await fetch(asset('data/systems.json'));
  if (!response.ok) {
    throw new Error(`systems.json: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Latin names and the non-official-terminology flag, extracted from the
// Z-Anatomy source file by tools/export-lexicon.py.
export async function loadLexicon() {
  try {
    const response = await fetch(asset('data/lexicon.json'));
    return response.ok ? await response.json() : {};
  } catch {
    return {};
  }
}

// The anatomical term banks: one file per language, keyed by the Z-Anatomy
// name of the structure. A language without a term bank is not an error — the
// structure keeps the English name, which is what the atlas showed before the
// term banks existed.
export async function loadTerms() {
  const terms = {};

  await Promise.all(LANGUAGE_CODES.map(async code => {
    try {
      const response = await fetch(asset(`data/terms.${code}.json`));
      if (response.ok) terms[code] = await response.json();
    } catch {
      // No term bank for this language.
    }
  }));

  return terms;
}

// Definitions are an order of magnitude larger than the rest of the data, so
// they are fetched once in the background rather than blocking the first frame.
// Each language has its own file; the English one is the fallback, because
// the English text is the one every structure has.
const definitionsCache = new Map();

export function loadDefinitions(lang = DEFAULT_LANG) {
  if (!definitionsCache.has(lang)) {
    const request = fetch(asset(`data/definitions.${lang}.json`))
      .then(response => (response.ok ? response.json() : null))
      .catch(() => null)
      .then(async (dictionary) => {
        if (dictionary) return { dictionary, translated: true };
        // No file for this language: fall back to the English text.
        const fallback = await fetch(asset('data/definitions.json'))
          .then(response => (response.ok ? response.json() : {}))
          .catch(() => ({}));
        return { dictionary: fallback, translated: false };
      });

    definitionsCache.set(lang, request);
  }

  return definitionsCache.get(lang);
}

// Builds the part dictionary the store expects, keyed by mesh name because that
// is what loadModel.js registers as partId.
export function buildPartsData(systemsData, lexicon = {}, termsByLang = {}, regionsData = {}) {
  const parts = {};
  const regionByBase = new Map();
  Object.entries(regionsData).forEach(([region, names]) => {
    names.forEach(base => regionByBase.set(base, region));
  });

  Object.entries(systemsData).forEach(([systemId, meshNames]) => {
    meshNames.forEach(meshName => {
      const { base, side } = splitSide(meshName);
      const entry = lexicon[base] || {};

      parts[meshName] = {
        id: meshName,
        meshName,
        name: {
          uz: formatPartName(meshName, 'uz', termsByLang.uz),
          en: formatPartName(meshName, 'en', termsByLang.en),
          it: formatPartName(meshName, 'it', termsByLang.it)
        },
        // The same name without the side. A paired structure is one row in the
        // sidebar and one row in the search results, with a chip that picks the
        // left or the right, so the label itself carries no side.
        label: {
          uz: formatBaseName(base, 'uz', termsByLang.uz),
          en: formatBaseName(base, 'en', termsByLang.en),
          it: formatBaseName(base, 'it', termsByLang.it)
        },
        baseName: base,
        side,
        system: systemId,
        region: regionByBase.get(base) || null,
        latinName: entry.la || '',
        // Z-Anatomy parenthesises names that are not in Terminologia Anatomica.
        official: entry.official !== false
      };
    });
  });

  return parts;
}
