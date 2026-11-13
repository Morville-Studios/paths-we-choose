# Development Roadmap

This is a current implementation/status map, not a historical milestone archive. Exact content, prices, class stats and deck compositions belong to [CATALOGS.md](CATALOGS.md); mechanics belong to [MECHANICS_AND_DATA.md](MECHANICS_AND_DATA.md).

## Implemented

- Strict TypeScript/Vite web application with separated core, content catalogs, DOM/CSS UI and automated tests.
- Fighter, Wizard and Rogue; six Base Stats (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `VIT`) of 1; Primary +2 and two Secondary +1 class bonuses; Berzerk, Conserve and Steal passives.
- Effective starting HP: Fighter 16, Wizard 14, Rogue 14 before upgrades, gear or blessings; 10-card starter decks, class starting gear (Fighter: Iron Sword + Chainmail; Rogue: Dagger + Leather Gear; Wizard: Apprentice Staff + Robe), 20 Gold and 10 preparation SP.
- Base-stat upgrades priced `B * 10` at Turn 0 preparation and Shrines. One automatic eligible shrine boon, single active blessing, map expiry.
- Three missions with 30-card Adventure Decks: The Goblin King, Cult of Trolls, and Tomb of the Fallen King, each with a Turn 15 boss encounter.
- Grasslands, Forest, Swamp, Cave and Underground map cards, undiscovered exploration rolls, treasure finds, three-row lookahead and deck recycling.
- An 85-card ordinary creature supply is partitioned from the public Void by scenario level, creature rarity, and main-terrain bands. Scenario 1 builds 45 cards; Scenario 2 builds 37; Scenario 3 builds 30. Grundy, the three-Troll bosses, and Fallen King are separate. Creature MDEF, physical/magical damage, poison, DEF piercing, life drain, resurrection, Sprint, Skittish, seeded random buffs, independent multi-hit intents, hit-gated debuffs and direct retaliation are implemented.
- MACG-3D6™ attack checks with success ranges, Diabolic misses on totals 3 and 18, no critical-hit multiplier, five-card hands, INT-based AP and monster targeting carousel.
- Village Rest/Shop/Train, 21-item shop catalog, 42-card Treasure Deck, Charisma discounts, weapon/armor/accessory slots, consumables and physical PEN. Canonical item names are generated from SHOP_ITEM_CATALOG.
- Victory acknowledgement, reward breakdown, ordinary Flee and Stage 1→2→3 continuation.
- Raster card art/icons, inspection, keyboard/touch navigation, safe-area styling, combat logs and hero panels.
- Intro/map/battle looped soundtracks with mute/volume and autoplay unlock.
- Cloudflare static header configuration, release manifest and update notice with explicit player-controlled reload. Live deployment verification remains pending.
- Generated catalog documentation with drift checks as part of production builds. Test counts are deliberately not hard-coded; run npm test.
- 5-slot browser `localStorage` persistence (`src/state/saveStorage.ts`): Slot 1 automatically saves every action, event, and resolved dice outcome (including Game Over) to prevent save scumming, while Slots 2–5 support manual save, overwrite, load, and delete.

## Pending or incomplete

- Resolve remaining findings in [DISCREPANCIES.md](DISCREPANCIES.md), including any open gameplay choices.
- Capacitor installation, Android/iOS projects and native packaging pipelines.
- Verify headers and cross-release update/rollback behavior on the actual Cloudflare deployment.
- Content-versioned media with long CDN caching, based on the Bocarena/Morville comparison. Current media uses conservative revalidation; this optimization is not yet implemented.
- Card dealing, sweeping, shuffling, movement, dice and combat sound effects/animation polish beyond existing UI transitions and background soundtracks.
- Additional biomes such as Ruins, Crypt and Mountain Pass. Cave and Underground map tiles exist in Scenario 3; future scenarios may add more.
- Further stages/content and balancing. Blindness and crippled are represented and cleanseable status names; they do not yet have dedicated gameplay effects comparable to implemented poison.
- Level 3 and 4 treasure items and village supplies are implemented; future expansions may add Level 5+ equipment and consumables.
