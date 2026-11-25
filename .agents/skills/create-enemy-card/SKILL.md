---
name: create-enemy-card
description: Create or revise a Paths to Odamyrus Enemy Card or boss card, including its complete combat behavior, catalog entry, artwork, and presentation. Use when a user asks to add or redesign an Enemy Card; ask for missing design decisions before implementation.
---

# Create an Enemy Card

Turn the user's enemy concept into a fully specified, playable Enemy Card. Read [references/enemy-card-brief.md](references/enemy-card-brief.md) for the required intake fields and the shared card layout. Read it before making any Enemy Card data or art changes.

## Confirm the design first

Collect every required design decision in the brief. For each action, obtain its full effect and timing. Ask concise, grouped questions for every missing or ambiguous decision and wait for the user's answers before implementing that decision. Show existing rules or nearby Enemy Cards as **suggestions**, clearly labeled as suggestions. Do not silently choose stats, rarity, rewards, action effects, targeting, durations, art direction, or boss behavior. A user may explicitly authorize "use the standard rules" for a field; record that choice and calculate the value from the current canonical rule. If the user says "you decide," propose a complete card specification and ask them to approve it before implementation.

Use a compact specification with the card face fields and each action in turn order. Ask a follow-up if an answer conflicts with another answer or with an existing rule. Explain the conflict and the gameplay consequence; obtain a decision before changing a rule. Do not turn the Enemy Card implementation into an unrequested general balance or engine redesign.

## Implement the approved specification

1. Read the current contracts in `src/core/types.ts`, the Enemy Card entries in `data/enemies.json`, the catalog adapter and scenario construction in `src/data/enemies.ts`, and the relevant mechanics in `docs/MECHANICS_AND_DATA.md`. The JSON file holds individual Enemy Card entries; the TypeScript module imports it and computes supply and scenario composition. Check both before editing.
2. Give the Enemy Card a unique `templateId` and collector number. Add its type to `EnemyTemplateId`; add only approved fields to its JSON entry. Reuse existing intent/effect fields where they match the approved behavior. If a new effect is needed, implement it in the focused combat module with deterministic state transitions and precise timing. Check every affected card zone and conservation rule.
3. Preserve the shared card presentation. Use `fullEnemyCardHtml` for full-size Enemy Cards and the existing mini-card presentation for piles. Add no bespoke enemy frame unless the user explicitly approves a design-system change. Place original art in `assets/raw/cards/enemies/`, map the image through the existing art lookup, then run `npm run art:optimize` and `npm run art:check` when art changes. If the user has not supplied or approved an art source or brief, ask before creating artwork. If they explicitly defer art, label the result as a draft card with an outstanding art requirement.
4. Add focused tests for new behavior and edge cases, including every action in its cycle, hit/miss timing, modifiers, summons or revival, and deck conservation where applicable. Check full and mini card rendering, inspection, and combat intent text for fit and accuracy. Update player-facing localization for new text and rules.
5. Run `npm run docs:sync` after catalog edits. Update `docs/MECHANICS_AND_DATA.md` only for new or changed formulas, timing, or invariants, and `docs/GAME_DESIGN.md` only for changed player-facing flow or card layout. Then run `npm test`, `npm run docs:check`, `npm run i18n:check`, `npm run seo:check`, and `npm run build`. Report failures and any unresolved design question.

Keep the generated `docs/CATALOGS.md` as generated output, not a hand-edited design document. Do not copy an Enemy Card's numeric profile into `AGENTS.md` or another competing rules file.
