---
name: audit-card-content
description: Audit Paths to Odamyrus card catalogs and their runtime, artwork, presentation, localization, and documentation links. Use for a cross-family consistency review or content release check; report concrete drift and fix it when requested.
---

# Audit Card Content

Audit the requested card family or all families if the user asks for a full content review. This is a verification workflow; report findings with exact card IDs, files, evidence, and severity. If the user also requests fixes, make the smallest corrections and rerun the affected checks. Do not invent card mechanics or art choices while reconciling drift.

## Check the complete path

1. Identify the canonical record in `data/*.json`, its adapter in `src/data/*.ts`, and its runtime contract in `src/core/types.ts`. Cover Action, Enemy, Adventure, Class, Paths, and Item Cards as applicable. Check unique stable IDs and collector numbers, required fields, valid references, stage/class eligibility, and physical copy counts or conservation.
2. Trace each card's actual route: acquisition or draw, effect resolution, discard/Void movement, inspection, and save/load when relevant. Compare printed wording, formulas, timing, and rewards with the implemented transition and `docs/MECHANICS_AND_DATA.md`. Distinguish missing behavior from a mere missing catalog row.
3. Resolve each card's actual image through `src/ui/cardArt.ts` and check that the intended published file exists with an original under `assets/raw/cards/`. Flag collisions, wrong-family art, generic fallback, or an image that does not identify the card. Check shared full and mini card presentation for clipped names or effects when rendering is available.
4. Check player-facing text and localization key parity, generated catalog drift, and referenced assets with `npm run docs:check`, `npm run i18n:check`, `npm run seo:check`, and `npm run art:check`. Run focused tests and `npm test`/`npm run build` when the audit scope or fixes warrant them; follow `AGENTS.md` verification requirements before finishing repository work.

Prioritize behavior mismatches, broken references and images, supply violations, misleading text, then cosmetic issues. For each finding give the expected result, actual result, reproduction or source evidence, and a concrete correction. State what was checked and what could not be verified. Keep generated `docs/CATALOGS.md` as output of `npm run docs:sync`, not a manually edited source.
