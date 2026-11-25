# Enemy Card brief and card contract

Use this as an intake checklist, not as a substitute for `src/core/types.ts`, `data/enemies.json`, or the current game rules. Ask for missing choices in a grouped message. A field is complete only when the user provides it, accepts a clearly identified suggestion, or explicitly requests the established standard rule for it. Record an explicit **none** where an optional effect is intentionally absent.

For a vague request, offer this compact form. Let the user answer in prose, and follow up only on fields still unclear:

```text
Identity: name; ordinary or boss; concept/role; level; type; rarity;
          main terrain; all spawn terrains; collector number (or accept suggestion)
Profile:  HP; ATK (if any); DEF; MDEF; ACC; EVA; starting Block;
          Gold and SP rewards (or "use standard formula")
Passive:  each name, trigger, target, amount, duration, stacking, timing;
          or "none"
Actions:  ordered, repeating list. For EACH action: name; target; damage type
          and amount; number of hits; Block/heal; hit/miss effects; other
          effects with amounts, durations, stacking and timing
Art/lore:  enemy appearance; scene; palette/mood; references or source image;
          flavor text; generate/adapt/defer art
Exceptions: any departure from existing rules, including summons, rewards,
            or scenario composition; or "none"
```

## Required Enemy Card brief

### Identity and placement

- Working and final name; one-sentence concept and intended combat role.
- Ordinary Enemy Card or boss. For a boss: which scenario, whether it joins other bosses, and how it enters combat. Bosses are separate from the ordinary physical supply.
- Level; enemy type/subtype; rarity for an ordinary Enemy Card; main terrain and every eligible spawn terrain. Confirm whether current scenario composition should include it and whether any existing composition should change.
- Unique collector number and `templateId`. The agent can suggest unused identifiers, but the user must accept them.
- Flavor text and artwork direction: subject, silhouette, environment, mood, palette, distinctive features, and any supplied image or reference. Ask which details are essential. Confirm whether to generate new art, adapt supplied art, or defer art.

### Printed combat profile

- Max HP, DEF, MDEF, ACC, and EVA, including explicit zero values. Action patterns normally define enemy damage; a separate printed ATK requires clarification as a rule exception. Ask whether it has starting Block; do not infer either from action damage.
- Gold and SP defeat rewards, or explicit permission to apply the current default reward formula. Ask whether any nonstandard reward or death effect applies.
- Every passive or reactive ability, or explicit **none**. For each: trigger, condition, target, amount, duration, stacking/refresh rule, resolution timing, and what happens if its target or supply is unavailable.

### Complete action cycle

Get an ordered list of **every** action. For each action, require:

1. Name and action number in the repeating cycle; whether the cycle starts at action 1 and advances after a skipped or interrupted turn.
2. Target and target-selection rule; whether it is an attack, support action, or both.
3. Physical and/or magical damage, number of separate hits, Block, healing, and any other numeric effect. Record explicit zero or **none** where applicable.
4. Hit-check rule for each damaging hit; effects that require a hit versus effects that occur even on a miss. Use the current 3d6 system unless the user explicitly requests a rule change.
5. Any DEF bypass, poison, drain, debuff, buff, summon, revival, or retaliation: magnitude, target, duration, trigger, timing, stacking, expiration, and miss behavior.
6. Any random choice: eligible outcomes and seeded selection rule. Any deck interaction: source/destination zones, eligible card types, exhaustion behavior, and physical-copy conservation.
7. The exact short rule text to show on the card, or approval for the agent to draft wording from the fully specified mechanic. Check that the short text and detailed inspection describe the same effect.

If a requested effect has no matching runtime field or mechanic, clarify its exact rule before adding a new field or code path. Do not use a similar existing effect as an approximation without approval.

## Shared card contract

The game's full-size cards use a **5:7** aspect ratio (2.5 × 3.5 inches in print). Enemy Cards share the existing full-art frame in `src/ui/screens/combatView.ts` (`fullEnemyCardHtml`) and the layout rules in `src/ui/styles/03-tcg-cards.css`. See `docs/GAME_DESIGN.md`, section 5.5, for player-facing presentation rules. Do not create independent markup or dimensions for a new Enemy Card.

| Area | Required content and behavior |
| --- | --- |
| Full-bleed art | Unique illustration fills the card. Keep key facial and silhouette details clear of overlays and text. |
| Header, first row | Level; `BOSS` only for bosses; enemy subtype; spawn terrain icons. Ordinary cards do not print a redundant `ENEMY` label. |
| Header, second row | Full enemy name and collector number; check long names at game and inspection sizes. |
| Artwork overlay | Gold and SP rewards at upper left. Ordinary cards show the New Paths rarity symbol at lower right: bronze Common, silver Uncommon, gold Rare. Boss cards use their boss treatment. |
| Bottom rules box | Passive/ability text, then the ordered action pattern with damage and other effects. It must remain readable; use short text that faithfully represents the mechanic. Flavor text belongs in inspection, not on this face. |
| Bottom footer | Printed Max HP and positive DEF, MDEF, ACC, EVA (and ATK if deliberately used). Zero stats are omitted visually but remain explicit in the brief and data. |
| Combat dock outside card | Live HP and Block, plus the next action intent. Live temporary stats must match the combat engine. |
| Mini pile card | Art, name, level, subtype, spawn icons, and pile multiplier. It intentionally omits the full rules box, rewards, stats, and rarity symbol. |
| Detail modal | Complete action and passive explanations, exact stats, spawn profile, rewards, rarity/supply, collector number, and flavor text. |

For accessibility and fit, inspect the card in battle, guide/compendium, pile modal, and detail modal, including narrow screens and a long localized name. Keep existing click, right-click, and long-press inspection behavior.

## How to present a proposal

Before implementation, summarize the chosen identity, printed stats, rewards, passives, action cycle, art direction, and any rule exception in a compact table or numbered list. Separate **confirmed** fields from **suggested, awaiting approval** fields. Ask only the unanswered questions; never treat silence as approval.
