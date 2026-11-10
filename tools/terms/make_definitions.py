#!/usr/bin/env python3
"""Write public/data/definitions.uz.json.

Every structure that has an English definition gets an Uzbek one, composed
from the structure's Uzbek name and from what it is. The sentences are
written by tools/terms/definitions.py; this script only runs it and writes
the result out in the same shape as the English file.
"""
import importlib.util, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'public/data/definitions.uz.json'

spec = importlib.util.spec_from_file_location('definitions', SRC / 'definitions.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terms = json.loads((ROOT / 'public/data/terms.uz.json').read_text(encoding='utf-8'))
english = json.loads((ROOT / 'public/data/definitions.json').read_text(encoding='utf-8'))

out = {}
for base, text in english.items():
    name = terms.get(base, base)
    sentence = module.describe(base, name)
    out[base] = sentence

bad = [base for base, value in out.items() if not value.strip()]
if bad:
    print('empty definitions:', bad, file=sys.stderr)
    sys.exit(1)

cyrillic = [base for base, value in out.items() if re.search(r'[Ѐ-ӿ]', value)]
if cyrillic:
    print('cyrillic leakage:', cyrillic, file=sys.stderr)
    sys.exit(1)

OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
print(f'wrote {OUT} with {len(out)} definitions')
