// The languages the atlas ships in.
//
// Uzbek is the primary language; English and Italian are kept because the
// atlas is derived from an English and an Italian dataset and because shared
// links in those languages should keep working.
//
// The registry is the single place that knows which languages exist: the
// dictionaries under public/data/translations/, the anatomical term banks
// under public/data/, and the search synonyms are all looked up by these
// codes, so adding a language is a matter of adding a line here plus the data
// files.

export const DEFAULT_LANG = 'uz';

export const LANGUAGES = [
  { code: 'uz', short: 'UZ', label: 'Oʻzbekcha' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'it', short: 'IT', label: 'Italiano' }
];

export const LANGUAGE_CODES = LANGUAGES.map(language => language.code);

export function languageMeta(code) {
  return LANGUAGES.find(language => language.code === code) || null;
}
