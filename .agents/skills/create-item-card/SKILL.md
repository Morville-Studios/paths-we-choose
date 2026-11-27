---
name: create-item-card
description: Create or revise a Paths to Odamyrus Item Card, including equipment or consumable effects, pricing, physical supply, art, presentation, and tests. Use when adding or redesigning an item; clarify missing mechanics and availability before implementation.
---

# Create an Item Card

Read [references/item-card-brief.md](references/item-card-brief.md) before editing. Item Cards are physical Treasure cards that can move through the Treasure Deck, Village stock, inventory, equipment slots, discard, and the Void.

## Confirm the design

Ask grouped questions for every missing or ambiguous field in the brief. Wait for answers before implementing the affected decision. Offer nearby items and established rules as labeled suggestions. Do not infer prices, bonuses, healing, use timing, copy counts, or artwork from an item's name. If the user delegates choices, propose a complete card specification and obtain approval before implementing it. Separate confirmed details from suggestions awaiting a decision.

## Implement the approved item

1. Read `src/core/types.ts` (`ShopItemDef`), `data/treasures.json`, `src/data/shopItems.ts`, `src/core/deck.ts`, `src/core/village.ts`, `src/core/stats.ts`, and the item rules in `docs/MECHANICS_AND_DATA.md`. Add a unique ID and collector number. Preserve the approved level, category, price, effects, and physical supply. Check scenario eligibility, exact-level Village stock, treasure rewards, starting gear, and item movement between zones.
2. Reuse existing stat, gear, or consumable effects when they match the specification. For a new effect, define the exact trigger and timing, implement it in a focused pure core transition, and update purchase, equip, use, preview, and save behavior as needed. Verify that displayed prices, sale value, derived stats, and HP changes match actual resolution.
3. Reuse `renderTcgItemCard` in `src/ui/render.ts` for shop, inventory, guide, pile, and inspection views. Preserve the shared card frame and readable card-face effect text. Confirm a dedicated image or named existing image; use the `create-card-art` workflow for new art. Associate the item ID with its image explicitly and verify the rendered path at full and mini sizes.
4. Test effect math and timing, item acquisition and use, shop eligibility and price, inventory/equipment transitions, physical supply conservation, and presentation where relevant. Sync localization for visible text. After catalog changes run `npm run docs:sync`; update only the canonical mechanics or UI document for changed rules or layout. Run the checks in `AGENTS.md` and media checks when art changes.

Keep card values in `data/treasures.json` and generated `docs/CATALOGS.md`, not in this skill or `AGENTS.md`.
