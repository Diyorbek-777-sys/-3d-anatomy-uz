# -*- coding: utf-8 -*-
"""Uzbek anatomical terms — skeletal system."""

# English ordinal -> Uzbek ordinal. The families below (phalanges, ribs,
# vertebrae, metacarpals, metatarsals) are generated from this one table, so
# they cannot drift apart from each other.
ORDINALS = {
    "First": "Birinchi",
    "Second": "Ikkinchi",
    "Third": "Uchinchi",
    "Fourth": "Toʻrtinchi",
    "Fifth": "Beshinchi",
    "Sixth": "Oʻltinchi",
    "Seventh": "Ettinchi",
    "Eighth": "Sakkizinchi",
    "Ninth": "Toʻqqizinchi",
    "Tenth": "Oʻninchi",
    "Eleventh": "Oʻn birinchi",
    "Twelfth": "Oʻn ikkinchi",
}

TERMS = {
    # --- skull ---
    "Anterior cells of ethmoid bone": "Etmoid suyagining olding hujayralari",
    "Middle cells of ethmoid bone": "Etmoid suyagining oʻrta hujayralari",
    "Posterior cells of ethmoid bone": "Etmoid suyagining orqa hujayralari",
    "Ethmoid bone": "Toʻr suyagi",
    "Frontal bone": "Peshona suyagi",
    "Occipital bone": "Ensa suyagi",
    "Parietal bone": "Tepa suyagi",
    "Temporal bone": "Chakka suyagi",
    "Sphenoid bone": "Panjara suyagi",
    "Nasal bone": "Burun suyagi",
    "Lacrimal bone": "Yosh suyagi",
    "Zygomatic bone": "Yonoq suyagi",
    "Palatine bone": "Tomoq suyagi",
    "Mandible": "Pastki jagʻ",
    "Maxilla": "Yuqori jagʻ",
    "Vomer": "Toʻsiq suyagi (vomer)",
    "Inferior nasal concha bone": "Pastki burun toʻgʻonagi",
    "Nasal septal cartilage": "Burun toʻsiq togʻayi",
    "Lateral process of nasal septal cartilage": "Burun toʻsiq togʻayining tashqi oʻrchoqi",
    "Major alar cartilage": "Katta qanot togʻay",
    "Arytenoid cartilage": "Aritenoid togʻay",
    "Corniculate cartilage": "Mundosimon togʻay",
    "Cricoid cartilage": "Uzuk shaklli togʻay",
    "Thyroid cartilage": "Qalqon togʻay",
    "Hyoid bone": "Til osti suyagi",
    "Sinus of frontal bone": "Peshona suyagining sinusi",
    "Sinus of sphenoid bone": "Panjara suyagining sinusi",

    # --- auditory ossicles ---
    "Malleus": "Bolgʻa",
    "Incus": "Nakovalnya",
    "Stapes": "Taychoq",

    # --- spine ---
    "Atlas (C1)": "Atlas (C1)",
    "Axis (C2)": "Axis (C2)",
    "Sacrum": "Dumgʻaza suyagi",
    "Coccyx": "Quyruqcha suyagi",

    # --- ribs and sternum ---
    "Body of sternum": "Koʻkrak suyagining tanasi",
    "Manubrium of sternum": "Koʻkrak suyagining dastasi",
    "Xiphoid process": "Qaychiqsimon oʻrchoq",

    # --- shoulder, arm and pelvis ---
    "Clavicle": "Oʻmrov suyagi",
    "Scapula": "Kurinka",
    "Humerus": "Yelkak suyagi",
    "Ulna": "Yon suyagi",
    "Radius": "Nur suyagi",
    "Hip bone": "Chanoq suyagi",

    # --- leg ---
    "Femur": "Son suyagi",
    "Patella": "Tizza",
    "Tibia": "Bigor suyagi",
    "Fibula": "Peruz suyagi",
    "Talus": "Talon suyagi",
    "Calcaneus": "Tovon suyagi",
    "Navicular bone": "Qayiq suyagi",
    "Cuboid bone": "Kub suyak",
    "Scaphoid bone": "Qayiqsimon suyak",
    "Lunate bone": "Yarim oy suyagi",
    "Trapezium bone": "Trapetsiya suyagi",
    "Trapezoid bone": "Trapetsiyasimon suyak",
    "Triquetrum bone": "Uchburchak suyak",
    "Pisiform bone": "Noʻgʻora suyak",
    "Capitate bone": "Boshcha suyak",
    "Hamate bone": "Ilgak suyagi",
    "Intermediate cuneiform bone": "Oʻrta pona suyagi",
    "Lateral cuneiform bone": "Tashqi pona suyagi",
    "Medial cuneiform bone": "Ichki pona suyagi",
    "Sesamoid bones of foot": "Oyoqning sesamoid suyaklari",
}

# --- phalanges -----------------------------------------------------------
for finger, ordinal in ORDINALS.items():
    if finger not in ("First", "Second", "Third", "Fourth", "Fifth"):
        continue
    uz = ORDINALS[finger]
    for position, part in (("Distal", "masof"), ("Middle", "oʻrta"), ("Proximal", "yaqin")):
        TERMS[f"{position} phalanx of {finger.lower()} finger of foot"] = \
            f"Oyoqning {uz} barmogʻining {part} phalangasi"
        TERMS[f"{position} phalanx of {finger.lower()} finger of hand"] = \
            f"Qoʻlning {uz} barmogʻining {part} phalangasi"

# --- ribs ----------------------------------------------------------------
for finger, uz in ORDINALS.items():
    TERMS[f"{finger} rib"] = f"{uz} qovurgʻa"
    if finger == "Twelfth":
        continue
    TERMS[f"Costal cartilage of {finger.lower()} rib"] = f"{uz} qovurgʻa qovurgʻa togʻayi"

# --- vertebrae -----------------------------------------------------------
for number in range(1, 8):
    TERMS[f"Vertebra C{number}"] = f"Boʻyin umurtqasi C{number}"
for number in range(1, 13):
    TERMS[f"Vertebra T{number}"] = f"Koʻkrak umurtqasi T{number}"
for number in range(1, 6):
    TERMS[f"Vertebra L{number}"] = f"Bel umurtqasi L{number}"

# --- metacarpals and metatarsals ----------------------------------------
for finger, uz in ORDINALS.items():
    if finger not in ("First", "Second", "Third", "Fourth", "Fifth"):
        continue
    TERMS[f"{finger} metacarpal bone"] = f"Qoʻlning {uz} metakarpal suyagi"
    TERMS[f"{finger} metatarsal bone"] = f"Oyoqning {uz} metatarsal suyagi"

# --- teeth ---------------------------------------------------------------
for side, uz in (("Upper", "Yuqori"), ("Lower", "Pastki")):
    TERMS[f"{side} canine"] = f"{uz} kurak tish"
    TERMS[f"{side} first molar tooth"] = f"{uz} birinchi katta tish"
    TERMS[f"{side} second molar tooth"] = f"{uz} ikkinchi katta tish"
    TERMS[f"{side} first premolar"] = f"{uz} birinchi oldindan kichik tish"
    TERMS[f"{side} second premolar"] = f"{uz} ikkinchi oldindan kichik tish"
    TERMS[f"{side} lateral incisor"] = f"{uz} tashqi kesirchi tish"
    TERMS[f"{side} medial incisor"] = f"{uz} ichki kesirchi tish"
