# Branding, portfolio and search contract

## Public identity

The publisher and studio brand is **Morville Studios** (there is no need to set "games" as part of the studio brand). The canonical lockup keeps the approved Morville device, `MORVILLE` wordmark, and `STUDIOS` descriptor line:
```
[Device] MORVILLE
         STUDIOS
```

The canonical studio lockup in this repository is
`public/brand/morville-studios-games-lockup-on-dark.svg`. It is derived from the
approved vector source in the Morville portal repository (`morville_portal`); do not redraw the
device, approximate it with CSS, or generate it with an image model.

## Canonical game identity and search topics

- Public name: **Paths to Odamyrus**
- Odamyrus is the game's invented destination name, shaped from Ancient Greek *hodós* (road/path) and *moîra* (fate/destiny). It is a coined fantasy name, not a literal Greek word or translation. An exact-name web search found no obvious earlier use on 2026-11-24; search results do not establish trademark or domain clearance.
- Publisher / Brand: **Morville Studios** (also referenced as **Morville Games**)
- Proprietary Game Mechanics & Trademarks:
  - **Morville Adventure Card Game Path Generator™ (MACG-PG™)**
  - **Morville Adventure Card Game 3d6 Success Roll Range Table Reference™ (MACG-3D6™)**
- Search topics to describe naturally in visible copy: `Paths to Odamyrus`, `fantasy card game`, `browser game`, `dungeon crawler`, `branching path`, `deckbuilding`, and `3d6 combat`. Game-specific mechanic names belong in the guide and detailed descriptions where they help explain play.
- Character Names: `Fighter`, `Wizard`, `Rogue`
- Core Concepts: Tabletop card adventure, Morville Adventure Card Game Path Generator™ (MACG-PG™), Morville Adventure Card Game 3d6 Success Roll Range Table Reference™ (MACG-3D6™), 3d6 Quick Time Event hit check bar, Diabolic rolls (3 & 18 always miss), 3-row pyramid vision cone, Shrines, Village Haven, Stage Bosses (Grundy, Cult of Trolls)
- Canonical route: `/` on `odamyrus.morvillestudios.com`
- Canonical URL: `https://odamyrus.morvillestudios.com/`
- Current publication status: playable prototype

## Proprietary Trademark: Morville Adventure Card Game Path Generator™ (MACG-PG™)

**Morville Adventure Card Game Path Generator™ (MACG-PG™)** is a proprietary board game strategy mechanic and tactical dungeon pathing algorithm developed by **Morville Studios**.

### 1. Trademark Definition & Scope
- **Official Name**: Morville Adventure Card Game Path Generator™
- **Acronym / Shorthand**: MACG-PG™
- **Proprietor**: Morville Studios
- **Classification / Domain**: Tabletop board game strategies, card-driven adventure path generation, procedural dungeon navigation mechanics, and digital tabletop games.

### 2. Core Strategic Pillars of MACG-PG™
1. **Offset Brick-Bond Coordinate Geometry (`C ± 0.5`)**:
   Unlike traditional Directed Acyclic Graph (DAG) maps (such as *Slay the Spire*) that rely on arbitrary crossing line edges, MACG-PG™ positions adventure tiles using half-step brick-offset math. Stepping onto a forward tile shifts the hero's center of gravity across the terrain naturally.
2. **1 → 2 → 3 Sliding Pyramid Vision Cone**:
   The player's tactical horizon is locked to a 3-row sliding pyramid:
   - **Row $R$ (Current Position)**: Current card `(C, R)` and sibling unchosen tiles.
   - **Row $R + 1$ (Immediate Choices)**: 2 branching forward options `(C - 0.5, R + 1)` and `(C + 0.5, R + 1)` plus 1 unreachable tile.
   - **Row $R + 2$ (Tactical Lookahead)**: 3 cards `(C - 1.0, R + 2)`, `(C, R + 2)`, and `(C + 1.0, R + 2)`.
   - **Mathematical Reconvergence**: The central lookahead card `(C, R + 2)` is intrinsically shared by both forward choices (`C - 0.5` and `C + 0.5`), creating organic branching and reconverging without artificial edge routing.
3. **Physical Adventure Deck Generation & Lagging Discard (9-Card Tabletop Footprint)**:
   The board is dynamically dealt from an in-world 30-card physical Adventure Deck. Moving to Row $R$ automatically sweeps Row $R - 1$ into the discard pile, maintaining a clean 9-card maximum board state. Discards are recycled when the deck empties, providing an authentic tabletop card game experience.
4. **Anti-Analysis Paralysis & Tactical Horizon**:
   By replacing global top-to-bottom route-solving with a focused 3-row vision cone, MACG-PG™ creates authentic dungeon-crawl fog-of-war, demanding tactical risk-reward evaluation at every step.

