---
name: create-stage-and-biome
description: Create or revise a Paths to Odamyrus mission stage or biome, coordinating Adventure Cards, Enemy Cards, boss, decks, progression, art, and tests. Use for new stages, terrain bands, or major stage redesigns; clarify scope and rules before implementation.
---

# Create a Stage and Biome

Read [references/stage-brief.md](references/stage-brief.md) before editing. A stage is a playable progression unit; a biome is a terrain identity and may span several stages. Confirm whether the request is a new stage, a new biome, a change to an existing one, or a concept proposal.

## Confirm the design

Ask grouped questions for missing stage identity, turn length, terrain mix, Adventure Deck composition, enemy eligibility and level bands, boss, Treasure availability, start locations, completion rewards, and art. Offer current stages as labeled examples. When the user delegates a choice, propose a coherent specification before implementing it. Resolve conflicts with stage continuation, physical supply, map generation, and save compatibility. Use `create-adventure-card`, `create-enemy-card`, `create-item-card`, `create-paths-card`, or `create-card-art` for new content in those families; do not invent their mechanics from a stage theme.

## Implement the approved stage or biome

1. Read `src/data/stages.ts`, `data/adventure.json`, `src/data/enemies.ts`, `data/enemies.json`, `src/core/deck.ts`, `src/core/engine.ts`, `src/ui/terrainPresentation.ts`, and the stage rules in `docs/MECHANICS_AND_DATA.md`. Current stage names, compositions, starting village/shrine selection, boss selection, continuation, and victory handling contain explicit Stage 1–3 branches. Trace and extend all relevant routes; a new catalog row alone is insufficient.
2. Preserve the Adventure Deck's approved total and board/deck/discard conservation. Check the enemy supply partition, encounter terrain eligibility and level budget, boss spawning, Treasure level partition, and Paths interactions. Define what happens when an encounter cannot fill its budget or a reward has no eligible physical card.
3. Add or update terrain labels, icons, set codes, visual frame, art associations, guide/inspection views, mission selection or continuation text, and localization. Keep shared card presentation and the 5:7 physical format. Use original art under `assets/raw/` and the existing optimization workflow.
4. Test seeded deck composition, start layout, movement and event sequence, boss approach and victory, transition to the next stage, resource/card carryover, save/load compatibility where affected, and rendered content. Run `npm run docs:sync` after catalog changes; update `docs/MECHANICS_AND_DATA.md` for rules and `docs/GAME_DESIGN.md` for player flow. Update `docs/ROADMAP.md` if stage status changes, then run the checks in `AGENTS.md` and relevant media checks.

Do not duplicate exact stage tables in this skill; data and canonical docs own them.
