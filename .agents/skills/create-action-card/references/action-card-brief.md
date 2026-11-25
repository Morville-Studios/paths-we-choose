# Action card brief and layout contract

Use this checklist to collect decisions. Current rules and runtime contracts remain in `docs/MECHANICS_AND_DATA.md` and `src/core/types.ts`. A field is complete when the user specifies it, accepts a labeled suggestion, or explicitly chooses an established rule. Record **none** for an intentionally excluded effect. Ask grouped follow-up questions and wait; silence is not approval.

For a vague request, offer this form and accept answers in prose:

```text
Identity: name; concept/role; class or shared access; attack/defense/skill/
          enchantment; level; AP cost; collector number (or accept suggestion)
Supply:   starter, New Skills, Void upgrade, or other; copy count/availability;
          if upgrade, exact base card and replacement route
Target:   self, one enemy, or all enemies; how each target is chosen
Effects:  EACH effect in resolution order: amount/formula; scaling and rounding;
          damage type/range; hit check; hit/miss behavior; duration and stacking
Costs:    AP; discard or other costs; exact/optional count; selection rules
Triggers: draw, AP gain, enter hand, on hit, or other; timing and limit
Zones:    where the card and any affected cards go during/after resolution
Art/lore: dedicated or reuse named existing image; exact intended image path;
          subject, scene, palette/mood, references/source image, flavor text;
          generate/adapt/defer art
Exceptions: departures from current combat, training, upgrade or stack rules;
            or "none"
```

## Decisions to resolve before implementation

- **Identity and availability:** final name, class access, card type, level, AP cost, unique ID/collector number, and starter versus trainable versus Void upgrade. If shared between classes, say which classes and how each obtains it. If trainable, confirm its class training pool. If an upgrade, name the base card and confirm the Shrine route.
- **Damage:** base amount, scaling stat or derived stat, divisor, multiplier, rounding, gear contribution, physical versus magical mitigation, melee versus ranged interaction, ACC modifier, and number of hit rolls. Decide whether every target gets an independent roll. A zero base with scaling needs accurate reference text.
- **Defense and utility:** Block formula, EVA or other modifiers, duration, stacking, healing or resource effects, and whether any part depends on a hit.
- **Targeting and costs:** one enemy/all enemies/self; target changes during confirmation; required or optional discards, count limits, eligible cards, and whether the played card can be selected. Clarify what happens when a cost cannot be paid.
- **Draws, AP and triggers:** number of cards drawn, AP gained, enter-hand or AP-gain effects, trigger frequency, interactions with other copies, and whether draws reshuffle discard. Specify order relative to attacks and other printed effects.
- **Persistence and upgrades:** whether the card goes to combat discard or stays in `inPlay`; when it leaves play; how its physical copy moves through New Skills, master deck, Void, and Shrine replacement. Define an upgrade's exact changed effects, not only a `+` name.
- **Wording and art:** short card-face rules, or approval for the agent to draft from the fully specified mechanics; flavor text; dedicated art versus reuse of a specifically named image; appearance, composition, mood, and source art. Ask which visual details are essential. Do not infer an image from the card name or ID.

If an effect is unsupported by `ActionCardDef` or the combat transition, clarify its rule before extending the schema or engine. Do not assume mechanics from the card's name or flavor text.

## Shared action-card layout

Full-size cards share the **5:7** aspect ratio (2.5 × 3.5 inches in print). `src/ui/actionCard.ts` owns the action card face and effect wording; `src/ui/styles/03-tcg-cards.css` owns its styling. See `docs/GAME_DESIGN.md`, section 5.5, for player-facing design rules. Do not create one-off dimensions or duplicate markup.

| Area | Required content and behavior |
| --- | --- |
| Full-bleed art | The explicitly chosen illustration fills the card behind the shared frame. Keep its focal point clear of header and rules text. |
| Header, first row | `ACTION`, type label, level, AP cost, and `VOID UPGRADE` tag when applicable. Existing attack frames are crimson; defense, skill, and enchantment use the azure frame. A new frame is a design-system change requiring clarification. |
| Header, second row | Full card name, legible at hand, training, inspection, and mini sizes. |
| Bottom rules box | Exact effect text, with live numbers during play and accurate formula/reference text during inspection. |
| Footer | Collector number and class tag. Existing shared Fighter/Rogue cards show `COMMON`; this is an access label, not Enemy Card rarity. |
| Mini card | Same art, header, and compact effect text; footer omitted. Check effect readability. |
| Confirmation and detail | Card, target(s), AP cost, hit odds, discard choices, and formula/effect explanation as applicable. No resource is spent before confirmation. |

Action Cards currently have no Enemy Card-style rarity field or symbol. If the user requests Action Card rarity, clarify whether it is a supply rule, visual label, or both before changing the design.

`src/ui/cardArt.ts` currently uses substring checks on `cardId` and falls back to generic blade/shield art. Some upgrades intentionally share an image with their base card. For every new card, record the approved `cardId` → `assets/raw/cards/actions/<file>` → `/cards/actions/<file>` association, add an unambiguous lookup, and verify the rendered card uses that file. Do not count a generic fallback as a successful art assignment.

## Proposal format

Before implementation, show card identity, access path, printed cost, effect order, formulas, target and timing, card wording, art direction, and exceptions. Mark suggested fields still awaiting approval and ask only for remaining decisions.
