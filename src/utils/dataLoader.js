// Data loading from JSON files
import { state, setTranslations, setSearchIndex, notify } from '../state/store.js';
import { asset } from './paths.js';
import { DEFAULT_LANG, LANGUAGE_CODES } from '../data/languages.js';

// Parts and systems are set up in main.js from systems.json (see data/anatomy.js);
// this only loads the UI translations and refreshes the search index.
export async function loadAllData() {
  try {
    // Every language the atlas ships is fetched, not a hardcoded pair: adding
    // a language is a line in src/data/languages.js plus its dictionary.
    const dictionaries = await Promise.all(LANGUAGE_CODES.map(async code => {
      const response = await fetch(asset(`data/translations/${code}.json`));
      return response.ok ? [code, await response.json()] : null;
    }));

    const fetched = {};
    dictionaries.filter(Boolean).forEach(([code, dictionary]) => { fetched[code] = dictionary; });

    // Merged over the fallback dictionaries rather than replacing them: a
    // dictionary that fails to load leaves the built-in copy in place.
    if (Object.keys(fetched).length) {
      setTranslations({ ...state.translations, ...fetched });
    }

    // Search synonyms for every language, so the index is built once and
    // answers a query in any of them.
    await loadSynonyms();
    buildSearchIndex();

    notify('dataLoaded', true);
  } catch (error) {
    console.error('Error loading data:', error);
    notify('dataError', error);
  }
}

// "femore" must find "Femur", so queries and terms are compared with accents
// folded away and case removed.
//
// The Uzbek alphabet makes this harder than it looks. The letters Oʻ and Gʻ
// carry U+02BB, which is not a combining mark and survives a plain NFD; the
// alphabet adopted on 21 October 2026 writes Ö, Ğ, Ş and Ç instead, and it
// takes effect on 22 April 2027. Both spellings are in use, and people type
// plain apostrophes and backticks as well, so every one of them is folded onto
// the same form: a reader who types "bogich", "bogʻich" or "boğich" finds the
// same structure.
export function normalise(text) {
  return text
    // Ş and Ç become the sh and ch they were written as before the 2026
    // reform. This has to happen before the decomposition below, which would
    // otherwise turn ş into a bare s.
    .replace(/ş/g, 'sh')
    .replace(/ç/g, 'ch')
    // NFKD, not NFD: ğ has a compatibility decomposition to g + U+0326, and
    // NFD alone would leave it untouched.
    .normalize('NFKD')
    // The combining marks: ö → o, ğ → g, ü → u, é → e, à → a.
    .replace(/[̀-ͯ]/g, '')
    // The apostrophe and its look-alikes: oʻ → o, gʻ → g, maʼno → mano.
    .replace(/[ʻʼ‘’«'`´]/g, '')
    .toLowerCase()
    .trim();
}

let synonymsByLang = {};
let bucketsByLang = {};

export async function loadSynonyms() {
  const loaded = await Promise.all(LANGUAGE_CODES.map(async code => {
    try {
      const response = await fetch(asset(`data/synonyms.${code}.json`));
      return response.ok ? [code, await response.json()] : null;
    } catch {
      // Search still works without them, just not in this language.
      return null;
    }
  }));

  synonymsByLang = {};
  loaded.filter(Boolean).forEach(([code, dictionary]) => { synonymsByLang[code] = dictionary; });

  // Z-Anatomy names a muscle "Gluteus maximus muscle" and splits others into
  // parts ("Acromial part of deltoid muscle"), so a term is attached to every
  // structure whose name contains it, not only to an exact match.
  // Bucketing by first word keeps that from being 1643 x 204 comparisons.
  bucketsByLang = {};

  Object.entries(synonymsByLang).forEach(([code, dictionary]) => {
    const buckets = new Map();
    Object.keys(dictionary).forEach(key => {
      const first = key.split(' ')[0];
      if (!buckets.has(first)) buckets.set(first, []);
      buckets.get(first).push(key);
    });
    bucketsByLang[code] = buckets;
  });
}

function synonymTermsFor(normalisedBase) {
  const words = normalisedBase.split(/[^a-z0-9+]+/).filter(Boolean);
  const found = [];

  Object.entries(bucketsByLang).forEach(([code, buckets]) => {
    for (const word of new Set(words)) {
      const candidates = buckets.get(word);
      if (!candidates) continue;

      for (const key of candidates) {
        if (normalisedBase === key || normalisedBase.includes(key)) {
          found.push(...synonymsByLang[code][key]);
        }
      }
    }
  });

  return [...new Set(found)];
}

// One row per anatomical structure, not per mesh: a paired structure appears
// once with both sides attached, instead of filling the list with duplicates.
export function buildSearchIndex() {
  if (!state.partsData) return;

  const rows = new Map();

  Object.entries(state.partsData).forEach(([partId, info]) => {
    const base = info.baseName || partId;
    const system = info.system || 'unknown';
    const key = `${base}|${system}`;

    let row = rows.get(key);
    if (!row) {
      const synonyms = synonymTermsFor(normalise(base));
      row = {
        key,
        base,
        // The label a reader sees, in the language currently selected.
        label: '',
        // Every language the same structure is known by.
        labels: {
          uz: info.label?.uz || base,
          en: info.label?.en || base,
          it: info.label?.it || base
        },
        system,
        sides: {},
        partIds: [],
        synonyms,
        // The English name, the localised name and every synonym, all folded
        // to the same form so a query in any language finds the row.
        terms: [
          normalise(base),
          ...Object.values(info.label || {}).map(normalise),
          ...synonyms.map(normalise)
        ].filter(Boolean)
      };
      rows.set(key, row);
    }

    row.partIds.push(partId);
    row.sides[info.side || 'none'] = partId;
  });

  const index = [...rows.values()];
  setSearchLanguage(state.language || DEFAULT_LANG, index);
  setSearchIndex(index);
}

// The displayed label follows the language selector; the search terms do not,
// so switching language never makes a structure unfindable.
export function setSearchLanguage(lang, index = state.searchIndex) {
  index.forEach(row => {
    row.label = row.labels?.[lang] || row.labels?.[DEFAULT_LANG] || row.base;
  });
  if (index === state.searchIndex) notify('searchIndex', state.searchIndex);
}

function scoreRow(row, query, tokens) {
  let best = 0;

  for (const term of row.terms) {
    if (term === query) best = Math.max(best, 100);
    else if (term.startsWith(query)) best = Math.max(best, 80);
    else if (term.split(/[\s(),.-]+/).some(word => word.startsWith(query))) best = Math.max(best, 60);
    else if (term.includes(query)) best = Math.max(best, 40);
  }

  if (!best && tokens.length > 1) {
    // Every token has to appear somewhere for a multi-word query to count.
    const all = row.terms.join(' ');
    if (tokens.every(token => all.includes(token))) best = 35;
  }

  if (!best) return 0;

  // Prefer what the user can already see over a system still to be downloaded.
  if (state.loadedSystems.includes(row.system)) best += 15;

  // A short name that matches is a better answer than a long one that merely
  // contains the query.
  best -= Math.min(row.label.length / 12, 6);

  return best;
}

export function searchStructures(query, limit = 30) {
  if (!state.searchIndex || !query) return [];

  const normalised = normalise(query);
  if (normalised.length < 2) return [];

  const tokens = normalised.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const row of state.searchIndex) {
    const score = scoreRow(row, normalised, tokens);
    if (score > 0) scored.push({ row, score });
  }

  scored.sort((a, b) => b.score - a.score || a.row.label.length - b.row.label.length);

  return scored.slice(0, limit).map(entry => entry.row);
}
