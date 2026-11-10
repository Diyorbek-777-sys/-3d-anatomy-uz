#!/usr/bin/env python3
"""Merge the authored Uzbek term files into public/data/terms.uz.json.

The term bank is keyed by the Z-Anatomy name of a structure, exactly as it
appears in public/data/systems.json and in the GLB files, so it cannot drift
out of sync with the models. A key that no structure carries is not written
out: those names are search synonyms instead (public/data/synonyms.uz.json),
because a synonym is attached to every structure whose name contains it.
"""
import importlib.util, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/data/terms.uz.json'
SRC = pathlib.Path(__file__).resolve().parent

CYRILLIC = re.compile(r'[Ѐ-ӿ]')

# One module per system of the body.
TERM_MODULES = ('skeletal', 'muscular', 'joints', 'lymphatic', 'cardiovascular', 'nervous', 'visceral')


def base_name(mesh):
    return mesh[:-2] if mesh[-2:] in ('.l', '.r') else mesh


def load_modules():
    merged = {}
    for name in TERM_MODULES:
        path = SRC / f'{name}.py'
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        terms = getattr(module, 'TERMS', None)
        if terms is None:
            continue
        for key, value in terms.items():
            if key in merged and merged[key] != value:
                print(f'CONFLICT {key!r}: {merged[key]!r} vs {value!r}', file=sys.stderr)
                sys.exit(1)
            merged[key] = value
    return merged


merged = load_modules()

# The corrections and the tidying pass live in their own module.
sys.path.insert(0, str(SRC))
import fixes  # noqa: E402

merged = fixes.apply(merged)

systems = json.loads((ROOT / 'public/data/systems.json').read_text(encoding='utf-8'))
bases = {base_name(mesh) for meshes in systems.values() for mesh in meshes}

# A key that differs from a structure name only by stray whitespace is the
# same structure; the name the models use wins.
def squash(text):
    return re.sub(r'\s+', ' ', text).strip()


by_squashed = {}
for name in bases:
    by_squashed.setdefault(squash(name), name)

canonical = {}
for key, value in merged.items():
    name = by_squashed.get(squash(key))
    if name and name not in canonical:
        canonical[name] = value

missing = sorted(bases - set(canonical))
if missing:
    print(f'MISSING {len(missing)} structure(s):', file=sys.stderr)
    for name in missing:
        print('   ', repr(name), file=sys.stderr)
    sys.exit(1)

orphans = sorted(set(merged) - bases)
used = {k: canonical[k] for k in canonical}

bad = [(k, v) for k, v in used.items() if CYRILLIC.search(v)]
if bad:
    print('CYRILLIC LEAKAGE:', bad, file=sys.stderr)
    sys.exit(1)

OUT.write_text(json.dumps(used, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
print(f'wrote {OUT} with {len(used)} terms')
print(f'{len(orphans)} authored name(s) are not structures of the models (synonyms instead):')
for name in orphans:
    print('   ', repr(name))
