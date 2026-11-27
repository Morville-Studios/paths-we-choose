# Item Card design brief

Collect decisions in prose or this compact form. A field is complete when the user specifies it, accepts a labeled suggestion, or explicitly adopts the current rule. Use “none” for intentionally absent effects; silence is not approval.

```text
Identity: name, stable ID, level, category, collector number, short rules text, lore
Supply: copies or accepted existing supply rule; scenario availability;
        starting gear, shop, treasure, or other acquisition route
Economy: buy price, sell value or accepted pricing rule, restrictions
Equipment: slot, melee/ranged classification when relevant, each stat/gear
           bonus and its effect on derived stats and existing abilities
Consumable: exact effect, target, use timing, whether usable in combat,
            resource cost, stacking, and destination after use
Special effect: trigger, amount/formula, rounding, duration, limits,
                interactions with equip/unequip, death, and save/load
Art: dedicated image or specific approved reuse; visual brief and image path
Exceptions: changes to existing shop, treasure, equipment, or card rules
```

`data/treasures.json` owns item entries; `ShopItemDef` in `src/core/types.ts` owns the runtime contract. `src/data/shopItems.ts` adapts the catalog and defines the current physical supply rule. `src/core/deck.ts` partitions items by scenario. `src/core/village.ts` handles purchases, equipment, and consumption; `src/core/stats.ts` calculates previews and derived effects. `src/ui/cardArt.ts` resolves art, and `renderTcgItemCard` presents the shared face.

Clarify whether an effect applies while equipped, while carried, on purchase, on use, or at another trigger. Check whether use is allowed in combat, whether the item is consumed or banished, and what happens when HP or another resource is already full. Do not describe an unsupported effect as implemented merely because its text appears in the catalog.
