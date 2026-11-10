import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildPartsData } from '../src/data/anatomy.js';
import { buildSearchIndex, loadSynonyms, normalise, searchStructures } from '../src/utils/dataLoader.js';
import { state } from '../src/state/store.js';
import { DEFAULT_LANG } from '../src/data/languages.js';

// The search index is built from the data files the atlas ships; the tests
// read them from disk instead of over HTTP.

const DATA_DIR = path.resolve('public/data');

function readJson(name) {
  return readFile(path.join(DATA_DIR, name), 'utf8').then(JSON.parse);
}

describe('the Uzbek search', () => {
  beforeAll(async () => {
    const [systems, lexicon, terms] = await Promise.all([
      readJson('systems.json'),
      readJson('lexicon.json'),
      readJson('terms.uz.json')
    ]);

    // loadSynonyms() reads the files over fetch(); the stub serves them from
    // disk so the test exercises the real index.
    vi.stubGlobal('fetch', async url => {
      const file = String(url).replace(/^\//, '');
      try {
        const body = await readFile(path.resolve('public', file), 'utf8');
        return { ok: true, json: async () => JSON.parse(body) };
      } catch {
        return { ok: false, status: 404, json: async () => ({}) };
      }
    });

    state.partsData = buildPartsData(systems, lexicon, { uz: terms });
    state.loadedSystems = Object.keys(systems);

    await loadSynonyms();
    buildSearchIndex();
  });

  it('indexes one row per structure', () => {
    expect(state.searchIndex.length).toBe(1643);
  });

  it('shows the Uzbek name', () => {
    const femur = state.searchIndex.find(row => row.base === 'Femur');
    expect(femur.label).toBe('Son suyagi');
    expect(femur.labels.uz).toBe('Son suyagi');
  });

  it('finds the femur when the reader types "son"', () => {
    const [first] = searchStructures('son');
    expect(first.base).toBe('Femur');
  });

  it('finds the muscles when the reader types "mushk"', () => {
    const results = searchStructures('mushk', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(row => row.system === 'muscular')).toBe(true);
  });

  it('finds the right lung when the reader types "oʻng oʻpka"', () => {
    const results = searchStructures('oʻng oʻpka', 10);
    expect(results.length).toBeGreaterThan(0);
    // Every hit is a structure of the right lung.
    expect(results.every(row => /oʻng oʻpka/i.test(row.labels.uz))).toBe(true);
  });

  it('finds a structure through its Uzbek synonym', () => {
    const results = searchStructures('dum', 10);
    expect(results.map(row => row.base)).toContain('Gluteus maximus muscle');
  });

  it('accepts the alphabet that was adopted in 2026 as well', () => {
    // The 2026 reform writes oʻ as ö and gʻ as ğ; both spellings must find
    // the same structure.
    expect(normalise('boʻgʻim')).toBe(normalise('boğim'));
    expect(normalise('bogʻich')).toBe(normalise('bogich'));
  });

  it('finds the liver when the reader types "jigar"', () => {
    const [first] = searchStructures('jigar');
    expect(first.base).toBe('Liver');
  });

  it('finds the heart by its Uzbek name', () => {
    const results = searchStructures('yurak', 10);
    expect(results.length).toBeGreaterThan(0);
    // The chambers of the heart are called "qorincha", so they are found
    // through the synonym, and the vessels of the heart by their own name.
    expect(results.map(row => row.base)).toContain('Circumflex artery of heart');
    expect(results.map(row => row.base)).toContain('Left ventricle');
  });

  it('defaults to the Uzbek label', () => {
    expect(state.language).toBe(DEFAULT_LANG);
    const femur = state.searchIndex.find(row => row.base === 'Femur');
    expect(femur.label).toBe(femur.labels.uz);
  });
});
