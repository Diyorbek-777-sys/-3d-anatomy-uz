# Uzbek anatomy data source

This directory contains the editable source behind the Uzbek anatomical names,
search synonyms, definitions, and body-region tags served from `public/data/`.
It is kept in the repository so the generated banks can be reviewed and
reproduced; the generated JSON is what the browser loads.

## Rebuild

Run from the repository root with Python 3:

```bash
python3 tools/terms/merge.py
python3 tools/terms/make_synonyms.py
python3 tools/terms/make_definitions.py
python3 tools/terms/make_regions.py
node tools/verify-translations.mjs
```

`merge.py` merges the per-system `TERMS` maps and applies `fixes.py`;
`make_synonyms.py` validates that each synonym key can reach a real model
structure; `make_definitions.py` composes definitions from the authored
vocabulary in `definitions.py`; and `make_regions.py` assigns each base name to
one body-region group. All generators derive their repository paths from their
own location and do not require Blender or network access.

The displayed Uzbek follows the spelling currently in force: `oʻ` and `gʻ`
use U+02BB, and the 2026-reform letters are not used in display text. Search
normalisation accepts both the current spelling and the announced reform
spellings. The data is keyed by the stable English names in `systems.json`;
those names and the GLB models are not rewritten.

The term source is newly authored; definitions are derivative translations of
the upstream English definitions. Distribution remains subject to the
repository's `CC BY-NC-SA 4.0` licensing and attribution in `LICENSE`/`NOTICE`.
