---
name: create-class-card
description: Create or revise a Paths to Odamyrus playable Class Card, including starting stats, passive, gear, Action Deck, art, and selection presentation. Use for a new or redesigned hero class; clarify missing design decisions before implementation.
---

# Create a Class Card

Read [references/class-card-brief.md](references/class-card-brief.md) before editing. A Class Card defines a playable hero, so confirm its full starting build and passive effects first.

## Confirm the design

Ask grouped questions for every missing or ambiguous decision in the brief. Wait for the user's answers before implementing those decisions. Show existing rules as labeled suggestions, never as silent defaults. If the user delegates choices, propose a complete specification and obtain approval before implementing it. Record an explicit “none” for omitted effects. Resolve conflicts between passive wording, Action Cards, gear, and existing combat timing before coding.

Show the proposed card identity, visible class details, starting stats and equipment, Action Deck with copy counts, passive trigger and effect, art direction, and any rule exceptions. If the class needs new Action Cards, use `create-action-card` to define their full effects.

## Implement the approved class

1. Read `src/core/types.ts`, `data/classes.json`, `src/data/classes.ts`, `src/data/actionCards.ts`, `src/core/deck.ts`, `src/core/engine.ts`, and the current class and stat rules in `docs/MECHANICS_AND_DATA.md`. Add the class to the catalog and `ClassId`; wire class-specific routes that enumerate playable classes, including selection order, labels, training pools, New Skills, starting equipment, passives, and unselected Class Cards in the Void. A JSON entry alone does not make a class playable.
2. Implement the approved passive in the appropriate pure core transition with exact trigger, duration, limits, and stack behavior. Keep seeded randomness, immutable state, and card conservation. Reuse existing Action Cards and gear only when approved.
3. Use the existing class selection and Class Card presentation in `src/ui/screens/classSelect.ts`, `src/ui/render.ts`, and matching style partials. Preserve the shared physical card design where Class Cards appear. The selection carousel is a separate UI layout; if a 5:7 card face requires changing it, clarify that design decision. Keep names, role, passive, stats, deck summary, and art readable in selection, guide, and Void views.
4. Confirm a specific hero image or complete art brief. Map the class ID explicitly in `src/ui/cardArt.ts`; put original art in `assets/raw/cards/adventurers/` and publish optimized art to `public/cards/adventurers/`. Verify the rendered image association. If art is explicitly deferred, describe the class as a draft with art outstanding.
5. Test class selection, starting stats and derived vitals, gear, exact starter deck copies, training availability, passive triggers and edge cases, Void/guide views, and save/load where new fields require it. Sync localization after changing visible text. Run `npm run docs:sync` after catalog edits, update only the canonical rule or UI document for changed behavior, then run the checks required by `AGENTS.md` and media checks when art changes.

Keep runtime contracts in code and catalog numbers in generated `docs/CATALOGS.md`; do not copy them into this skill or `AGENTS.md`.
