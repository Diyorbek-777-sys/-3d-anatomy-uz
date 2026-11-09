import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalise } from '../src/utils/dataLoader.js';
import { DEFAULT_LANG, LANGUAGES, LANGUAGE_CODES } from '../src/data/languages.js';
import { FALLBACK_TRANSLATIONS } from '../src/data/translations.js';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

describe('language registry', () => {
  it('ships Uzbek as the default language', () => {
    expect(DEFAULT_LANG).toBe('uz');
  });

  it('keeps English and Italian alongside it', () => {
    expect(LANGUAGE_CODES).toEqual(['uz', 'en', 'it']);
  });

  it('gives every language a code, a short form and a label', () => {
    LANGUAGES.forEach(language => {
      expect(language.code).toMatch(/^[a-z]{2}$/);
      expect(language.short).toMatch(/^[A-Z]{2}$/);
      expect(language.label.length).toBeGreaterThan(0);
    });
  });
});

describe('dictionaries', () => {
  const languages = LANGUAGE_CODES;

  it('every dictionary carries exactly the same keys', () => {
    const [reference, ...rest] = languages.map(code => Object.keys(readJson(`public/data/translations/${code}.json`)));
    rest.forEach((keys, index) => {
      expect(keys.sort()).toEqual([...reference].sort());
      expect(languages[index + 1]).toBeTruthy();
    });
  });

  it('no value is empty', () => {
    languages.forEach(code => {
      const dictionary = readJson(`public/data/translations/${code}.json`);
      Object.entries(dictionary).forEach(([key, value]) => {
        expect(value, `${code}.${key}`).toBeTypeOf('string');
        expect(value.trim(), `${code}.${key}`).not.toBe('');
      });
    });
  });

  it('the fallback module matches the served dictionaries exactly', () => {
    // src/data/translations.js is generated from public/data/translations/ by
    // tools/sync-translations.mjs; if they drift, the first paint shows
    // different strings from the rest of the session.
    languages.forEach(code => {
      expect(FALLBACK_TRANSLATIONS[code]).toEqual(readJson(`public/data/translations/${code}.json`));
    });
  });
});

describe('normalise', () => {
  it('folds case and accents so Italian queries match', () => {
    expect(normalise('Femore')).toBe('femore');
    expect(normalise('Muscolo grande gluteo ')).toBe('muscolo grande gluteo');
    expect(normalise('cartilagine tiroidea')).toBe(normalise('Cartilagine Tiroidea'));
  });

  it('folds the Uzbek apostrophe, so the two ways of writing a word agree', () => {
    // The current official alphabet writes oʻ and gʻ with U+02BB.
    expect(normalise('oʻng')).toBe('ong');
    expect(normalise('bogʻich')).toBe('bogich');
    // People type a plain apostrophe, a curly quote or a backtick instead.
    expect(normalise("o'ng")).toBe('ong');
    expect(normalise('o‘ng')).toBe('ong');
    expect(normalise('o’ng')).toBe('ong');
    expect(normalise('o`ng')).toBe('ong');
  });

  it('folds the alphabet adopted in October 2026 onto the same form', () => {
    // Ö, Ğ, Ş and Ç replace Oʻ, Gʻ, Sh and Ch on 22 April 2027. Both
    // spellings have to find the same structure until then and after.
    expect(normalise('öğil')).toBe(normalise('oʻgʻil'));
    expect(normalise('şeker')).toBe(normalise('sheker'));
    expect(normalise('çay')).toBe(normalise('chay'));
  });

  it('keeps sh and ch distinct from s and c', () => {
    expect(normalise('shakar')).not.toBe(normalise('seker'));
    expect(normalise('choy')).not.toBe(normalise('coy'));
  });
});
