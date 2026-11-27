---
name: create-paths-card
description: Create or revise a Paths to Odamyrus Paths Card, including exploration choices, checks, rewards, hazards, deck copies, art, presentation, and tests. Use for cards drawn by undiscovered terrain; clarify each outcome before implementation.
---

# Create a Paths Card

Read [references/paths-card-brief.md](references/paths-card-brief.md) before editing. Paths Cards are drawn when an undiscovered Adventure terrain is explored; they are a separate card family from Adventure Cards.

## Confirm the design

Get the exact card identity, choices, checks, outcomes, deck copies, and art. Ask grouped questions for missing or ambiguous details and wait for the user's answers. Show existing Paths Cards as labeled suggestions, not assumed defaults. If the user delegates choices, propose a full specification and obtain approval before implementation. For each choice or roll, confirm its threshold, modifiers, success and failure results, costs, timing, and card-zone movement. Resolve conflicts with current exploration, combat, Treasure, and deck rules before coding.

## Implement the approved Paths Card

1. Read `PathCard` and `PathCardTemplateId` in `src/core/types.ts`, `data/paths.json`, `src/data/paths.ts`, `src/core/engine.ts`, and the Paths rules in `docs/MECHANICS_AND_DATA.md`. Add a unique template ID and collector number. Set the approved physical copy count and preserve Paths Deck and discard conservation.
2. Implement every approved branch of the new event in focused, immutable core transitions using the seeded RNG. Wire the draw/dispatch, confirmation and resolution, combat or Treasure handoff, log, and final card movement. A JSON entry alone will not create event behavior: current templates have explicit handling in `src/core/engine.ts` and `src/ui/modals/eventModals.ts`.
3. Reuse `renderTcgPathCard` and the existing inspection and guide presentation. Keep the card-face challenge text concise and consistent with actual resolution. Confirm a dedicated image or named reuse and use `create-card-art` for new art; explicitly associate the template ID with the image and verify the rendered path at full and mini sizes.
4. Test all choices, pass/fail and empty-deck outcomes, damage or reward timing, repeated draws, conservation, and UI text. Sync localization for visible text. Run `npm run docs:sync` after catalog edits; update the canonical mechanics or UI document for new rules or flow, then run the checks in `AGENTS.md` and media checks when art changes.

Keep exact card quantities and formulas in data and canonical rules docs, not in this skill.
