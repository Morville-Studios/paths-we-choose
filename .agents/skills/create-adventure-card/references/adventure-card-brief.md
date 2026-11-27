# Adventure Card design brief

Collect these decisions in prose or a compact form. Each field is complete when the user specifies it, accepts a labeled suggestion, or explicitly adopts an existing rule. Silence is not approval.

```text
Identity: card name, unique cardCode, terrain, location/event category,
          card-face wording, flavor text
Level: printed level and its purpose (encounter budget or location level)
Behavior: encounter, Village, Shrine, undiscovered terrain, Start Tile,
          or explicitly described new effect; trigger and resolution timing
Supply: stage(s), copies in each stage deck, replacement or addition to
        existing composition, and expected deck total
Special rules: target, formula, duration, repeat-visit behavior,
               Paths Card interaction, enemy eligibility, and card-zone result
Art: subject, landmarks, atmosphere, palette, composition, reference/source,
     dedicated/reused/deferred image and approved path
Exceptions: departures from map, encounter, deck, or card layout rules
```

Do not infer an encounter from a dangerous name or a Shrine from religious art. Confirm the event flags and what happens if more than one applies. An undiscovered terrain may draw a separate Paths Card; the Adventure Card request does not authorize creating that Paths Card without its own rules.

## Catalog and presentation checks

`data/adventure.json` stores card definitions. `src/data/stages.ts` adapts them and owns stage compositions plus the separate Start Tile. `AdventureCard` in `src/core/types.ts` describes runtime instances, which carry a generated instance ID and the printed `cardNumber`. `src/core/deck.ts` builds and reshuffles the physical Adventure Deck. Verify how approved copy counts affect each relevant stage and its conservation invariant.

`src/ui/adventureCard.ts` owns the shared compact card face. Its 5:7 frame shows the name, level badge when applicable, full-art illustration, and terrain/type/set ribbon; inspect views may add rule details. `src/ui/terrainPresentation.ts` owns terrain labels, icons, set codes, and frame classes. `src/ui/cardArt.ts` resolves the published image; some current paths are selected by broad terrain/event rules. For new art, record a deliberate cardCode or terrain/event-to-image association and verify it in the rendered card.

Exact deck counts, encounter budgets, and timing belong to `docs/MECHANICS_AND_DATA.md` and data. The generated `docs/CATALOGS.md` is refreshed by `npm run docs:sync`.
