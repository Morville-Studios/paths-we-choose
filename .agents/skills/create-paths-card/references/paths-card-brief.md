# Paths Card design brief

Collect decisions in prose or this compact form. A field is complete when the user specifies it, accepts a labeled suggestion, or explicitly adopts a current rule. Silence is not approval.

```text
Identity: name, template ID, collector number, visible challenge wording, lore
Supply: exact copies in the Paths Deck; any terrain or stage restriction
Trigger: when drawn, any reveal or confirmation step, and repeated-visit behavior
Choices: every player option, requirement, cost, and whether abandon/decline exists
Checks: stat or dice, modifier, threshold, rounding, deterministic RNG source
Outcomes: success, failure, alternate result, resource changes, damage,
          encounter or Treasure handoff, and empty or ineligible supply
Zones: when this Paths Card enters discard or another zone;
       destinations of drawn Enemy, Treasure, or Adventure cards
Art: dedicated image or specific reuse, scene, subject, palette, image path
Exceptions: changes to exploration, combat, Treasure, or physical deck rules
```

`data/paths.json` owns the entry and `src/data/paths.ts` adapts it and builds the deck. `PathCardTemplateId` in `src/core/types.ts` lists current templates. The event state and resolution branches currently live in `src/core/engine.ts`; the options and result screens live in `src/ui/modals/eventModals.ts`. `src/ui/render.ts` owns `renderTcgPathCard`, while `src/ui/cardArt.ts` resolves art.

Define precisely whether a failed check starts combat, loses a reward, causes direct damage, or combines effects. For any draw-until-eligible reward, use the current bounded-draw and reshuffle rules from `docs/MECHANICS_AND_DATA.md`; do not infer a new search rule from flavor text.