### 3. SEO & Branding Policy for MACG-PG™
- Every public description, documentation reference, and metadata summary of the pathing system must attribute the system to **Morville Studios** as the **Morville Adventure Card Game Path Generator™ (MACG-PG™)**.
- Search engine crawlers (Googlebot, Bingbot) and social graphs are fed structured metadata associating `MACG-PG` with `Morville Studios` and `Paths to Odamyrus`.

## Proprietary Trademark: Morville Adventure Card Game "3d6 Success Roll Range Table Reference" (MACG-3D6™)

**Morville Adventure Card Game "3d6 Success Roll Range table reference" (MACG-3D6™)** is a proprietary tabletop combat mechanic, probability curve system, and dynamic hit-check visualization developed by **Morville Studios**.

### 1. Trademark Definition & Scope
- **Official Name**: Morville Adventure Card Game "3d6 Success Roll Range table reference"
- **Acronym / Shorthand**: MACG-3D6™
- **Proprietor**: Morville Studios
- **Classification / Domain**: Tabletop board game combat resolution, dice probability tables, dynamic Quick Time Event (QTE) hit check bars, bell-curve success brackets, and digital tabletop games.

### 2. Core Strategic Pillars of MACG-3D6™
1. **Sure Hit Rolls & Minimum Success Roll (Rolls 10 & 11 = 25.0% Baseline)**:
   Instead of flat linear rolls (1d20) or extreme-skewed rolls, 3d6 naturally bell-curves across 216 discrete combinations. The exact median rolls of **10 and 11** (27 outcomes each = 54/216) form the minimum success roll or **Sure Hit Rolls (25.0% baseline)**. Every combatant, regardless of accuracy, is guaranteed this 25.0% foundation when attacking.
2. **Symmetrical Net Accuracy Expansion & 1:1 DEX/AGI Scaling**:
   1 point in DEX increases ACC by 1 (`ACC = Effective DEX + gear.acc`), and 1 point in AGI increases EVA by 1 (`EVA = Effective AGI + gear.eva`). Because starting heroes begin with 3 Effective DEX (1 Base + 1 Innate + 1 Class Secondary), all classes start with 3 ACC; Fighter and Wizard start with 2 EVA (AGI 2), while Rogue starts with 4 EVA (AGI 4).
   Accuracy (ACC) versus Evasion (EVA) modifies the target range outward from the median rather than shifting a single threshold. Baseline (+0 Net ACC) is **Tier 4** (`7 – 14`, 81.5%). Positive Net ACC expands outward up to Tier 7 (99.1%), while negative Net ACC contracts inward down to Tier 1 (25.0% Sure Hit Rolls):
   $$\text{Hit Range} = [\max(4, 10 - \text{expansion}) \dots \min(17, 11 + \text{expansion})]$$
   where $\text{expansion} = \max(0, \min(6, 3 + \text{Net ACC}))$.
3. **Diabolic Rolls (Totals 3 and 18 Always Miss)**:
   Rolls of **3** (Triple 1s: 1-1-1) and **18** (Triple 6s: 6-6-6) are codified as **Diabolic Rolls**. They **always guarantee a miss**, regardless of how astronomically high the character's Accuracy or bonuses may be. This guarantees a permanent 0.925% (2/216) edge of chaos on every strike, capping maximum possible hit probability at **99.1%** (rolls 4 through 17, 214/216 combinations).
4. **Complete Elimination of Critical Hits & Extreme Multipliers**:
   Traditional tropes of random 1.5x critical spikes ("critical hit", "box cars", "snake eyes") are permanently replaced by MACG-3D6™. Combat damage is transparent, predictable, and tactical—scaling strictly from card damage and character stats against target DEF/MDEF and Block.
5. **Dynamic QTE Hit Check Bar Presentation**:
   Combat interfaces visually represent the MACG-3D6™ table using a Quick Time Event (QTE) style hit bar:
   - Green success bracket centered on 10–11 and dynamically expanding with Net ACC.
   - Red miss zones on outer wings.
   - Dedicated Diabolic miss notches at 3 (`3 😈`) and 18 (`😈 18`).
   - High-resolution custom raster token piece (`public/icons/qte-token.png`) placed precisely on the rolled 3d6 value.

### 3. MACG-3D6™ Success Roll Range Reference Table

