---
name: create-adventure-card
description: Create or revise a Paths to Odamyrus Adventure Card, including terrain or location behavior, stage deck supply, art, shared card presentation, and tests. Use for encounter, village, shrine, undiscovered, or start cards; clarify missing design decisions before implementation.
---

# Create an Adventure Card

Read [references/adventure-card-brief.md](references/adventure-card-brief.md) before editing. An Adventure Card is a physical map card; confirm what it does when drawn, placed, entered, and discarded.

## Confirm the design

Ask grouped questions for missing or ambiguous card identity, terrain, level, event flags, stage supply, effects, art, and special interactions. Wait for the user's answers. Existing cards and stage compositions are suggestions, not defaults. If the user delegates choices, propose a complete card specification and obtain approval before implementation. Clarify whether the request is for a new Adventure Card, a Paths Card drawn from an undiscovered terrain, or both.

Present the proposed card face, exact encounter/location behavior, deck copies by stage, and art association before coding. For special effects, confirm trigger, timing, target, formula, duration, repeated visits, and card-zone movement. Resolve conflicts with map, encounter, Village, Shrine, and deck rules.

## Implement the approved card

1. Read `src/core/types.ts`, `data/adventure.json`, `src/data/stages.ts`, `src/core/deck.ts`, the relevant transitions in `src/core/engine.ts`, and the Adventure Card rules in `docs/MECHANICS_AND_DATA.md`. Add a unique `cardCode` to the JSON catalog and approved copy counts to each affected stage composition. The separate Start Tile is created in `src/data/stages.ts`; treat changes to it explicitly. Preserve Adventure Deck conservation and seeded draws.
2. Use existing `hasHostile`, `hasVillage`, `hasShrine`, and `isUndiscovered` behavior when it matches the approved card. Extend types and focused core transitions only for a defined new effect. For a new terrain or location type, check terrain presentation, map placement, encounter eligibility, Village/Shrine behavior, deck inspection, and saved-run compatibility.
3. Reuse `renderAdventureCardHtml` in `src/ui/adventureCard.ts` and the terrain mapping in `src/ui/terrainPresentation.ts`. Preserve the shared 5:7 physical frame and its name, level when present, full-art window, and terrain/type/set ribbon across map, pile, event, and inspection views. Avoid a one-off card frame.
4. Confirm dedicated art or an explicitly named existing image. Map the card or approved terrain/event combination in `src/ui/cardArt.ts`; do not let a broad fallback silently select its art. Put original art in `assets/raw/cards/adventure/`, optimize to `public/cards/adventure/`, and verify the rendered path. If art is explicitly deferred, label the card as a draft with art outstanding.
5. Test stage copy counts and deck total, draw/reshuffle/conservation, card placement and event resolution, inspect views, image mapping, and localization as relevant. Run `npm run docs:sync` after catalog edits. Update `docs/MECHANICS_AND_DATA.md` for changed rules and `docs/GAME_DESIGN.md` for changed player flow or layout, then run the checks required by `AGENTS.md` and media checks when art changes.

Keep catalog values in data and generated `docs/CATALOGS.md`; do not duplicate them in this skill or `AGENTS.md`.
