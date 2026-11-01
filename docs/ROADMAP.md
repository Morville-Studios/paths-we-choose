# Development Roadmap

This is a current implementation/status map, not a historical milestone archive. Exact content, prices, class stats and deck compositions belong to [CATALOGS.md](CATALOGS.md); mechanics belong to [MECHANICS_AND_DATA.md](MECHANICS_AND_DATA.md).

## Implemented

- Strict TypeScript/Vite web application with separated core, content catalogs, DOM/CSS UI and automated tests.
- Fighter, Wizard and Rogue; six Base Stats of 1; Primary +2 and two Secondary +1 class bonuses; Berzerk, Conserve and Steal passives.
- Effective starting HP: Fighter 16, Wizard 12, Rogue 14 before upgrades, gear or blessings; 10-card starter decks, 20 Gold and 4 preparation SP.
- Base-stat upgrades priced `(B+1)^2` at Turn 0 preparation and Shrines. One automatic eligible shrine boon, single active blessing, map expiry.
- Two missions with 30-card Adventure Decks: The Goblin King and Cult of Trolls, each with a Turn 15 boss encounter.
- Grasslands, Forest and Swamp map cards, undiscovered exploration rolls, treasure finds, three-row lookahead and deck recycling.
- Stage 1 ordinary Monster Deck of 38 cards; Goblin Chieftain and three-Troll bosses are separate. Creature MDEF, physical/magical damage, poison, DEF piercing, life drain, resurrection, Sprint and Skittish.
- 2d6 attacks, snake-eyes miss, Luck-adjusted critical threshold, critical damage floor(damage×1.5), five-card hands, INT-based AP and monster targeting carousel.
- Village Rest/Shop/Train, 14-item shop catalog, 28-card Treasure Deck, Charisma discounts, weapon/armor/accessory slots and consumables. Canonical item names are generated from SHOP_ITEM_CATALOG.
- Victory acknowledgement, reward breakdown, ordinary Flee and Stage 1→2 continuation.
- Raster card art/icons, inspection, keyboard/touch navigation, safe-area styling, combat logs and hero panels.
- Intro/map/battle looped soundtracks with mute/volume and autoplay unlock.
- Cloudflare static header configuration, release manifest and update notice with explicit player-controlled reload. Live deployment verification remains pending.
- Generated catalog documentation with drift checks as part of production builds. Test counts are deliberately not hard-coded; run npm test.

## Pending or incomplete

- Resolve remaining findings in [DISCREPANCIES.md](DISCREPANCIES.md), including any open gameplay choices.
- Persistent run saves and restore/migration behavior. Current runs are in memory and reload loses progress.
- Capacitor installation, Android/iOS projects and native packaging pipelines.
- Verify headers and cross-release update/rollback behavior on the actual Cloudflare deployment.
- Content-versioned media with long CDN caching, based on the Bocarena/Morville comparison. Current media uses conservative revalidation; this optimization is not yet implemented.
- Card dealing, sweeping, shuffling, movement, dice and combat sound effects/animation polish beyond existing UI transitions and background soundtracks.
- Additional biomes such as Ruins, Crypt and Mountain Pass. Cave/Underground currently exist as monster spawn tags, not map tile catalogs.
- Further stages/content and balancing. Blindness and crippled are represented and cleanseable status names; they do not yet have dedicated gameplay effects comparable to implemented poison.

- Treasure stocking now uses exact village-level equality; exploration uses a level cap. Both recycle during the mechanic. Add Level 3 treasure items to supply Level 3 village stores; their current stock is empty because no matching catalog entries exist.