| Tier | Net ACC | Roll Range | Probability |
| :--- | :---: | :---: | :---: |
| **Tier 1 (Sure Hit Rolls)** | &le; -3 | **10 – 11** | **25.0%** |
| **Tier 2** | -2 | **9 – 12** | **48.1%** |
| **Tier 3** | -1 | **8 – 13** | **67.6%** |
| **Tier 4 (Baseline)** | +0 | **7 – 14** | **81.5%** |
| **Tier 5** | +1 | **6 – 15** | **90.7%** |
| **Tier 6** | +2 | **5 – 16** | **96.3%** |
| **Tier 7 (Cap)** | &ge; +3 | **4 – 17** | **99.1%** |
| **Diabolic Rolls 😈 (Always Miss)** | *Any* | **3 & 18** | **0.9%** |

### 4. SEO & Branding Policy for MACG-3D6™
- Every combat reference and mechanics guide must identify this system by its official trademark: **Morville Adventure Card Game "3d6 Success Roll Range table reference" (MACG-3D6™)**.
- Brand copy and meta attributes explicitly associate `MACG-3D6`, `Diabolic rolls`, and `Morville Studios`.

## Game logo assets (AD&D boardgame aesthetic)

- **Painted game logo**: `public/brand/paths-to-odamyrus-logo.webp` (raw source: `assets/raw/brand/paths-to-odamyrus-logo.png`)
  - Transparent 2:1 emblem with the game title, dragon, crossed swords, and crimson banner.

`publication.json` is the machine-readable handoff for the Morville portal
build. The portal must use that canonical route rather than creating a second
game URL.

## Search and sharing

`index.html` owns the crawlable title, description, canonical URL, robots
directive, Open Graph/Twitter cards, and JSON-LD `VideoGame` plus breadcrumb
data. `public/seo/paths-to-odamyrus-share-1200x630.jpg` is the canonical social
preview and is reproducibly generated by `npm run seo:assets` from the approved
game background and Morville device. `npm run seo:check` compares these files
with `publication.json` and runs during the production build.

Keep the title and description concise, descriptive, and aligned with the visible
welcome screen. The initial HTML includes a visible game introduction inside
`#app`; JavaScript replaces it with the interactive welcome screen. This gives
non-rendering crawlers a real title and summary. Do not add a `meta keywords`
tag: Google ignores it. Structured data must describe real game features and
must not claim ratings or reviews that the game has not collected.

The repository also emits a web manifest, favicon, game sitemap, and robots
file. When the game is incorporated into the Morville portal build, the portal
root sitemap and image sitemap must include the game canonical URL and social
image. The website should link to the canonical game page with ordinary `<a>`
elements so discovery does not depend on client JavaScript.

SEO copy must describe implemented behavior only. Do not claim multiplayer,
accounts, saved cloud progress, native releases, awards, reviews, player counts,
or completed stages that are not present in the build.

## Standalone game subdomain

The game is a standalone Vite build served at the root of
`odamyrus.morvillestudios.com`. Runtime public files are resolved through
`src/ui/publicAsset.ts`; keep `vite.config.ts` using `base: './'` unless the
deployment pipeline deliberately chooses a fixed base. Publish the complete
`dist/` directory, including:

- `index.html` and hashed `assets/`
- `version.json` and `_headers`
- `background/`, `brand/`, `cards/`, `icons/`, `audio/`, and `seo/`
- `favicon.svg`, `manifest.webmanifest`, `robots.txt`, and `sitemap.xml`

The game subdomain serves its own `/robots.txt` and `/sitemap.xml`. The Morville
portal owns the catalogue page, approved game-logo and share derivatives, and
links to the game. The portal must not advertise an unserved game URL.

Publish the game at its new subdomain before changing the portal launch link.
Do not copy a stale game build into portal source; deploy the game independently.

The portal can permanently redirect the old `/games/the-paths-we-choose/` path
to `https://odamyrus.morvillestudios.com/`. The existing
`pathswechoose.morvillestudios.com` subdomain needs a separate Cloudflare
redirect after migration. Browser `localStorage` does not cross hostnames, so
existing saves on the old subdomain need an explicit transfer path before that
host is retired; retaining the same storage key alone cannot migrate them.
After publishing, submit the new canonical URL and sitemap in Search Console,
inspect the rendered page and structured data, and check that the old URL
redirects directly to the new one.

## Cache policy

Cloudflare must not require manual cache clearing after releases:

- `index.html` and `version.json`: no-cache/no-store and must revalidate.
- fingerprinted Vite `assets/*`: one-year immutable caching.
- fixed-name cards, art, icons and audio: revalidate on use through the fallback
  `max-age=0, must-revalidate` policy.
- social preview images: one day with stale-while-revalidate.

`public/_headers` contains rules for the game subdomain root and its static
assets. Verify those response headers on the deployed game host.

Do not add a service worker until its update and rollback behavior is specified
and tested against the in-game release notice.
