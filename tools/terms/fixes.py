# -*- coding: utf-8 -*-
"""Corrections applied to the authored Uzbek terms before they are written out.

Two kinds of fix live here:

  * CORRECTIONS — terms that were wrong or clumsy, replaced wholesale.
  * normalise() — a tidying pass over the generated phrases: a modifier in
    the middle of a phrase must not start with a capital, and a phrase must
    not repeat the same word twice.
"""

import re

CORRECTIONS = {
    # --- names that were wrong ---
    "Anconeus muscle": "Anconeus mushki",
    "Cauda equina": "Nerv dumi (cauda equina)",
    "Coccygeus muscle": "Chuqur dumgʻaza mushki",
    "Humerus": "Yelka suyagi",
    "Pectineus muscle": "Tishli mushk",
    "Pineal gland": "Konus shaklli bezi",
    "Habenula": "Habenula",
    "Supinator": "Supinator mushki",
    "Cuneus": "Kuneus (uchburchak)",
    "Mylohyoid muscle": "Til osti-hoid mushki",
    "Geniohyoid muscle": "Til oldi-hoid mushki",
    "Long posterior ciliary arteries": "Kipning uzun orqa arteriyalari",
    "Cystic node": "Safra xurichi tuguni",

    # --- muscles of the arm and thigh ---
    "Long head of biceps brachii": "Yelkaning ikki boshli mushkining uzun boshligʻi",
    "Long head of triceps brachii": "Yelkaning uch boshli mushkining uzun boshligʻi",
    "Lateral head of triceps brachii": "Yelkaning uch boshli mushkining tashqi boshligʻi",
    "Medial head of triceps brachii": "Yelkaning uch boshli mushkining ichki boshligʻi",
    "Brachioradialis muscle": "Yelka-nur mushki",
    "Bicipitoradial bursa": "Ikki boshli-nur mushkining sumkasi",
    "Clavicular head of pectoralis major muscle": "Koʻkrakning katta mushkining oʻmrov qismi",

    # --- nodes and vessels ---
    "Medial external iliac nodes": "Ichki tashqi yonchak tugunlari",
    "Lateral geniculate body": "Tashqi genikulyat tanasi",
    "Medial geniculate body": "Ichki genikulyat tanasi",
}

# Words that keep their capital because they are a code, not a word.
CODE = {
    'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii',
    'bi', 'bii', 'biii', 'biv', 'bv', 'bvi', 'bvii', 'bviii', 'bix', 'bx',
    'm1', 'm2', 'm3', 'h'
}

# Proper names that keep their capital.
PROPER = {'Axilles', 'Atlas', 'Axis', 'Femur'}


def _is_code(word):
    core = word.strip('()[],."“”')
    if not core:
        return True
    if any(character.isdigit() for character in core):
        return True
    if core.isupper() and len(core) > 1:
        return True
    return core.lower() in CODE


def normalise(value):
    """Tidy a generated phrase."""
    words = value.split()

    # A modifier in the middle of a phrase is written in lower case.
    fixed = []
    for index, word in enumerate(words):
        prefix = re.match(r'^\(*', word).group(0)
        core = word[len(prefix):]
        if index == 0 or _is_code(word) or core in PROPER:
            fixed.append(word)
            continue
        if core[:1].isupper() and core[:1].isascii():
            core = core[:1].lower() + core[1:]
        fixed.append(prefix + core)

    # The same word twice in a row is a slip in the template.
    collapsed = []
    for word in fixed:
        if collapsed and collapsed[-1] == word:
            continue
        collapsed.append(word)

    return ' '.join(collapsed)


def apply(terms):
    """Return the terms with the corrections and the tidying pass applied."""
    result = {}
    for key, value in terms.items():
        value = CORRECTIONS.get(key, value)
        result[key] = normalise(value)
    return result
