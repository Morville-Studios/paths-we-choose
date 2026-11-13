# AGENTS.md — AI Agent & Developer Guidelines

Welcome to **The Paths We Choose** (`paths-we-choose`), a tabletop-inspired dungeon-crawl and path-building card game inspired by *Slay the Spire* and *AD&D*.

Keep this file concise (~6 KB) so it never truncates in agent context. Do **not** duplicate gameplay numbers, card tables, or UI specs here—link to the Single Source of Truth (SSOT) below.

---

## 1. Single Source of Truth (SSOT) Map

When modifying code or rules, update **only** the canonical owner for that topic—never maintain competing copies across multiple docs:

| Topic | Canonical Owner (SSOT) | Notes |
| :--- | :--- | :--- |
| **Project Overview** | [`README.md`](file:///d:/adoni/repos/paths-we-choose/README.md) | High-level summary & quickstart only |
| **Runtime Types & Contracts** | [`src/core/types.ts`](file:///d:/adoni/repos/paths-we-choose/src/core/types.ts) | Never copy TypeScript interfaces into markdown |
| **Catalog Data (Classes, Monsters, Items, Decks, Cards)** | `src/data/*.ts` → [`docs/CATALOGS.md`](file:///d:/adoni/repos/paths-we-choose/docs/CATALOGS.md) | Run `npm run docs:sync` after any `src/data/` edit |
| **Game Loop, Screens, UX & Flows** | [`docs/GAME_DESIGN.md`](file:///d:/adoni/repos/paths-we-choose/docs/GAME_DESIGN.md) | Player-facing rules, screens, and UI behavior |
| **Math, Formulas & Ability Timing** | [`docs/MECHANICS_AND_DATA.md`](file:///d:/adoni/repos/paths-we-choose/docs/MECHANICS_AND_DATA.md) | Exact formulas, edge cases, and turn timing |
| **Module Layout, State Machine & Invariants** | [`docs/ARCHITECTURE.md`](file:///d:/adoni/repos/paths-we-choose/docs/ARCHITECTURE.md) | Deck conservation, audio states, Cloudflare cache |
| **Branding, SEO & Portal** | [`docs/BRANDING_AND_SEO.md`](file:///d:/adoni/repos/paths-we-choose/docs/BRANDING_AND_SEO.md) | Morville Studios lockup, metadata, route rules |
| **Roadmap & Future Phases** | [`docs/ROADMAP.md`](file:///d:/adoni/repos/paths-we-choose/docs/ROADMAP.md) | Completed vs. planned milestones |
| **Known Drift & Tech Debt** | [`docs/DISCREPANCIES.md`](file:///d:/adoni/repos/paths-we-choose/docs/DISCREPANCIES.md) | Open/resolved reconciliation register |

---

## 2. Direct Module Navigation Map (Avoid Reading Monoliths)

Go directly to the domain module you need instead of scanning unrelated code:

- **Core Rules (`src/core/`)** — Pure TypeScript, zero DOM/browser APIs:
  - `types.ts`: All runtime interfaces (`RunState`, `ActiveCombatState`, `MonsterCard`, etc.).
  - `rng.ts`: Seeded PRNG (`roll1D6`, `roll3D6`, `rollInt`, `shuffleArray`).
  - `stats.ts`: Effective stats, derived combat stats, linear SP costs (`base × 10`), `syncVitals`, `previewGearChange`.
  - `deck.ts`: Adventure, Monster, Treasure, New Skills deck operations & conservation.
  - `engine.ts`: Run start, Turn 0 preparation, movement, exploration, encounter/boss transitions, mission continuation.
  - `shrine.ts` / `village.ts` / `newSkills.ts` / `grid.ts` / `log.ts` / `audio.ts`: Domain-specific pure transitions.
  - `combat/` (re-exported by `combat.ts`):
    - `constants.ts` (AP/hand/flee constants)
    - `debuffs.ts` (hero hexes & stat debuffs)
    - `cards.ts` (`computeCardEffect`)
    - `rolls.ts` (`computeHitProbability`, `evaluateAttackRoll`)
    - `monsters.ts` (effective ATK/DEF, `getMonsterIntent`)
    - `session.ts` (`createCombatSession`, `drawCombatCards`)
    - `playerTurn.ts` (`playCombatCardFromHand`)
    - `flee.ts` (`attemptCombatFlee`)
    - `enemyTurn.ts` (`endPlayerCombatTurn`)
- **UI Presentation (`src/ui/`)** — Pure HTML-string templates:
  - `types.ts`: `UiState`, `PileType`, modal/pending types, `hasBlockingUiOverlay`.
  - `render.ts`: Play area, HUD/sidebars, pile modal, and barrel re-exports for screens/modals.
  - `screens/`: `welcome.ts`, `guide.ts` (7-page rulebook), `classSelect.ts`, `combatView.ts`, `villageView.ts`.
  - `modals/`: `eventModals.ts` (prep, exploration, victory, shrine), `inspectModals.ts` (card/stat/log modals), `saveModal.ts` (5-slot save/load modal).
  - `components/`: `qteBar.ts` (3d6 hit bar); plus `actionCard.ts`, `adventureCard.ts`, `grouping.ts`, `terrainPresentation.ts`, `cardArt.ts`, `icons.ts`, `brand.ts`, `publicAsset.ts`.
  - `styles/` (imported in cascade order by `styles.css`): `01-base-and-screens.css` through `08-responsive-and-qte.css`.
- **Browser Controller & State (`src/app/`, `src/state/`, `src/main.ts`)**:
  - `src/main.ts`: bootstrap, DOM mount, pointer/keyboard listeners, and `data-action` delegation.
  - `src/app/`: `types.ts` (`ActionContext`), `inspect.ts` (`findInspectedCard`), `combatAnimator.ts` (3d6 roll & damage VFX orchestration), and `actions/` (`index.ts`, `combat.ts`, `villageAndShrine.ts`, `navigationAndModals.ts`).
  - `src/state/`: `store.ts` (pub/sub + clock), `saveStorage.ts` (5-slot `localStorage` autosave + manual save/load/delete).
  - `src/audio/audioManager.ts`, `src/i18n/`.

---

## 3. Canonical Coding Patterns & Style Rules (Model-Consistent)

Follow these exact patterns regardless of which model or agent edits the repo:

1. **Module Size & Splitting**: Keep new or refactored modules focused (~150–400 lines). Never dump new screens, modals, or unrelated mechanics into `render.ts`, `combat.ts`, or `styles.css`—place them in `src/ui/screens/`, `src/ui/modals/`, `src/core/combat/`, or `src/ui/styles/` and re-export from the barrel if needed.
2. **Pure Core Transitions (`src/core/`)**:
   - Signature pattern: `(state: RunState, ...args) => RunState`.
   - Use early-return guard clauses (`if (state.activeHook.type !== '...') return state;`).
   - Return new immutable state objects (`{ ...state, ... }`); never mutate input state in place.
   - Never call `Date.now()`, `new Date()`, or `Math.random()`; use `state.logTimestamp` and `src/core/rng.ts`.
3. **Pure Functional UI (`src/ui/`)**:
   - Templates are pure functions returning HTML strings, wired via `data-action="..."` attributes and delegated in `src/main.ts`.
   - Never rely on `:hover`-only interactions for essential info; support tap/click/long-press/right-click.
4. **Data-Driven Content (`src/data/`)**:
   - Classes, terrains, stages, monsters, bosses, shop items, and combat cards live declaratively in `src/data/`, never hardcoded in engine/UI branches.
5. **CSS Discipline (`src/ui/styles/`)**:
   - Add rules to the matching numbered partial (`01`–`08`). Avoid adding new `!important` overrides unless overriding a specific utility class.
6. **Strict TypeScript & Naming**:
   - `"strict": true`, no implicit `any`. `PascalCase` for types/interfaces, `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants.
7. **Documentation & Locale Sync Rule**:
   - After `src/data/` edits → run `npm run docs:sync`.
   - After formula/rule/invariant edits → update the **one** canonical doc in the SSOT table (plus inline JSDoc on the changed function). Never copy rules into `AGENTS.md`.
   - After player-facing UI string edits → update localization keys/overrides and verify with `npm run i18n:check`.

---

## 4. Verification Commands

Run these before finishing any task:
- `npm test` — Vitest unit & UI suite
- `npm run docs:check` — verifies `docs/CATALOGS.md` matches `src/data/`
- `npm run i18n:check` — verifies all 5 locales have exact key parity
- `npm run build` — runs `docs:check`, `i18n:check`, strict `tsc`, and `vite build`
