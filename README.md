# Paths to Odamyrus

A Morville Studios Games browser dungeon crawl and path building card adventure inspired by tabletop RPGs and deck builders. Built with strict TypeScript, Vite, DOM and CSS.

Canonical public route: [morvillestudios.com/games/paths-to-odamyrus](https://odamyrus.morvillestudios.com/).

## Current game

Choose Fighter, Wizard or Rogue, explore one of three missions, build a combat deck, and face a boss at the end of each mission. The game includes villages, shrines, equipment, creature encounters, and a **How to Play** guide. English, Traditional Chinese, Simplified Chinese, Japanese and Korean are available.

Runs can be resumed from a browser autosave or managed in four manual save slots. Updates are announced in the game; players choose when to reload. The current release is a web application. Native packaging and live Cloudflare deployment verification remain planned work.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

After catalog changes, run `npm run docs:sync`. After media changes, follow the raw asset workflow in [AGENTS.md](AGENTS.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

- [AGENTS.md](AGENTS.md): contributor rules and verification commands.
- [GAME_DESIGN.md](docs/GAME_DESIGN.md): player experience and gameplay rules.
- [MECHANICS_AND_DATA.md](docs/MECHANICS_AND_DATA.md): exact mechanics, formulas and timing.
- [CATALOGS.md](docs/CATALOGS.md): generated class, monster, adventure, shop and card data.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): runtime structure, state boundaries and deployment.
- [BRANDING_AND_SEO.md](docs/BRANDING_AND_SEO.md): identity, route, metadata and caching.
- [ROADMAP.md](docs/ROADMAP.md): implemented capabilities and remaining work.
- [DISCREPANCIES.md](docs/DISCREPANCIES.md): historical reconciliations and open decisions.
