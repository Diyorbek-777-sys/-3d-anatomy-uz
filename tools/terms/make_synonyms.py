#!/usr/bin/env python3
"""Build public/data/synonyms.uz.json.

A synonym key is a fragment of an English structure name. The search index
attaches the Uzbek values to every structure whose normalised name contains
the key, so "biceps brachii" reaches "Long head of biceps brachii" and
"Oblique head of adductor hallucis" alike.

The keys are validated against public/data/systems.json with exactly the
normalisation src/utils/dataLoader.js uses, so a key that the search would
never reach is not written out.
"""
import importlib.util, json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'public/data/synonyms.uz.json'

APOSTROPHES = 'ʻʼ‘’«\'`´'


def normalise(text):
    """The same fold as src/utils/dataLoader.js."""
    text = text.replace('ş', 'sh').replace('ç', 'ch')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = ''.join(ch for ch in text if ch not in APOSTROPHES)
    return text.lower().strip()


systems = json.loads((ROOT / 'public/data/systems.json').read_text(encoding='utf-8'))
mesh_names = [mesh for meshes in systems.values() for mesh in meshes]


def base_name(mesh):
    return mesh[:-2] if mesh[-2:] in ('.l', '.r') else mesh


def squash(text):
    return re.sub(r'\s+', ' ', text).strip()


bases = sorted({base_name(mesh) for mesh in mesh_names})
normalised = {name: normalise(name) for name in bases}
words = {name: set(re.split(r'[^a-z0-9+]+', text)) for name, text in normalised.items()}


def reachable(key):
    """True when the search would attach this key to at least one structure."""
    bucket = key.split(' ')[0]
    if not bucket:
        return False
    for name, text in normalised.items():
        if key in text and bucket in words[name]:
            return True
    return False


def load(path, attribute):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, attribute)


authored = load(SRC / 'synonyms.py', 'AUTHORED')

# The names that the term modules carry but the models do not: muscles the
# models split into heads, organs the models name differently. They are
# synonyms, not structures.
orphans = {}
TERM_MODULES = ('skeletal', 'muscular', 'joints', 'lymphatic', 'cardiovascular', 'nervous', 'visceral')
for name in TERM_MODULES:
    path = SRC / f'{name}.py'
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for key, value in module.TERMS.items():
        orphans.setdefault(key, value)

squashed_structures = {squash(name) for name in bases}


def clean_key(key):
    """A key is a fragment of a structure name, so it carries no brackets."""
    return key.strip().strip('()').strip().lower()


synonyms = {}
for key, values in authored.items():
    synonyms[clean_key(key)] = list(values)

for key, value in orphans.items():
    if squash(key) in squashed_structures:
        continue
    candidate = clean_key(key)
    if not candidate:
        continue
    if candidate in synonyms:
        if value not in synonyms[candidate]:
            synonyms[candidate].append(value)
    else:
        synonyms[candidate] = [value]

# Keys that the search can never reach are dropped rather than shipped.
reachable_synonyms = {}
dead = []
for key, values in synonyms.items():
    if reachable(key):
        reachable_synonyms[key] = values
    else:
        dead.append(key)

if dead:
    print('unreachable synonym keys dropped:', file=sys.stderr)
    for key in sorted(dead):
        print('   ', repr(key), file=sys.stderr)

OUT.write_text(
    json.dumps(reachable_synonyms, ensure_ascii=False, indent=1, sort_keys=True) + '\n',
    encoding='utf-8'
)
print(f'wrote {OUT} with {len(reachable_synonyms)} keys')
covered = sum(1 for name in bases if any(key in normalised[name] for key in reachable_synonyms))
print(f'{covered}/{len(bases)} structures carry at least one synonym')
