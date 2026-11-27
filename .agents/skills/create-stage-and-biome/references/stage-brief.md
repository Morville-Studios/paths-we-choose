# Stage and biome design brief

Gather these decisions in prose or a compact specification. A field is complete when the user specifies it, accepts a labeled suggestion, or explicitly adopts a current rule. Silence is not approval.

```text
Scope: new stage, new biome, redesign, or concept only
Identity: stage number/name, narrative goal, biome names and visual identity
Progression: entry and completion conditions, turn limit, continuation route,
             what cards/resources carry over, and any final victory state
Map: terrain types, printed levels, Adventure Card types and exact copies,
     starting village/shrine, undiscovered terrain and Paths behavior
Encounters: enemy types, spawn terrains, scenario band, level budget,
            boss identity, timing, number of boss cards, and rewards
Economy: available Treasure levels, shop and training levels,
         expected Gold/SP sources and sinks
Art: required Adventure, Enemy, boss, item, and stage identity images
Exceptions: changes to current deck supply, map, encounter, or save rules
```

Distinguish a biome label from an Adventure Card terrain, an Enemy Card spawn tag, and a stage number. A new terrain can require all three, plus `src/ui/terrainPresentation.ts` and image mapping. A stage must also work through the existing start, boss, victory, continuation, and saved-run paths. Do not assume a future stage follows the existing turn limit or deck size unless the user adopts that rule.

Current stage data is in `src/data/stages.ts`; physical Adventure Card definitions are in `data/adventure.json`; enemy templates and eligibility are in `data/enemies.json` and `src/data/enemies.ts`. Runtime transitions are in `src/core/engine.ts` and deck construction in `src/core/deck.ts`. Exact formulas and invariants are in `docs/MECHANICS_AND_DATA.md` and `docs/ARCHITECTURE.md`.
