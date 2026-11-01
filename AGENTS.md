# AGENTS.md — AI Agent & Developer Guidelines

Welcome to **The Paths We Choose** (`paths-we-choose`), a tabletop-inspired dungeon-crawl and path-building card game inspired by *Slay the Spire* and *AD&D*.

This document is the primary source of truth for AI coding agents and developers working in this repository. Always read this file and the relevant documents in [`docs/`](file:///d:/adoni/repos/paths-we-choose/docs) before making architectural or gameplay changes.

The Goblin King uses a **38-card ordinary Monster Deck**. Exact card quantities and creature data are in the generated [catalogs](docs/CATALOGS.md#ordinary-monsters); collector IDs identify types and runtime IDs distinguish copies. Goblins include Swamp eligibility; Ramram is Grasslands-only. Bosses are separate.

---

## 1. Documentation Map

All design specifications, architecture decisions, and roadmaps live in the repository under [`docs/`](file:///d:/adoni/repos/paths-we-choose/docs):

| Document | Purpose |
| :--- | :--- |
| [`README.md`](file:///d:/adoni/repos/paths-we-choose/README.md) | Project overview, quickstart, and index |
| [`AGENTS.md`](file:///d:/adoni/repos/paths-we-choose/AGENTS.md) | Agent workflow rules, architectural invariants, and coding conventions |
| [`docs/GAME_DESIGN.md`](file:///d:/adoni/repos/paths-we-choose/docs/GAME_DESIGN.md) | Core game loop, Base Stats + Class Stat Bonuses, 3-row pyramid vision cone, Monster Deck (inscribed Stat Points & Gold), Village Menu, Equipment Slots, Turn 15 Boss, and Slay the Spire + AD&D combat |
| [`docs/MECHANICS_AND_DATA.md`](file:///d:/adoni/repos/paths-we-choose/docs/MECHANICS_AND_DATA.md) | Exact math, Base Stat upgrade cost (`(baseStat + 1)²`), offset brick grid coordinates, 9-card board lag, Monster & Boss presets, Village Shop & Train catalogs, Equipment Slots, Player Action Decks, and TypeScript schemas |
| [`docs/ARCHITECTURE.md`](file:///d:/adoni/repos/paths-we-choose/docs/ARCHITECTURE.md) | Tech stack (TypeScript + Vite + HTML5/CSS/Canvas + Capacitor), state machine, and module layout |
| [`docs/ROADMAP.md`](file:///d:/adoni/repos/paths-we-choose/docs/ROADMAP.md) | Phased development milestones and open design questions for upcoming phases |

---

Catalog tables: [docs/CATALOGS.md](docs/CATALOGS.md) are generated from `src/data/`. Run `npm run docs:sync` after catalog changes; `npm run docs:check` is part of the production build. Runtime interfaces are maintained only in [src/core/types.ts](src/core/types.ts). Remaining reconciliation decisions are tracked in [docs/DISCREPANCIES.md](docs/DISCREPANCIES.md).

## 2. Core Architectural Principles

1. **Pure Core Logic (`src/core/`) vs. Presentation (`src/ui/`)**:
   - All game rules, deck shuffling, discard recycling, turn tracking, coordinate math, Base Stat + Class Bonus + Gear calculations, monster AI patterns, combat card resolution, village actions, and state transitions MUST live in pure TypeScript modules under `src/core/` with **zero DOM, Canvas, or browser API dependencies**.
   - This makes the game deterministic, unit-testable, and portable across Web, Android, and iOS. Wall-clock log timestamps are supplied as explicit inputs from the application boundary; core functions do not read the clock.
2. **Deterministic RNG**:
   - Never use raw `Math.random()` inside game logic. Always use a seeded PRNG utility (`src/core/rng.ts`) so runs, initial deck shuffles (Adventure Deck, Monster Deck, and Player Combat Deck), discard reshuffles, Village Train 3-card drafts, and `2d6` combat hit rolls can be replayed and debugged via a seed string.
3. **Mobile-First & Cross-Platform Ready**:
   - The game is built with **TypeScript + Vite + HTML5/CSS/Canvas** with Android and iOS packaging via **Capacitor** planned.
   - Never rely on hover-only (`:hover`) interactions for essential gameplay information; all card details (Terrain, Level, Hostile/Village marker, Monster stats/Stat Point Bonus/Gold/intent, Action Card effects) must be readable on face-up cards directly and via tap/press.
   - Respect mobile safe areas (`env(safe-area-inset-*)`), responsive viewport scaling, and touch gestures.
4. **Data-Driven Content**:
   - Classes, terrains, adventure deck presets, monster & boss catalogs, village shop equipment/consumables, and player combat cards must be defined in declarative data catalogs (`src/data/`) rather than hardcoded into UI rendering or state transitions.

---

## 3. Coding Conventions

- **Language**: Strict TypeScript (`"strict": true`, no implicit `any`).
- **Naming**:
  - `PascalCase` for types, interfaces, classes, and UI components.
  - `camelCase` for functions, variables, and state properties.
  - `UPPER_SNAKE_CASE` for constants and configuration presets.
- **Immutability**: Prefer immutable state updates or well-defined state transition functions so undo/history inspection and state serialization (`localStorage` / Capacitor Preferences) remain trivial.
- **Documentation Sync Rule**: Whenever a gameplay mechanic, stat formula, card property, or screen flow is added or modified, update the corresponding specification in [`docs/`](file:///d:/adoni/repos/paths-we-choose/docs) in the same change.

---

## 4. Current Scope (Phase 1 — Foundation, Path, Village, Combat & Boss Prototype)

- **Welcome Screen**: Full-screen atmospheric presentation featuring height-maximized background artwork (`/background/start-screen.png`), centered frosted-glass card, game title, tagline, looping intro soundtrack (`start-screen.mp3`), and "Start Adventure" action.
- **Base Stats, Class Stat Bonuses & Stat Evolution (No Character Levels)**:
  - There is **no Character Level or XP bar**—the player's stats themselves define character evolution!
  - Every player starts with **Base Stats of `1`** across all six attributes (`Base STR 1, Base DEX 1, Base AGI 1, Base INT 1, Base CHA 1, Base LUK 1`).
  - **Class Archetypes (Primary & Secondary Stats)**:
    - Each class has **1 Primary Stat** (+2 bonus) and **2 Secondary Stats** (+1 bonus each); all remaining stats receive +0.
    - **Fighter**: Primary `STR (+2)`, Secondary `DEX (+1), AGI (+1)` -> **Effective Starting Stats**: `STR 3, DEX 2, AGI 2, INT 1, CHA 1, LUK 1` -> **16 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **1 EVA**, **1 ATK**, **0 DEF**, **3 ACT**.
      - **Passive `[Berzerk]`**: Gain `+1 ATK` bonus when HP is 50% or below Max HP; if 25% or below, gain `+2 ATK` bonus instead.
      - **10-Card Starter Combat Deck**: `8x Melee ATK` + `2x Shield DEF`.
    - **Wizard**: Primary `INT (+2)`, Secondary `DEX (+1), CHA (+1)` -> **Effective Starting Stats**: `STR 1, DEX 2, AGI 1, INT 3, CHA 2, LUK 1` -> **12 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **0 EVA**, **1 MATK**, **0 MDEF**, **3 ACT**.
      - **Passive `[Conserve]`**: When ending turn in battle with unused Action Points, those AP carry over to the next battle turn.
      - **10-Card Starter Combat Deck**: `8x Fireball ATK` + `2x Force Field DEF`.
    - **Rogue**: Primary `AGI (+2)`, Secondary `DEX (+1), STR (+1)` -> **Effective Starting Stats**: `STR 2, DEX 2, AGI 3, INT 1, CHA 1, LUK 1` -> **14 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **1 EVA**, **1 ATK**, **1 DEF**, **3 ACT**.
      - **Passive `[Steal]`**: Whenever rolling a 2d6 to perform an attack hit check and it is a pair (`1+1, 2+2, 3+3, 4+4, 5+5, 6+6`), immediately gain `+1 Gold`.
      - **10-Card Starter Combat Deck**: `8x Melee ATK` + `2x Shield DEF`.
    - **Full-Screen 3-Card Smooth Interactive Carousel with Adventurer Artwork**:
      - Full-screen presentation (`width: 100%`, `max-width: 100%`, `min-height: 100dvh`) with radial gradient backdrop (`radial-gradient(circle at 50% 35%, #151d2c 0%, #090d14 100%)`).
      - 3D perspective carousel with active/center card highlighted (`scale(1.05)`, golden glowing border `#f59e0b`) and flanking preview cards (`scale(0.85)`, dimmed `opacity: 0.52`, clickable).
      - **Adventurer Cards (`public/cards/adventurers/*.jpg`)**: Carousel cards feature high-resolution raster illustrations of each hero class (`fighter.jpg`, `wizard.jpg`, `rogue.jpg`).
      - **Right Sidebar Column with Embark CTA**: The active class's Primary/Secondary roles, Passive, Stat table, Max HP, and Starter Deck are displayed in a dedicated detail panel beside the carousel, with the golden **Embark** CTA positioned cleanly centered underneath it.
      - **Guidance Info Text**: Centered below the carousel cards: *"Move left or right with A or D. You can also use the LEFT and RIGHT keys. Select the Adventurer Class and click Embark to start"*.
      - **Keyboard Controls**: `A`, `a`, or `ArrowLeft` rotates to the previous class; `D`, `d`, or `ArrowRight` rotates to the next class; `Enter` or `Space` embarks on the adventure.
      - **Hardware-Accelerated In-Place Transitions**: Updating class selection modifies DOM classes and the side detail panel in place without destroying DOM nodes (`updateClassCarouselDom`), preserving seamless CSS transitions on transform, scale, opacity, and glow.
  - **Adventurer Visuals in Character Sidebar & Combat**:
    - **Character & Gear Sidebar**: Features a prominent hero portrait on the left (`/cards/adventurers/*.jpg`) paired side-by-side with the 6 core stat rows (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) on the right.
    - **Combat Confirmation Modal**: Target (Self) hero cards display the adventurer's raster artwork, `HERO` type, `YOU` badge, and `Target | Self` banner.
  - **Charisma (`CHA`) Stat**:
    - Each point of Effective CHA reduces the prices of purchaseable goods in Village Shops by **5%** (e.g. 1 CHA = 5% off, 2 CHA = 10% off; minimum 1 Gold). Will be utilized for future events and encounters.
  - **Starting 4 Stat Points & Welcome Preparation Dialog**:
    - Players begin every adventure with **4 starting Stat Points (`statPoints: 4`)**.
    - On game start (Turn 0), players are greeted with a preparation dialog welcoming the adventurer and instructing them to prepare for their journey, embedding the same Stat Point converter widget used in Shrines. Players can immediately allocate their 4 SP toward Base Stats before taking their first step.
  - **Upgrading Base Stats with Stat Points at Shrines**:
    - Defeating Monsters awards **Stat Points (`statPoints`)** inscribed directly on the Monster Card.
    - Only **Base Stats** are upgraded using Stat Points.
    - **Shrine Conversion Rule**: Outside of the initial preparation dialog, Base Stat upgrades can **only be performed at Shrines** (`hasShrine: true`). To raise a Base Stat from current level `B` to `B + 1`, the player spends **`(B + 1) * (B + 1)` Stat Points** (e.g., Base `1 -> 2` costs `2x2 = 4` Stat Points; Base `2 -> 3` costs `3x3 = 9` Stat Points; Base `3 -> 4` costs `4x4 = 16` Stat Points; Base `4 -> 5` costs `5x5 = 25` Stat Points). Players may purchase multiple upgrades in a single Shrine visit as long as they have sufficient Stat Points.
    - **Stat Row Cleanup & Dedicated Stat Info Modal (Right-Click / Long-Press / ⓘ)**: Stat rows in the sidebar omit the noisy `next: X SP` text to keep the interface clean and spacious. Right-clicking (or holding for 1s on touch, or clicking `ⓘ`) on any stat row opens the dedicated **Stat Info Modal** showing:
      1. **Full Computation to Final Value**: `Effective Stat = Base + Class Archetype Bonus + Shrine Blessing + Equipped Gear`.
      2. **Derived Bonus Stats & Combat Scaling**: Exact formulas and live numbers:
         - **STR**: Max HP $+2 \times \text{STR}$, ATK contribution $\lfloor\text{STR} / 2\rfloor$, DEF contribution $\lfloor\text{STR} / 5\rfloor$.
         - **DEX**: 1 ACC per 2 DEX ($\lfloor\text{DEX} / 2\rfloor$), ATK contribution $+1$ per 3 DEX ($\lfloor\text{DEX} / 3\rfloor$).
         - **AGI**: 1 EVA per 2 AGI ($\lfloor\text{AGI} / 2\rfloor$), DEF contribution $+1$ per 3 AGI ($\lfloor\text{AGI} / 3\rfloor$).
         - **INT**: MATK $\lfloor\text{INT} / 2\rfloor$, MDEF $\lfloor\text{INT} / 5\rfloor$, ACT $+1$ Max AP per 5 INT ($3 + \lfloor\text{INT} / 5\rfloor$).
         - **CHA**: -5% shop discount per CHA.
         - **LUK**: Critical Hit threshold $12 - \lfloor\text{LUK} / 10\rfloor$ (default 12; 10 LUK = 11+; 20 LUK = 10+), victory spoils $+\lfloor\text{LUK} / 2\rfloor$ Gold.
      3. **Next SP Required to Level**: Target Base level, `(currentBase + 1)²` SP formula, live current SP balance, ready/needed chip, and reminder that upgrades occur at Shrines or during Turn 0 preparation.
    - **Automatic Sacred Shrine Boons & Single Blessing Invariant**:
      - Visiting a Sacred Shrine automatically grants the adventurer a random eligible divine boon upon arrival (no manual prayer button required).
      - The shrine modal prominently announces the granted boon: `Visiting this Sacred Shrine has granted you: {Boon Name}!`.
      - **Single Active Blessing Invariant**: Only **1 shrine blessing may be active at a time**. Receiving a new shrine blessing automatically replaces and eliminates the previous blessing (resets prior blessing stat bonuses or divine protection and resyncs vitals).
      - Eligible boons are filtered by player condition:
        1. **Cleanse**: Cleanses all negative statuses (poison, blindness, crippled); only eligible if the player has an active negative status.
        2. **Blessing of {stat name}**: Grants a temporary `+1` stat bonus to the named attribute (`STR`, `DEX`, `AGI`, `INT`, `CHA`, or `LUK`) for the current map; no condition.
        3. **Divine Protection**: Reduces incoming monster attack damage by `1` for the remainder of the current map; poison bypasses it. No eligibility condition.
        4. **Revitalize**: Heals current HP to Max HP immediately; only eligible if current `HP < Max HP`.
      - **Stat Info Modal Inspection in Shrines**: Right-clicking (or contextmenu / long-press / clicking `ⓘ`) on any stat row in the shrine's Stat Point converter opens the dedicated Stat Info Modal showing full computations, scaling, and next SP costs.
      *(Note: Both Stat Blessings and Divine Protection are map-temporary favors that expire upon defeating the Stage Boss and do not carry over to the next map.)*
- **Tabletop 2d6 Combat Rolls, ACC & EVA System**:
  - **Universal Hit Check Rule**: Any action that performs an attack on a target (whether a player action attack card, a hybrid defense card that deals damage, or a monster attack intent) performs the **`2x 1d6` (2d6)** hit check against the target's EVA.
  - **Dice Mechanics**: Two six-sided dice are rolled (range 2–12, naturally bell-curved around 7).
  - **Hit / Miss Threshold**: With no modifiers, rolls of **7 and above are a Hit** (58.33%), while **6 and below are a Miss** (41.67%).
  - **Snake Eyes (`1 + 1 = 2`)**: Total miss (automatic miss regardless of accuracy modifiers).
  - **Critical Hits**: Meeting or exceeding the critical threshold (default `12`, or improved by LUK) is an automatic critical hit applying **+50% bonus ATK damage** ($\lfloor \text{damage} \times 1.5 \rfloor$).
  - **ACC vs. EVA Modifiers**:
    - Net Accuracy: $\text{netAcc} = \text{attackerACC} - \text{targetEVA}$.
    - Required roll to hit: $\text{neededRoll} = 7 - \text{netAcc}$ (e.g., 2 ACC vs 1 EVA = +1 net ACC, hits on a roll of 6+).
    - **ACC Formula**: `1 ACC` is gained for each `2 DEX` ($\text{ACC} = \lfloor \text{DEX} / 2 \rfloor$).
    - **EVA Formula**: `1 EVA` is gained for each `2 AGI` ($\text{EVA} = \lfloor \text{AGI} / 2 \rfloor$). Defense cards can grant temporary round EVA bonuses.
    - **Hero ATK Formula**: $\lfloor \text{STR} / 2 \rfloor + \lfloor \text{DEX} / 3 \rfloor + \text{gear.atk}$.
    - **Hero DEF Formula**: $\lfloor \text{STR} / 5 \rfloor + \lfloor \text{AGI} / 3 \rfloor + \text{gear.def}$.
    - **Hero ACT (Max AP) Formula**: $3 + \lfloor \text{INT} / 5 \rfloor$.
    - **Critical Threshold Formula**: $\max(2, 12 - \lfloor \text{LUK} / 10 \rfloor)$. Default is 12 (Boxcars, 2.8%); 10 LUK gives 11+ (8.3%); 20 LUK gives 10+ (16.7%).
  - **Monsters**: Every monster has inherent ACC and EVA stats (e.g., Goblin: 1 ACC, 1 EVA; Scavenger: 2 ACC, 2 EVA; Ramram: 2 ACC, 1 EVA; Rattler: 3 ACC, 2 EVA; Goblin Chieftain: 3 ACC, 2 EVA).
  - **Card Accuracy Bonuses**: Cards like `Melee ATK` feature an inherent **`+1 ACC` bonus** (`accBonus: 1`) on attack rolls, lowering the required 2d6 roll to hit.
  - **Combat Action Confirmation Popup**: Clicking an action card in combat does not use it immediately; instead, it opens a confirmation modal pairing the Source and Target cards:
    - Displays `Use {card} on {target}` header.
    - Shows the 2 cards side-by-side (Source Action Card & Target Creature / Hero).
    - For attacks on creatures: displays full ACC and EVA stats, net ACC modifier, required 2d6 dice roll, and exact **hit probability percentage** (out of 36 dice combinations, including Boxcars crit and Snake Eyes miss notes).
    - Provides a prominent **Confirm Use** button below to execute the action, along with a **Cancel** button.
  - All monsters in the battle area are active simultaneously: each acts on the monster turn with its own 2d6 roll against the player's EVA. The player selects which target to attack.
  - **3D Monster Carousel Targeting System (Single-Row Stability for 3+ Opponents)**:
    - When multiple opponents appear in battle (e.g. Blob + Rattler + Scavenger, or the 3 Cult of Trolls Bosses), enemies are presented in a unified 3D perspective carousel (`.monster-carousel-track`) rather than wrapping into vertical rows that break viewport height.
    - **Active Target in Center**: The selected target is centered (`.is-center`, `scale(1.02)`, full opacity, prominent glowing golden border, with `🎯 TARGET (Roll X+)` header and live intent/HP dock below).
    - **Flanking Opponents**: Adjacent living enemies flank the active target (`.is-prev` at `-175px` and `.is-next` at `+175px`, `scale(0.82)`, dimmed `opacity: 0.62`, clickable). Clicking any monster smoothly brings it to the center as the active target.
    - **Keyboard Traversal**: Players can traverse targets effortlessly using `A` / `D` or `ArrowLeft` / `ArrowRight` (cycles exclusively among living targets, skipping defeated hostiles).
    - **Navigation Chevrons**: Sleek circular prev/next buttons (`.monster-carousel-nav`) on the left and right of the carousel track provide one-click touch traversal on mobile and tablet screens.
    - **Guidance Banner**: Displays *"Traverse targets with A or D. You can also use the LEFT and RIGHT keys. Tap a monster to target it with attacks."* directly below the carousel track.
    - **Hardware-Accelerated In-Place Updates (`updateMonsterCarouselDom`)**: Switching targets updates DOM classes and badges in place without destroying DOM nodes, preserving smooth CSS transitions on transform, scale, and glow.
  - **Hero Character, Vitals & Backpack Sidebar in Combat (`.combat-hero-sidebar`)**:
    - **Integrated Left Sidebar**: A dedicated hero panel occupies the left column of the battle screen (`.combat-modal`), ensuring hero vitals, stats, and inventory are always visible and interactive during active combat.
    - **Hero HP / Max HP Graphical Bar**: Prominently displays the player's HP numbers and a filled health bar with active Block indicator.
    - **Core & Derived Stats**: Shows the 6 core stats (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) with right-click inspection, alongside prominent derived combat chips: **DEF** (hero physical damage absorption), **ATK**, **ACC**, **EVA**, **BLK**, and **AP**.
    - **Combat Backpack & Consumables**: Lists items in the backpack with dedicated `Use` buttons on consumables (e.g. `Health Potion`), allowing the player to heal during battle. Using a potion immediately updates HP and adds a timestamped log to the combat log (`🧪 Used Health Potion: restored +X HP`).
  - **Explicit DEF Damage Absorption Logging & Dice Banner**:
    - When a monster hits the hero, the log explicitly details damage absorbed by natural Hero DEF and divine protection before shield block or HP loss (e.g. `2 absorbed by Hero DEF, 0 blocked, 4 HP damage`).
    - The 2d6 dice banner outcome displays the DEF reduction explicitly (e.g. `🎯 HIT! (4 DMG, 2 absorbed by Hero DEF)`).
  - **Dynamic Monster Attack Bonus & Flashing Buffed Damage**:
    - When a monster's attack is scaled by abilities (such as *Bullwark's Charge Momentum* granting `+1 ATK` each charge), the pattern table on the card face and the `NEXT:` status dock display the live boosted damage (e.g. `7 DMG` instead of base `6 DMG`).
    - The boosted damage number pulses with a flashing amber glow (`.is-buffed-flashing`).
    - The card face displays an active boon badge (`🔥 Boon: +X ATK`).
    - The Monster Info Modal (`cardInspectModal`) includes an `✨ Active Boons & Combat Enhancements` section explaining the active boon and updates the pattern steps to show boosted values.
  - **Battle State Combat Log Sidebar, Timestamps & Actor Badges**:
    - **Dedicated Right-Hand Sidebar**: In combat, the combat log is moved from the bottom to a dedicated right-hand sidebar (`.combat-log-sidebar`) side-by-side with the main battle area (`.combat-main-col`).
    - **Header & Counter**: Displays `📜 Battle Log` with a live entry count badge (`.combat-log-count`).
    - **Timestamped Entries**: Every combat log entry records a real-time timestamp formatted as `[HH:MM:SS]` (`.combat-log-time`).
    - **Actor Badges & Color Coding**:
      - **Hero ('You')**: Highlighted in **Blue** (`.combat-log-actor.is-hero`, text `#38bdf8`, background `rgba(14, 165, 233, 0.22)`, border `rgba(56, 189, 248, 0.55)`, left border accent `3px solid #38bdf8`).
      - **Enemies / Hostiles**: Highlighted in **Red** (`.combat-log-actor.is-enemy`, text `#f87171`, background `rgba(239, 68, 68, 0.22)`, border `rgba(248, 113, 113, 0.55)`, left border accent `3px solid #ef4444`). The badge identifies the acting creature by name (e.g. `Pincer`, `Scavenger`, `Bullwark`, `Zombie`).
      - **Encounter / System**: Displayed in neutral slate (`.combat-log-actor.is-system`, left border accent `3px solid #64748b`).
    - **Responsive Stacking**: On tablet and mobile viewports (`<= 960px`), the sidebar stacks cleanly below the End Turn button with independent scroll.
  - **Monster DEF on Hero Attacks**: When a hero attack hits, damage is reduced first by the monster's MDEF for INT-scaled attacks or DEF for other attacks, then by its temporary Block; the remainder reduces HP (e.g. 4 DMG vs Pincer DEF 1 = 3 HP damage). Logs and the dice banner state the amount absorbed by the monster's DEF.
  - **Permanent FLEE Action (2 AP)**:
    - A `Flee` card (`createFleeCard`, id `action_flee`) is always shown beside the hand. It is never drawn, discarded, or shuffled into the combat deck.
    - Using it (after a confirmation modal showing escape odds) rolls `1d6`. Escape threshold = $\lfloor(\text{Effective AGI} + \text{Effective LUK}) / 2\rfloor$ (minimum 1).
    - **Success (`roll <= threshold`)**: The hero escapes. Combat ends with **no SP, Gold, or loot**, the encountered monsters go to `monsterDiscard`, and play returns to the map.
    - **Failure**: 2 AP is spent, a log entry records the roll, and the battle continues.
    - **Stage Bosses cannot be fled from** (the Flee card is disabled in boss fights).
  - **Combat Victory Modal & Loots Showcase**:
    - Defeating all monsters in battle pauses gameplay and immediately displays the atmospheric **Victory Modal** (`activeHook.type === 'VICTORY'`) rather than snapping abruptly back to the map.
    - **Rewards & Defeated Foes Showcase**:
      - **Defeated Foes**: Cards with raster art thumbnails, creature subtypes, levels, and inscribed SP/Gold rewards.
      - **Loot Cards Grid**: Large cards showcasing inscribed **Stat Points (`+X SP`)** for Sacred Shrine upgrades and **Gold Spoils (`+Y Gold`)** with base, Luck bonus ($\lfloor\text{LUK}/2\rfloor$), and Lucky Charm breakdown.
    - **Interactive Return Action**:
      - Regular battles provide an `OK — Return to Map →` button (`data-action="confirm-victory"`), returning the player to map navigation (`activeHook.type = 'NONE'`) and resuming the map soundtrack (`map-area.mp3`).
      - Stage Boss battles provide an `OK — Proceed →` button transitioning directly to the Stage Complete screen (`ON_STAGE_COMPLETE`).
- **Classic RPG Equipment Slots, Consumables Bag, Village Rest Cost & Shop Comparison**:
  - **Starting Gold**: Players begin every adventure with **20 Gold** (`gold: 20`).
  - **3 Equipment Slots & Permanent Backpack**: `Weapon`, `Armor`, and `Accessory` (1 item equipped per slot).
    - **Map Equipment Management & Unequip**: Players can freely equip and unequip items anytime while on the map outside combat. Filled slots feature an `Unequip` button that moves the gear to the backpack.
    - **Permanent Backpack Section**: The character sidebar permanently displays `🎒 Backpack (${state.backpack.length})`, listing all unequipped gear with `Equip` buttons (or `Use` for consumables).
    - **Dynamic Vital Synchronization**: Equipping or unequipping gear that modifies STR (such as `Ring of Beasts +1 STR`) dynamically recalculates Max HP and clamps current HP cleanly.
    - **Combat Lock**: Equipping and unequipping is strictly disabled during active combat (`activeHook.type === 'COMBAT'`).
  - **Consumables Bag**: Holds items like `Health Potion`.
  - **14-Item Shop Catalog (Physical TCG Items, Levels 1 & 2)**:
    1. `Health Potion`: Restores 10 HP. Costs 6 Gold (Consumable, Level 1).
    2. `Iron Sword`: +1 ATK. Costs 10 Gold (Weapon, Level 1).
    3. `Apprentice Staff`: +1 MATK. Costs 15 Gold (Weapon, Level 1).
    4. `Robe`: +1 MDEF. Costs 15 Gold (Armor, Level 1).
    5. `Leather Clothes`: +1 EVA. Costs 12 Gold (Armor, Level 1).
    6. `Chainmail`: +1 DEF. Costs 15 Gold (Armor, Level 1).
    7. `Book of Spells`: +1 INT. Costs 15 Gold (Accessory, Level 1).
    8. `Ring of Beasts`: +1 STR. Costs 15 Gold (Accessory, Level 1).
    9. `Sandals of Swiftness`: +1 AGI. Costs 15 Gold (Accessory, Level 1).
    10. `Lucky Charm`: Produces an additional `(1d6 - 1)` Gold (0–5 Gold) per completed victory. Costs 20 Gold (Accessory, Level 1).
    11. `Iron Sword +`: +2 ATK. Costs 30 Gold (Weapon, Level 2).
    12. `Chainmail +`: +2 DEF. Costs 45 Gold (Armor, Level 2).
    13. `Robe +`: +2 MDEF. Costs 45 Gold (Armor, Level 2).
    14. `Apprentice Staff +`: +2 MATK. Costs 45 Gold (Weapon, Level 2).
  - **Treasure Deck & Village Shop Stock Mechanics**:
    - **28-Card Treasure Deck**: At game start, a Treasure Deck of **28 item cards** is created from 2 copies of each of the 14 catalog items (`SHOP_ITEM_CATALOG` x 2) and shuffled deterministically.
    - **Village Shop Draw Count**: Stores no longer sell the entire catalog. Opening a Village Shop draws **`5 + Village Level` item cards** (e.g. 6 cards in a Level 1 Village) from the top of the Treasure Deck into `shopStock`.
    - **Card Arts in Options**: Every option displayed in the store features its official 5:7 raster card artwork (`/cards/items/*.jpg`), item type, stats, level badge, and Charisma price discount.
    - **Unbought Card Discard**: When the player finishes or leaves the village (`finishVillage`), all remaining unbought cards in `shopStock` are swept into `treasureDiscard`.
    - **Selling Cards**: Selling an item returns that card directly to `treasureDiscard`.
    - **Endless Reshuffle**: If cards are drawn while `treasureDeck` is depleted, `treasureDiscard` is reshuffled to form the new Treasure Deck.
  - **Derived Combat Stats**:
    - **Physical ATK**: $\text{Hero ATK} = \lfloor \text{STR} / 2 \rfloor + \lfloor \text{DEX} / 3 \rfloor + \text{gear.atk}$.
    - **Physical DEF**: $\text{Hero DEF} = \lfloor \text{STR} / 5 \rfloor + \lfloor \text{AGI} / 3 \rfloor + \text{gear.def}$. Reduces physical damage intake when a hit roll succeeds for non-magical (physical) attacks: $\max(0, \text{baseDmg} - \text{heroDef} - \text{protection})$.
    - **Magical ATK (MATK)**: $\text{Hero MATK} = \lfloor \text{INT} / 2 \rfloor + \text{gear.matk}$. Boosts spell scaling.
    - **Magical DEF (MDEF)**: $\text{Hero MDEF} = \lfloor \text{INT} / 5 \rfloor + \text{gear.mdef}$.
    - **ACC & EVA**: $\text{ACC} = \lfloor \text{DEX} / 2 \rfloor$, $\text{EVA} = \lfloor \text{AGI} / 2 \rfloor + \text{gear.eva} + \text{roundBonusEVA}$.
  - **Village Rest Cost & Conditions**: Resting at the village inn costs **`5 gold + 1 gold for every 10 HP missing rounded down`** ($\text{cost} = 5 + \lfloor \text{missingHp} / 10 \rfloor$), restores full HP, and cleanses all negative status ailments. **Resting is disabled if the player is on full health (`hp >= maxHp`) and has no negative status ailments**, or if the player has insufficient gold.
  - **Shop Comparison & Inventory Visibility**: The Village Shop displays the player's equipped gear in each slot, what will be replaced, and live before/after stat delta chips (`STR 4 -> 5 (+1)`, `ATK 1 -> 2 (+1)`, `DEF 0 -> 1 (+1)`, Max HP changes) before purchasing or selling.
  - **Village Menu Reversibility**: Players can freely return from subviews (`Shop`, `Train`) back to the main Village Menu **until an action is finalized** (buying/selling an item, drafting/removing a card, or resting). Once an action is taken in the Shop, returning to the menu is locked.
  - **Effective Stat Formula**: `Effective Stat = Base Stat + Class Stat Bonus + Blessing Bonus + Equipped Gear Bonus`.
- **Play Area, 3-Row Pyramid Vision Cone & Offset Brick Grid**:
  - Starts at **Turn 0** with a central **Start Tile/Card** at `(0, 0)` with the **Player Token** on top of it.
  - **Initial Pyramid Draw (5 cards total)**: Row 1 (`2` choices) + Row 2 (`3` lookahead cards).
  - **Larger Lagging Row Discard & Endless Deck Reshuffle**: Moving to row `R` sweeps only `Row R - 1` into `adventureDiscard`, keeping up to **9 Adventure Cards** on the board across Rows `R`, `R + 1`, and `R + 2`.
- **Adventure Card Numbering & Catalog Architecture**:
  - All 15 Adventure Cards adhere to standardized collector card numbers starting with `adv`:
    - `Undiscovered Grassland` (LVL1) = `advgrs-00`
    - `Grassland Encounter` (LVL2) = `advgrs-01`
    - `Grassland Encounter` (LVL3) = `advgrs-02`
    - `Grassland Village` (LVL1) = `advgrs-03`
    - `Grassland Shrine` (LVL1) = `advgrs-04`
    - `Undiscovered Forest` (LVL2) = `advfrs-00`
    - `Forest Encounter` (LVL3) = `advfrs-01`
    - `Forest Encounter` (LVL4) = `advfrs-02`
    - `Forest Village` (LVL2) = `advfrs-03`
    - `Forest Shrine` (LVL2) = `advfrs-04`
    - `Undiscovered Swamp` (LVL3) = `advsmp-00`
    - `Swamp Encounter` (LVL4) = `advsmp-01`
    - `Swamp Encounter` (LVL5) = `advsmp-02`
    - `Swamp Village` (LVL3) = `advsmp-03`
    - `Swamp Shrine` (LVL3) = `advsmp-04`
  - **Undiscovered Terrains Exploration Mechanics**:
    - Stepping onto an undiscovered card (`advgrs-00`, `advfrs-00`, or `advsmp-00`) triggers a `1d6` roll modal:
      - **Combat (`roll <= card.level`)**: Enemy encountered! Battle commences drawing hostiles matching the card's terrain and level.
      - **Treasure (`roll === 6`)**: Secret cache found! Cards are drawn from the Treasure Deck until an item with `item.level <= card.level` is found (higher level items are discarded to `treasureDiscard`). The found item is added directly to the player's backpack.
      - **Safe (`other rolls`)**: Calm passage through peaceful wilderness.
  - **Deck Viewer Card Ordering Invariant**: Cards in the Deck Viewer modal are strictly arranged based on `cardNumber` in the exact sequence above.
- **Stage 1 Adventure Deck ("The Goblin King", 30 Land Cards)**:
  - `advgrs-00` x3, `advgrs-01` x5, `advgrs-02` x3, `advgrs-03` x3, `advgrs-04` x3
  - `advfrs-00` x2, `advfrs-01` x3, `advfrs-02` x2, `advfrs-03` x2, `advfrs-04` x2
  - `advsmp-00` x1, `advsmp-01` x1, `advsmp-02` x0, `advsmp-03` x0, `advsmp-04` x0
  - **Total**: 30 cards. Turn 15 Boss: **Goblin Chieftain**.
- **Stage 2 Adventure Deck ("Cult of Trolls", 30 Land Cards & 3-Troll Boss Encounter)**:
  - After defeating the Goblin King, the player can continue to the next mission: **"Cult of Trolls"**.
  - `advgrs-00` x0, `advgrs-01` x0, `advgrs-02` x2, `advgrs-03` x0, `advgrs-04` x0
  - `advfrs-00` x2, `advfrs-01` x6, `advfrs-02` x3, `advfrs-03` x3, `advfrs-04` x3
  - `advsmp-00` x1, `advsmp-01` x4, `advsmp-02` x2, `advsmp-03` x2, `advsmp-04` x2
  - **Total**: 30 cards.
  - **Turn 15 Boss: Cult of Trolls (3 Trolls Active Simultaneously)**:
    1. **Troll Healer** (20 HP, 1 DEF, 2 ACC, 0 EVA): Heals a random damaged troll for 10 HP (*Troll Mending*).
    2. **Troll Hexer** (20 HP, 1 DEF, 2 ACC, 0 EVA): Casts a random 1-turn debuff on hero (*Troll Hex*):
       - 1: Lose 1 ACC (`-1 ACC` on attack hit checks).
       - 2: Damage hero takes increases by 1 (`+1 DMG taken` from incoming monster attacks).
       - 3: Hero EVA is reduced by 1 (`-1 EVA` on monster attack rolls).
    3. **Troll Warrior** (24 HP, 1 DEF, 3 ACC, 0 EVA): Continues to attack for 6 DMG each round (*Troll Smash*).
- **Hostile Level & Terrain-Filtered Encounter Spawning**:
  - A card's **Encounter Level** defines the encounter level budget. Stepping onto an Encounter card draws Monster Cards from the Monster Deck matching the tile's terrain (`monster.spawnTerrains.includes(card.terrain)`) until the **total level of all monsters >= the encounter level budget** (e.g., Level 2 Encounter draws 2 Level 1 monsters or 1 Level 2 monster).
  - **Creature Draw Rule (Higher Level straight to Discard)**: When drawing monster cards for an encounter, if the monster LVL drawn is higher than the LVL of the encounter (`monster.level > encounterLevel`), it goes straight into the monster discard pile.
  - **Incompatible Terrain Card Cycling Rule**: When drawing from the monster deck for an encounter, any drawn monster that is incompatible with the current terrain goes back to the **bottom of the monster deck immediately instead of the discard pile**.
  - All monsters in the battle area are active simultaneously: each acts on the monster turn with its own 2d6 attack roll against the player's EVA. The player selects which target to attack.
- **Stage 1 Monster Deck (38 ordinary cards) + Turn 15 Boss**:
  - Exact quantities, collector IDs, types, stats, rewards, terrains, patterns and abilities are maintained in the generated [CATALOGS.md](docs/CATALOGS.md#ordinary-monsters), sourced from `src/data/monsters.ts`.
  - The separately spawned Stage 1 Boss is Goblin Chieftain. Stage 2 has the three Cult of Trolls bosses.
- **Official Standard TCG Card Architecture (Unified Full-Art Template across All Cards)**:
  - **Standard Card Proportions**: Strictly maintains the official **5:7 aspect ratio** (**2.5" × 3.5"**) across all card types and devices.
  - **Unified Reusable Full-Art Card Format**: Every single card in the game (Creatures, Actions, Items/Equipment, Lands, and Hero) shares the exact same full-art presentation template:
    1. **Full-Bleed Raster Art Layer (`inset: 0`)**: Digital raster paintings span the entire card surface edge-to-edge from top to bottom (`.tcg-art-window` with `position: absolute; inset: 0`), replacing old cropped rectangular windows. Every card has its own dedicated raster art (`/cards/creatures/*.jpg`, `/cards/actions/*.jpg`, `/cards/adventure/*.jpg`, `/cards/items/*.jpg`).
    2. **Consolidated Top Header (Meta Line & Card Name)**: Full-size creatures use level at left, inline type/subtype and spawn icons at right on the first row; name and collector number occupy the second row. Other card types retain their type stack and level/AP placement.
    3. **Floating Target Pill (`.combat-target-badge-top`)**: The active target pill (`🎯 TARGET (Roll X+)`) floats neatly above the card frame in combat (not inside or covering the artwork).
    4. **Inscribed Rewards (`.tcg-art-rewards`)**: Displayed on the upper-left of creature artwork directly below the header as floating badges with clear numeric values (`+4 Gold`, `+1 SP`) using official raster icons.
    5. **Uninterrupted Artwork Showcase (`.tcg-art-spacer`)**: The middle dividing ribbon is completely eliminated, providing a large, continuous vertical artwork showcase area (`flex: 1 1 auto`) between the top header and the bottom textbox.
    6. **Rules-Only Compact Textbox (`.tcg-textbox`) & Universal Bottom Docking Invariant**: Semi-transparent background (`rgba(..., 0.95)`) docked cleanly to the bottom of the card frame (`margin-top: auto !important; margin-bottom: 0 !important;` when followed by a footer, or `margin-bottom: 6px/8px !important;` when no footer exists), universally eliminating dead space or vertical floating gaps below the rules across ALL card types (Creature, Adventure/Land, Item/Equipment, Action, and Hero). `.tcg-inner-frame` is positioned with `position: absolute !important; inset: 3px !important;` (or `inset: 4px !important;` in inspect cards) to strictly prevent height collapse under `aspect-ratio: 5/7` flex containers. Displays ONLY essential gameplay rules (slot bonuses, damage/block scaling). On creature cards, the textbox displays creature abilities, the cyclic attack pattern table (`Turn 1: Slash (3 DMG)`), while positive creature stats are consolidated in the bottom dock with raster icons; no derived-stat row appears in the textbox. Monsters have no ATK stat because monster damage is defined directly in their attack patterns; creatures with an empty pattern skip their turn and log that they did nothing. **Flavor text is omitted from the card face** to maximize art space and prevent visual clutter (lore text remains accessible in the inspect detail modal).
    7. **Universal Bottom Docking & Footer Architecture**:
       - `.tcg-inner-frame` is anchored across the entire card via `position: absolute !important; inset: 3px !important;` (or `inset: 4px !important;` in inspect cards) with `display: flex; flex-direction: column;`, mathematically guaranteeing it spans from the top border to the bottom border.
       - When a footer is present (`.tcg-footer`), the textbox docks flush to the top edge of the footer (`margin-bottom: 0 !important; border-bottom-left-radius: 0; border-bottom-right-radius: 0;`), while the footer has `margin-top: 0 !important; margin-bottom: 6px/8px !important;`.
       - When no footer is present (e.g. Adventure Lands in inspect modals, mini cards), the textbox docks flush to the bottom edge with its own rounded bottom corners (`border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; margin-bottom: 6px/8px !important;`).
       - Middle spacer (`.tcg-art-spacer`, `.tcg-item-art-spacer`, `.adv-art-spacer`) expands with `flex: 1 1 auto; min-height: 10px;` so central artwork is always unobstructed and maximized.
    8. **Interactive Combat Status Dock & Flickering Prevention (`.creature-combat-dock`)**: Positioned below creature cards in battle, housing the active `NEXT:` move intent and the live `HP:` progress bar (`${hp} / ${maxHp} HP` with Block indicator), keeping the physical card face clean.
       - **Flicker-Free Rendering Invariant**: In 3D perspective carousel containers (`.monster-carousel-track`), `backdrop-filter: blur(...)` is strictly disabled on `.tcg-textbox`, `.tcg-footer`, and `.creature-combat-dock` (using crisp `rgba` fills instead) to eliminate Chromium GPU compositor blur shader thrashing.
       - **Target Pill & Buff Stability**: `.combat-target-badge-top` uses a stable static golden box-shadow (no continuous `box-shadow` animation), `.is-buffed-flashing` uses stable golden highlighting (no scale transform reflows), and hover jumps are disabled on combat cards (`.combat-monster-unit .tcg-card:hover { transform: none !important; }`) to prevent edge-hover jitter.
    9. **Universal Mini Card Rules (`.is-mini`, Deck & Pile Modals)**: Mini cards are streamlined to prioritize illustration artwork and essential identification:
        - **Mini Creature Cards**:
          - **Header**: Single-row layout with Monster Name on the left and `Lvl X` ribbon on the right in gold border. Omits type stack or duplicate text.
          - **Artwork Showcase**: Full unobstructed digital raster painting. Does NOT display attack pattern tables, defeat reward icons/values (`+X Gold`, `+Y SP`), creature derived stats row (`DEF: ?? / EVA: ??`), or textboxes.
          - **Footer**: Single-row docked bar displaying creature subtype (`Serpent`, `Goblinoid`, `Beast`, `Ooze`, `Insect`, etc.) in gold `#fef08a` text on the left, and circular terrain spawn badges (`🌿`, `🌲`) on the right.
          - **Multiplier Badge**: Straddles the bottom center of the card frame (`x N`), preventing any obstruction of top header names or level ribbons.
        - **Mini Item & Action Cards**: Render with transparent textboxes to showcase artwork while keeping essential rule text legible.
    10. **Card Footer**: Full-size creatures show Max HP and positive DEF/MDEF/ACC/EVA values only; their collector number is in the header. Other card types retain their existing footer format.
  - **Reusable Border Templates**: Grassland creatures and lands have vibrant **green outer and inner borders** (`#2d7a3e` outer frame, `#4ade80` inner trim, `tcg-template-grassland`); Forest lands have deep **emerald pine borders** (`#059669` outer frame, `#34d399` inner trim, `tcg-template-forest`); Stage 1 Boss has a radiant **gold metallic frame** (`tcg-template-boss`); Action cards have **crimson/ruby** (Attack, `tcg-template-attack`) and **azure/sapphire** (Defense, `tcg-template-defense`) frames; Item/Equipment cards have a rich **gold & bronze frame** (`tcg-template-item`).
  - **Card Inspection (Right-Click & 2s Long-Press)**: Right-clicking or holding down for 2 seconds on any card opens the Card Info Modal, showing the full physical print layout with exact tabletop stat scaling formulas (`Base + ⌊STAT / 2⌋`), live character calculations, full lore flavor text, monster cycling AI moves, and land board rules.
- **Audio State Machine & Looped Soundtrack Management**:
  - **Game State Audio Tracking**: `RunState` strictly tracks both `currentMusic` (`'start-screen' | 'map-area' | 'battle-normal' | null`) and `audioScene` / `audioState` (`'intro' | 'map' | 'battle' | 'none'`).
  - **Start Screen (`start-screen.mp3`)**: Plays on the welcome start screen in loop mode.
  - **Map Area (`map-area.mp3`)**: Starts on the character selection screen (`screen === 'class_select'`) and continues seamlessly into map navigation (`screen === 'play_area' && activeHook.type === 'NONE'`); stops immediately when exiting map navigation (entering battle, village, or shrine).
  - **Battle Normal (`battle-normal.mp3`)**: Plays when an encounter starts in loop mode (`activeHook.type === 'COMBAT'`); stops immediately when battle completes (victory, defeat, or stage completion). Returning to map navigation resumes `map-area.mp3`.
  - **Browser Audio & Autoplay Unlock (`src/audio/audioManager.ts`)**: Pure core logic in `src/core/audio.ts` calculates active track and scene. Browser audio elements, loop settings, mute toggling, volume clamping, and autoplay gesture unlock listeners are safely encapsulated in `AudioManager`.
- **Right Sidebar Decks & Discards & Multiplier Pile Modals**:
  - The right sidebar features dedicated interactive TCG card-pile controls for:
    1. **Adventure Deck & Discard**: Card counts and pile widgets for advancing through the pyramid path.
    2. **Monster Deck & Discard**: Hostiles drawn during tile encounters and defeated monsters.
    3. **Player Combat Deck & Discard**: Active draw deck and battle discard pile.
  - **Unique Card Multiplier Modals**: Clicking or right-clicking any pile opens a dedicated inspection modal that deduplicates the cards into unique cards with a prominent high-contrast multiplier badge (`&times; N`) indicating the exact quantity of each card inside that pile. Right-clicking or holding any unique card in the pile modal opens its full tabletop inspection sheet.
- **Official Raster RPG Icons System (`public/icons/`)**:
  - Sliced and extracted from the master fantasy sprite sheet `public/icons/icons.png` into 17 high-resolution raster icon PNGs with transparent anti-aliased rounded corners:
    1. **6 Base Stats**: `str.png`, `dex.png`, `agi.png`, `int.png`, `cha.png`, `luk.png` (160×164 rounded filigree badge).
    2. **6 Derived Stats**: `acc.png`, `eva.png`, `atk.png`, `def.png`, `matk.png`, `mdef.png` (160×164).
    3. **3 Item Slots**: `slot-weapon.png` (and `weapon.png`), `slot-armor.png` (and `armor.png`), `slot-accessory.png` (and `accessory.png`) (160×164).
    4. **2 Resources**: `sp.png` (sprouting green seal, 194×175) and `gold.png` (radiant gold coins, 194×175).
  - Encapsulated in typed UI helpers under `src/ui/icons.ts` (`getStatIcon`, `getDerivedStatIcon`, `getSlotIcon`, `getResourceIcon`).
  - Fully replaced raw Unicode emojis across the game: character stat panel, derived combat stat chips, gear and inventory slots, TCG card headers (Action Attack/Defense, Equipment Weapon/Armor/Accessory), monster reward lines, monster ACC/EVA chips, player combat line, attack confirmation popup calculations, top HUD resource bar, village rest, and shop catalogs.

## Draw-until and graveyard search invariant

- A spell/ability draw-until effect gets one bounded pass through the current deck; unmet conditions fizzle at exhaustion, without forcing an ineligible card or reshuffling mid-search. Successful draws on the last card still succeed; completed draws remain in effect.
- A new draw from an already empty deck reshuffles its graveyard first. Ordinary fixed-count draws retain normal recycling. A later independent draw may recycle after a search has fizzled.
- Encounter generation is a game mechanic: recycle the graveyard whenever another draw needs an empty deck and eligible supply remains. Preserve terrain-reject bottom placement and examine each card at most once per pass; over-level rejects go to discard. If a full pass leaves only incompatible terrain cards, stop without accessing the graveyard while the deck remains nonempty. If no eligible supply remains, retain partial encounters or resolve empty encounters without rewards, with normal stage-boss checks. Neither case is an ability fizzle.
- Graveyards are public and explicit searches fizzle immediately if no target exists (e.g. Leech with no Zombie). Deck order is hidden; catalog-sorted type/count inspection and card counting are allowed.

## Treasure level filtering and recycling

Village stock accepts only `item.level === village.level`. Wrong-level items, both lower and higher, go immediately to treasureDiscard and do not count toward the `5 + village level` stock target. Draw again until the target is filled, reshuffling the treasure graveyard whenever a further draw needs an empty deck.

Undiscovered terrain rewards use `item.level <= terrain.level` as a cap. A Level 2 Forest discovery accepts Level 1 or Level 2 items. If the last card is an invalid Level 3 item, discard it, reshuffle the treasure graveyard into the new deck, and continue drawing until a valid reward appears. This is a game mechanic, not a spell/attack fizzle. Starting with an empty Treasure Deck follows the same reshuffle rule.

Eligible physical copies are conserved; nothing is created to fill stock. If no matching supply exists anywhere in the deck/graveyard (for example no Level 3 items are currently defined, or all matching copies are already owned), stop safely with empty/partial stock or no reward rather than loop forever. This is unavailable supply, not ability failure. A village's stock is generated only once per visit, including empty stock; returning to its menu does not reroll it. The current item catalog has only Levels 1 and 2; Level 3 shops need corresponding content.

## Battle hand carousel and revised full-size creature template

The battle hand uses one centered, fully readable action card with dimmed flanking previews. Browse using chevrons, numbered selectors, Q/E keys, or horizontal swipes. Browsing updates existing nodes in place and never spends AP. Tapping the center card opens the existing confirmation; Flee occupies its own separate slot. A/D and left/right arrows retain enemy targeting. End Turn resets hand selection; selection clamps safely after playing a card. Empty hands retain End Turn. Inspect/confirmation overlays suspend hand navigation; reduced-motion settings disable transitions.

Full-size creature cards in battle and inspection share one header/footer template: first header line is level at left, CREATURE/BOSS CREATURE and subtype inline, with spawn icons at right. Second line holds the name at left and collector number at right. The rules textbox contains abilities and patterns without a duplicate derived-stat row. The bottom dock shows printed Max HP plus icon/value pairs only for positive DEF, MDEF, ACC and EVA; zero-valued combat stats are omitted. Live battle ACC/EVA include temporary buffs and highlight positive bonuses; HP/Block remain live in the external combat dock. Compact pile cards retain their simplified art-first template.

Stalker base EVA is 1. Sprint adds 1 EVA (total 2); an additional Skittish hit bonus raises that total for the current hero turn. Catalog tables have been regenerated.

## Witch and default creature rewards

Witch (`mon3smp-04`) is registered with Level 3 Swamp/Cave eligibility, 10 HP, 1 DEF, 3 MDEF, 1 EVA, 1 ACC, 4 SP and 8 Gold. It cycles Blinding Hex (-1 Hero EVA/ACC, 2 turns), Expose weakness (-1 Hero DEF/MDEF, 1 turn), then Smite (7 magical damage), and regenerates 1 HP at the end of each living turn, capped at Max HP. The Goblin King Stage 1 deck includes 1 Witch. See [exact timing](docs/MECHANICS_AND_DATA.md#witch--mon3smp-04).

Default creature rewards double at each level: factor `2 ** (level - 1)`, yielding `factor` SP and `2 * factor` Gold. Every current ordinary monster and boss uses this formula. A future exception requires an explicit reward override; existing boss rewards have been normalized to their levels.
