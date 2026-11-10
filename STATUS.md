# Loyiha holati / Project status

updated: 2026-11-09
branch: `arena/7e743f66-3d-anatomy-uz`

## Holat (UZ)

**Faol ishlab chiqilmoqda.** Loyiha oʻzbek tilidagi professional 3D inson anatomiyasi atlasiga aylantirilmoqda; inglizcha va italyancha variantlar ham saqlangan.

- 7 ta GLB model va 2 827 ta mesh saqlangan; model identifikatorlari inglizcha `za_name` qiymatlari boʻlib qoladi.
- 1 643 ta noyob anatomik tuzilma uchun oʻzbekcha atama; 1 277 ta oʻzbekcha taʼrif; qidiruv sinonimlari va tana sohasi belgilari mavjud.
- 3 til × 122 UI tarjima kaliti. 9 ta tana sohasi belgisi; 164 noaniq nom “Boshqa” deb belgilanadi.
- Testlar: 39 ta; lint: xatosiz (mavjud `no-console` ogohlantirishlari bor); tarjima va model verifikatori ishlaydi.
- Tavsiya etilgan keyingi ish: brauzer/WebGL muhitida qoʻlda vizual tekshiruv va hudud tasniflarini mutaxassis bilan koʻrib chiqish.

## Status (EN)

**Active development.** The repository is being transformed into a professional Uzbek-language 3D human anatomy atlas; English and Italian remain available.

- All 7 GLB models and 2,827 meshes are preserved. English `za_name` values remain the stable identity keys.
- Uzbek names cover 1,643 unique structures; the data includes 1,277 Uzbek definitions, search synonyms, and body-region tags.
- UI dictionaries: 3 languages × 122 keys. Nine body-region labels; 164 ambiguous names use the general “Other” label.
- Tests: 39; lint has zero errors (existing `no-console` warnings remain); translation/model verifier passes.
- Suggested follow-up: manual visual QA in a browser/WebGL environment and expert review of the heuristic body-region assignments.

## Loyiha holati / Project state

- Default language / Asosiy til: Uzbek (`uz`)
- Other languages / Boshqa tillar: English (`en`), Italian (`it`)
- Term tooling / Atama generatorlari: `tools/terms/`
- Validation / Tekshiruv: `npm test`, `npm run lint`, `node tools/verify-translations.mjs`
