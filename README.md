# The Paths We Choose

A browser dungeon-crawl and path-building card game inspired by Slay the Spire and AD&D. Built with strict TypeScript, Vite, DOM and CSS. Capacitor packaging is planned; the current repository is a web application.

## Run locally

```sh
npm install
npm run dev
npm test
npm run docs:sync   # regenerate tables after changing src/data
npm run docs:check  # verify generated catalogs
npm run build      # catalog check, TypeScript check and Vite build
npm run preview
```

## Documentation

- [AGENTS.md](AGENTS.md): contributor rules and architectural invariants.
- [GAME_DESIGN.md](docs/GAME_DESIGN.md): player experience and gameplay rules.
- [MECHANICS_AND_DATA.md](docs/MECHANICS_AND_DATA.md): exact mechanics, formulas and ability timing.
- [CATALOGS.md](docs/CATALOGS.md): generated class, monster, boss, adventure, shop and combat-card data.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime structure, transitions, conservation and deployment.
- [ROADMAP.md](docs/ROADMAP.md): implemented capabilities and remaining work.
- [DISCREPANCIES.md](docs/DISCREPANCIES.md): reconciliation decisions and outstanding questions.

## Current game

Choose Fighter, Wizard or Rogue. All six Base Stats start at 1; a class adds +2 to its Primary stat and +1 to two Secondary stats. Before preparation upgrades, equipment or blessings, Fighter has 16 Max HP, Wizard 12 and Rogue 14. Each starts with 20 Gold, 4 SP and a 10-card combat deck.

Base-stat upgrades cost `(currentBase + 1)^2` SP. Spend them during Turn 0 preparation or at a Shrine. Shrine arrival automatically grants one eligible random boon, replacing the previous blessing; map blessings expire after boss victory acknowledgement.

Explore a three-row offset-brick board with two forward choices and three lookahead tiles. Each mission has a 30-card Adventure Deck; Stage 1 has a 38-card ordinary Monster Deck and bosses are spawned separately. A fourth deck, Treasure, contains 28 cards: two copies of each of 14 shop items. Default creature rewards are `2^(level-1)` SP and twice that amount in Gold, unless explicitly overridden. Exact compositions and inscribed rewards are in the generated catalogs. Encounter generation and treasure mechanics recycle their graveyards when a further draw needs an empty deck. Terrain/level restrictions remain strict; unavailable eligible supply stops safely. Spell/ability draw-until searches instead fizzle at the end of their current pass.

Combat draws five cards and uses `3 + floor(INT/5)` maximum AP, 2d6 attack checks, ACC versus EVA, snake-eyes misses and critical damage rounded down after multiplying by 1.5. Village visits offer Rest, Shop or Train. Turn 15 triggers Goblin Chieftain in The Goblin King or the three Cult of Trolls bosses in Stage 2.

Cards use full-art illustrations at a 5:7 ratio. Right-click or long-press inspects rules and live stats. Keyboard and touch navigation are supported. Class selection and map navigation share the map soundtrack; combat has its own track.

Runs currently live in memory. Updates are announced in-app and reloading an active run requires confirmation because progress is not saved. Cloudflare release verification, persistence and native packaging remain launch work; see architecture and roadmap.
