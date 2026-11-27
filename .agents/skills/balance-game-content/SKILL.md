---
name: balance-game-content
description: Analyze and tune Paths to Odamyrus card, enemy, encounter, item, reward, and stage balance using current rules and reproducible scenarios. Use for balance reviews or requested numerical adjustments; establish the design goal and measure effects before changing values.
---

# Balance Game Content

Treat balance as a comparison against a stated player experience, not an isolated number change. Read the relevant formulas and timing in `docs/MECHANICS_AND_DATA.md`, current catalog values in `data/*.json` and `src/data/*.ts`, and stage/player flow in `docs/GAME_DESIGN.md`. Use `docs/CATALOGS.md` as generated reference only.

## Define the target

Clarify what should change if the request does not identify it: class or card, stage and terrain, intended difficulty, player build, and the symptom (too strong, too weak, too frequent, too costly, or unclear). Ask only for decisions that materially change the tuning. If the user asks for a review, report findings without silently changing content. If the user authorizes tuning, select the smallest values or rules that address the stated goal and explain the expected effect.

## Compare and test

1. Establish a baseline from neighboring content and the actual rules: damage and Block after stats and mitigation, 3d6 hit odds, AP and draw economy, enemy intent cycles, encounter level budgets, rewards, shop affordability, Treasure supply, and physical copy frequency as relevant. Do not compare printed numbers that resolve at different times or target different zones as if they were equivalent.
2. Use deterministic seeds or focused tests to examine representative early, middle, and late encounters or acquisition points. Include at least one unfavorable and one favorable but valid player state where relevant. Note assumptions and distinguish observed outcomes from estimates.
3. For proposed changes, state the old and new value, why it helps, tradeoffs, and affected classes, decks, stages, or item routes. Check for exploits, dominant choices, dead cards, impossible encounters, and resource loops. Do not alter unrelated systems to make one card appear balanced.
4. When implementing approved tuning, edit only the canonical data or rule owner. Add meaningful tests for the changed behavior or balance boundary. Run `npm run docs:sync` after catalog changes, update the canonical mechanics or game-design document only if a rule changes, sync localization if player-facing text changes, then run the checks in `AGENTS.md`.

Finish with the specific balance conclusion, supporting measurements, remaining uncertainty, and any values changed. Do not present subjective preference as a proven formula.
