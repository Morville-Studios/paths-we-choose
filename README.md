# The Paths We Choose

A Morville Studios Games browser dungeon-crawl and path-building card adventure inspired by tabletop RPGs and deck-builders. Built with strict TypeScript, Vite, DOM and CSS. Capacitor packaging is planned; the current repository is a web application.

Public portfolio route: `https://morvillestudios.com/games/the-paths-we-choose/`.

## Run locally

```sh
npm install
npm run dev
npm test
npm run docs:sync   # regenerate tables after changing src/data
npm run docs:check  # verify generated catalogs
npm run seo:assets  # regenerate the 1200x630 social preview
npm run build      # catalog check, TypeScript check and Vite build
npm run preview
```

## Documentation

- [AGENTS.md](AGENTS.md): contributor rules and architectural invariants.
- [GAME_DESIGN.md](docs/GAME_DESIGN.md): player experience and gameplay rules.
- [MECHANICS_AND_DATA.md](docs/MECHANICS_AND_DATA.md): exact mechanics, formulas and ability timing.
- [CATALOGS.md](docs/CATALOGS.md): generated class, monster, boss, adventure, shop and combat-card data.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime structure, transitions, conservation and deployment.
- [BRANDING_AND_SEO.md](docs/BRANDING_AND_SEO.md): Morville Studios Games identity, canonical URL, portfolio handoff, metadata and caching.
- [ROADMAP.md](docs/ROADMAP.md): implemented capabilities and remaining work.
- [DISCREPANCIES.md](docs/DISCREPANCIES.md): reconciliation decisions and outstanding questions.

## Current game

Choose Fighter, Wizard or Rogue. All six Base Stats start at 1; a class adds +2 to its Primary stat and +1 to two Secondary stats. Before preparation upgrades, equipment or blessings, Fighter has 16 Max HP, Wizard 12 and Rogue 14. Each starts with 20 Gold, 4 SP and a 10-card combat deck.

Base-stat upgrades cost `(currentBase + 1)^2` SP. Spend them during Turn 0 preparation or at a Shrine; a Shrine can raise Base Stats only through Shrine Level + 1. Shrine arrival shows the stepped-on card, lore, and the same reusable player-info widget as the Map. Select a stat first: affordable choices reveal a confirmed Upgrade action, while unaffordable choices show missing SP. Leaving also requires confirmation. Arrival automatically grants one eligible random boon and replaces the previous blessing; map blessings expire after boss victory acknowledgement.

Explore a three-row offset-brick board with two forward choices and three lookahead tiles. Each mission has a 30-card Adventure Deck. Ordinary creatures come from a 76-card physical supply in the public Void: Common types have 6 copies, Uncommon types 4, and Rare types 3. Scenario setup pulls 100%, rounded 2/3, and rounded 1/3 of the creature types whose main terrains match its three terrain bands; unused copies stay in the Void. Scenario 1 builds a 45-card Monster Deck and Scenario 2 builds 37 cards; bosses are spawned separately. Treasure contains 42 cards: two copies of each of 21 shop items. Default creature rewards are `2^(level-1)` SP and twice that amount in Gold, unless explicitly overridden. Exact compositions and inscriptions are in the generated catalogs.

Combat draws five cards and uses `3 + floor(INT/5)` maximum AP, 2d6 attack checks, ACC versus EVA, snake-eyes misses and critical damage rounded down after multiplying by 1.5. Played actions remain on a resolving Stack until all costs, draws, AP gains and triggers finish, so a card cannot redraw itself. PEN on equipment bypasses the same amount of an enemy's natural DEF for physical hero attacks before Block; magical attacks use MDEF and do not gain PEN. Village training draws learnable cards from a visible, finite New Skills Deck, confirms purchases and destruction, and sends destroyed physical cards to the Void. Starter cards remain exclusive to the initial 8/2 deck and each non-starter class skill has two physical copies. A plain-language **How to Play** guide is available from the title screen and from the in-game HUD. The Turn 15 tile always resolves and is acknowledged before Grundy or the three Cult of Trolls bosses appear.

Cards use full-art illustrations at a 5:7 ratio. Right-click or long-press inspects rules and live stats. Keyboard and touch navigation are supported. Class selection and map navigation share the map soundtrack; combat has its own track.

Runs currently live in memory. Updates are announced in-app and reloading an active run requires confirmation because progress is not saved. The public build is branded for Morville Studios Games, carries crawlable game metadata, and resolves runtime assets correctly beneath its canonical `/games/the-paths-we-choose/` route. Cloudflare release verification, persistence and native packaging remain launch work; see architecture, branding and roadmap documentation.
