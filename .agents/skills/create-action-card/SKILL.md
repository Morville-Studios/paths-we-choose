---
name: create-action-card
description: Create or revise a Paths to Odamyrus Action Card, including effects, deck availability, art, shared card presentation, and tests. Use for attacks, defenses, skills, enchantments, and upgrades; clarify missing design decisions before implementation.
---

# Create an Action Card

Read [references/action-card-brief.md](references/action-card-brief.md) before editing a card. It lists the decisions to collect and the shared card layout.

## Confirm the design

Get the card's identity, class access, source deck, AP cost, targets, every effect, resolution order, and art direction. Ask grouped follow-up questions for missing or ambiguous choices, and wait for answers. Label examples from existing cards as suggestions. Never silently choose numbers, scaling, target rules, trigger timing, durations, zone movement, or artwork. If the user says "use the standard rule," identify the current rule and record that choice. If the user says "you decide," propose a complete specification and get their approval before implementation.

For every effect, confirm its amount or formula, target, trigger, timing, duration, stacking, hit/miss behavior, and card-zone consequences. Resolve conflicts with current rules before coding. Present the proposed card face and ordered effect sequence, separating confirmed details from suggestions awaiting approval.

## Implement the approved card

1. Read `src/core/types.ts`, `data/actionCards.json`, `src/data/actionCards.ts`, and the Action Card rules in `docs/MECHANICS_AND_DATA.md`. Card entries live in JSON; the TypeScript module adapts them and defines training pools. Check `data/classes.json` for starter-deck changes.
2. Use a unique ID and collector number. Put the card only in its approved starter, New Skills, Void upgrade, or other route. Preserve physical copy counts, save reconciliation, and upgrade replacement rules. Extend schema or combat code only when the approved effect needs it.
3. Implement effect math and resolution in focused core combat modules. Respect 3d6 hit checks, target choice, AP, scaling, draw/discard order, triggers, `inPlay`, and final card movement. Keep seeded randomness and immutable state. Update confirmation and inspection for new choices or previews. Match the stack and timing rules in `docs/MECHANICS_AND_DATA.md`.
4. Reuse `renderActionCardHtml` and its canonical effect text in hand, deck, training, confirmation, and inspection. Preserve the shared 5:7 frame. Ask whether this card gets dedicated art or reuses a named existing image (for example, an approved upgrade sharing its base card's art). Record the exact card ID → image path mapping; never rely on `src/ui/cardArt.ts` substring matches or its generic blade/shield fallback for a new card. For new art, put the original in `assets/raw/cards/actions/`, add its explicit lookup, then run `npm run art:optimize` and `npm run art:check`. Verify the resolved path and rendered image. If art is explicitly deferred, call the result a draft with an outstanding art requirement.
5. Test effect math, play legality, target and hit/miss behavior, resolution order, trigger interactions, acquisition, and card conservation where relevant. Verify live and reference-mode text, including zero-base scaling cards. Check full and mini cards and localization.
6. Run `npm run docs:sync` after catalog edits. Update `docs/MECHANICS_AND_DATA.md` for changed formulas or timing and `docs/GAME_DESIGN.md` for changed player-facing flow or layout. Run `npm test`, `npm run docs:check`, `npm run i18n:check`, `npm run seo:check`, and `npm run build`. Report failures and unresolved decisions.

Do not hand-edit generated `docs/CATALOGS.md` or duplicate card formulas in `AGENTS.md`.
