# Mechanics, Grid Math, Decks, Village, Shrines, Equipment & Combat Formulas

This document defines the exact rules, Base Stat + Class Bonus + Gear formulas, Base Stat upgrade costs at Shrines, 3-row pyramid vision cone, Adventure/Monster/Player decks, Village Menu (`Rest`, `Shop`, `Train`), Equipment Slots, Shrines, Hostile Level encounter budgets, Turn 15 Boss, and TypeScript interfaces for **The Paths We Choose**.

The Goblin King uses a **38-card ordinary Monster Deck**. Exact card quantities and creature data are in the generated [catalogs](CATALOGS.md#ordinary-monsters); collector IDs identify types and runtime IDs distinguish copies. Goblins include Swamp eligibility; Ramram is Grasslands-only. Bosses are separate.

---

## 1. Base Stats, Class Stat Bonuses, Equipment & Stat Evolution

### 1.1 No Character Levels — Stats Define Evolution
There is **no character level or XP bar**. Instead, a hero evolves directly by investing **Stat Points (`statPoints`)** into their **Base Stats** at **Shrines** and equipping gear in their **3 RPG Equipment Slots**.

Every attribute (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) is composed of four layers:
$$\text{Effective Stat} = \text{Base Stat} + \text{Class Stat Bonus} + \text{Blessing Bonus} + \text{Equipped Gear Bonus}$$

### 1.2 Starting Base Stats, Class Stat Bonuses & Hero Artwork
- **Collectible Adventurer Cards (`public/cards/adventurers/*.jpg`)**:
  - `fighter.jpg`: Veteran warrior in full armor in a tavern hall.
  - `wizard.jpg`: Arcane scholar channeling magical energy in a tower library.
  - `rogue.jpg`: Dual-dagger shadow blade in a vaulted stone cellar.
  - **Screen Integration**: Featured in the Class Selection 3-card carousel, the Character & Gear sidebar portrait, and the Combat Confirmation Target (Self) card.
- **Starting Base Stats (All Classes)**:
  $$\text{Base STR} = 1, \quad \text{Base DEX} = 1, \quad \text{Base AGI} = 1, \quad \text{Base INT} = 1, \quad \text{Base CHA} = 1, \quad \text{Base LUK} = 1$$
- **Primary & Secondary Archetypes**:
  - Each class features **1 Primary Stat** (`+2` bonus) and **2 Secondary Stats** (`+1` bonus each). All remaining stats receive `+0`.
- **Class Stat Bonuses & Effective Starting Stats**:

See the generated [Classes catalog](CATALOGS.md#classes) for exact bonuses, effective starting stats, HP, decks and passives.

### 1.3 Charisma (CHA) Goods Price Reduction Formula
Each point of Effective Charisma (`CHA`) reduces the purchase price of purchaseable goods in Village Shops by **5%**:
$$\text{Discount Rate} = \min(0.9, \text{Effective CHA} \times 0.05)$$
$$\text{Final Price} = \max\Big(1, \text{round}\big(\text{Base Price} \times (1 - \text{Discount Rate})\big)\Big)$$

- **Discount Examples**:
  - `1 CHA` (Fighter default): $5\%$ discount (e.g. 20g item costs 19g; 10g costs 10g).
  - `2 CHA` (Wizard default): $10\%$ discount (e.g. 20g item costs 18g; 10g costs 9g; 8g costs 7g).
  - `4 CHA`: $20\%$ discount (e.g. 20g item costs 16g; 10g costs 8g).

### 1.4 Starting 4 Stat Points & Welcome Preparation Dialog
- Players start every adventure with **4 Stat Points (`statPoints: 4`)**.
- On game start (Turn 0), players are greeted with a preparation modal dialog welcoming the adventurer and providing the exact same Stat Point converter widget used in Shrines.
- Players may immediately allocate their 4 SP toward Base Stats (e.g., upgrading Base STR from 1 to 2 costs 4 SP, immediately raising Effective STR and Max HP by +2) before stepping onto the path. Clicking **Begin Journey** closes the dialog.

### 1.5 Base Stat Upgrade Cost Formula: `(currentBaseStat + 1)²`
Players earn **Stat Points (`statPoints`)** inscribed directly on defeated Monster Cards.
- Base Stat upgrades can **only be performed at Shrines** (`hasShrine: true`) and during the initial **Welcome Preparation Dialog**. Outside of Shrines, the character sheet displays a read-only preview of what the next upgrade will cost.
- Only **Base Stats** are upgraded with Stat Points (Class Stat Bonuses and Gear Bonuses do not increase the upgrade cost!).
- To increase a **Base Stat** from current level `B` to `B + 1`, the required cost in Stat Points is computed as `(currentBaseStat + 1) multiplied by itself`:
  $$\text{Upgrade Cost}(B \to B + 1) = (B + 1)^2$$
- **Upgrade Cost Progression Table**:
  - `Base 1 -> Base 2`: costs **`4` Stat Points** ($2 \times 2 = 4$)
  - `Base 2 -> Base 3`: costs **`9` Stat Points** ($3 \times 3 = 9$)
  - `Base 3 -> Base 4`: costs **`16` Stat Points** ($4 \times 4 = 16$)
  - `Base 4 -> Base 5`: costs **`25` Stat Points** ($5 \times 5 = 25$)
  - `Base 5 -> Base 6`: costs **`36` Stat Points** ($6 \times 6 = 36$)
- *Note on `STR` Upgrades*: Whenever Effective `STR` increases by `+1` (via Base Stat upgrade, Blessing, or equipping a `+STR` item), both `maxHp` and `hp` increase by **`+2 HP`**.

### 1.6 Automatic Sacred Shrine Boons & Single Blessing Invariant (Map-Temporary)
Visiting a Sacred Shrine automatically bestows a random eligible divine boon upon the adventurer upon arrival (no manual prayer button required).

> [!IMPORTANT]
> **Single Active Blessing Invariant**: The adventurer can have only **1 shrine blessing active at a time**. Receiving a new blessing automatically replaces and eliminates the previous blessing (resets any previous blessing stat bonuses or divine protection and resyncs vitals).
>
> **Map Duration**: Both **Stat Blessings** and **Divine Protection** last exclusively for the current map. When the Turn 15 Boss is defeated and the stage is completed, `clearMapBlessings(state)` resets `playerBlessingBonuses` to zero, clears `activeBlessingId`, and removes `divineProtection` before entering the next map.
>
> **Stat Info Inspection in Shrines**: Right-clicking (or contextmenu / long-press / clicking `ⓘ`) on any stat option in the shrine converter widget opens the dedicated Stat Info Modal displaying complete computation breakdowns, scaling formulas, and next SP costs.

| Boon ID | Name | Eligibility Condition | Effect (Current Map Only) |
| :--- | :--- | :--- | :--- |
| `cleanse` | **Cleanse** | Player has at least 1 negative status (`statusEffects.length > 0`) | Removes all active negative status effects (`poison`, `blindness`, `crippled`). |
| `blessing_str` | **Blessing of Strength** | None (always eligible) | `playerBlessingBonuses.str += 1` for this map (`+2 Max HP` & scales Melee/Shield). |
| `blessing_dex` | **Blessing of Dexterity** | None (always eligible) | `playerBlessingBonuses.dex += 1` for this map (ACC increases only when the +1 DEX crosses the next even value). |
| `blessing_agi` | **Blessing of Agility** | None (always eligible) | `playerBlessingBonuses.agi += 1` for this map (EVA increases only when the +1 AGI crosses the next even value). |
| `blessing_int` | **Blessing of Intelligence** | None (always eligible) | `playerBlessingBonuses.int += 1` for this map (scales Fireball & Force Field). |
| `blessing_cha` | **Blessing of Charisma** | None (always eligible) | `playerBlessingBonuses.cha += 1` for this map (additional 5% shop discount). |
| `blessing_luk` | **Blessing of Luck** | None (always eligible) | `playerBlessingBonuses.luk += 1` for this map (bonus combat Gold rewards). |
| `divine_protection` | **Divine Protection** | None (always eligible) | Reduces incoming monster attack damage by `1` for the current map; poison bypasses it. |
| `revitalize` | **Revitalize** | Current `hp < maxHp` | Restores current HP to `maxHp` immediately. |

---

## 2. Classic RPG Equipment Slots & Village Shop Catalog

### 2.1 Village Rest Cost Formula & Resting Eligibility
Resting at the Village inn restores HP to full (`hp = maxHp`) and cleanses all negative status ailments (`statusEffects = []`) at a cost based on missing HP:
$$\text{Missing HP} = \max(0, \text{maxHp} - \text{hp})$$
$$\text{Rest Cost} = 5 + \left\lfloor \frac{\text{Missing HP}}{10} \right\rfloor \text{ Gold}$$

- **0 - 9 Missing HP**: costs **`5 Gold`**
- **10 - 19 Missing HP**: costs **`6 Gold`**
- **20 - 29 Missing HP**: costs **`7 Gold`**

#### Resting Eligibility Rules:
1. **Disabled on Full Health without Ailments**: If `hp >= maxHp` and `statusEffects.length === 0`, resting is disabled.
2. **Enabled on Full Health with Ailments**: If the player is on full health but has active negative ailments (e.g. poison, blindness, crippled), resting is enabled (for `5 Gold`) to cure those ailments.
3. **Insufficient Gold**: If `gold < Rest Cost`, resting is disabled.

### 2.2 Equipment Slots (`Weapon`, `Armor`, `Accessory`), Permanent Backpack & Map Gear Management
The player's inventory is structured into:
1. **3 Equipment Slots** (`equippedGear`):
   - `weapon`: `ShopItemDef | null` (max 1 equipped)
   - `armor`: `ShopItemDef | null` (max 1 equipped)
   - `accessory`: `ShopItemDef | null` (max 1 equipped)
   - **Unequip Action**: Players can click `Unequip` on any filled slot while on the map to return the equipped item to `backpack` and dynamically recalculate stats and vitals.
   - Equipping a new item into an occupied slot moves the previously equipped item into the player's `backpack` (where it can be re-equipped later or sold at a Village Shop for `50%` Gold).
2. **Permanent Backpack Section (`backpack`)**:
   - The character sidebar permanently displays `🎒 Backpack (${backpack.length})`, listing all unequipped gear cards and consumables.
   - Items in the backpack can be equipped (`Equip {item}`) or used (`Use {item}`) anytime while on the map.
   - **Combat Lock**: Equipping and unequipping items is strictly disabled while in active combat (`activeHook.type === 'COMBAT'`).
   - **Vital Synchronization**: Modifying equipment that affects Base or Effective STR dynamically updates Max HP (`10 + STR * 2`) and clamps current HP.

### 2.3 Stat Panel Streamlining & Right-Click Stat Info Modal
To keep the character sidebar uncluttered, stat rows display only essential attributes:
- `Stat Icon`, `STAT`, `Effective Value`, and `(base + class)` breakdown. The `next: X SP` label is removed from the rows.
- **Dedicated Stat Info Modal**: Right-clicking (or holding for 1s on touch, or clicking `ⓘ`) on any stat row opens the modal displaying:
  1. **Effective Stat Breakdown**: `Effective Stat = Base + Class Archetype Bonus + Shrine Blessing + Equipped Gear`.
  2. **Derived Bonus Stats & Scaling Rules**: Live player values and exact tabletop formulas (Max HP, ATK, DEF, ACC, EVA, MATK, MDEF, CHA discount, LUK spoils).
  3. **Shrine Upgrade Evolution Box**: Target Base level, `(currentBase + 1)²` SP formula, player's current SP balance, and ready/needed status chip. Upgrades are performed at Shrines or during Turn 0 preparation.

### 2.2 Village Shop Inventory Visibility, Treasure Deck & Live Comparison Preview
When entering the Village Shop:
- **Treasure Deck & Stock Draw**: Stores no longer offer the entire item catalog. At game start, a **28-card Treasure Deck** is built from 2 copies of each catalog item and shuffled. Opening a Village Shop draws **`5 + Village Level` item cards** (e.g. 6 cards in a Level 1 Village) from the top of the Treasure Deck into `shopStock`.
- **Card Art on Options**: Every option in the shop options list displays its standard 5:7 raster card artwork (`/cards/items/*.jpg`), level badge, slot icon, and description.
- **Unbought Card Discard**: Upon leaving or completing the village visit, remaining unbought cards in `shopStock` are automatically swept into `treasureDiscard`.
- **Selling Items**: Selling gear moves the sold item card to `treasureDiscard`.
- **Endless Reshuffle**: When the Treasure Deck is exhausted, `treasureDiscard` is shuffled to form the new Treasure Deck.
- The player directly sees their **3 Equipment Slots**, current backpack items, and effective stats.
- For each item available for purchase or sale, the UI runs `previewGearChange(state, slot, item)`:
  - Displays which slot the item belongs to.
  - Shows which currently equipped item it will replace.
  - Renders live stat comparison chips: e.g. `STR 4 -> 5 (+1)`, `Max HP 18 -> 20 (+2)`.
- **Submenu Reversibility**: The player can return from Shop or Train back to the Village Menu via `<- Back to menu` **as long as no action has been finalized**. Once an item is bought or sold, or a card is drafted/removed, the back button is disabled and the player must finish their visit.

### 2.3 Village Shop Catalog (14 Physical TCG Items, Levels 1 and 2)

Adventurers start every adventure with **`20 Gold`**. All items feature dedicated standard 5:7 physical card raster paintings in `/cards/items/*.jpg` and can be inspected via right-click or long-press.

See the generated [Shop and Treasure catalog](CATALOGS.md#shop-and-treasure) for all 14 items, levels, canonical names, prices and bonuses.

### 2.4 Derived Combat Stat Formulas
- **Physical ATK**: $\text{Hero ATK} = \lfloor \text{Effective STR} / 2 \rfloor + \lfloor \text{Effective DEX} / 3 \rfloor + \text{gear.atk}$
- **Physical DEF**: $\text{Hero DEF} = \lfloor \text{Effective STR} / 5 \rfloor + \lfloor \text{Effective AGI} / 3 \rfloor + \text{gear.def}$
  - When non-magical monster physical attacks hit, damage is reduced by: $\max(0, \text{baseDamage} - \text{Hero DEF} - \text{Divine Protection})$
- **Magical ATK (MATK)**: $\text{Hero MATK} = \lfloor \text{Effective INT} / 2 \rfloor + \text{gear.matk}$
- **Magical DEF (MDEF)**: $\text{Hero MDEF} = \lfloor \text{Effective INT} / 5 \rfloor + \text{gear.mdef}$
- **Hero ACC**: $\text{Hero ACC} = \lfloor \text{Effective DEX} / 2 \rfloor$
- **Hero EVA**: $\text{Hero EVA} = \lfloor \text{Effective AGI} / 2 \rfloor + \text{gear.eva} + \text{temporaryBonusEVA}$

---

## 3. Player Combat Deck & Stat-Scaling Action Cards

### 3.1 Starter & Village-Trainable Combat Cards
Every card dynamically scales with the player's **Effective Stats** (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`).
Starting effective stats (before preparation upgrades, gear, or blessings) are `Fighter: STR 3, DEX 2, AGI 2, INT 1, CHA 1, LUK 1 -> 1 ACC, 1 EVA`; `Wizard: STR 1, DEX 2, AGI 1, INT 3, CHA 2, LUK 1 -> 1 ACC, 0 EVA`; `Rogue: STR 2, DEX 2, AGI 3, INT 1, CHA 1, LUK 1 -> 1 ACC, 1 EVA`. Each has a 10-card starter deck as listed in section 1.2:

Base card fields, class train pools and starter lists are in [CATALOGS.md](CATALOGS.md#combat-cards). The data fields are not complete effective damage formulas:

- Damage = baseDamage + floor(effective scaling stat / divisor), if damage is positive and a scaling stat exists. Default divisor is 2.
- STR-scaled damage additionally adds floor(DEX/3), gear.atk and applicable Fighter Berzerk bonus.
- INT-scaled damage additionally adds gear.matk. Hero INT-scaled attacks use target MDEF; other attacks use target DEF.
- Block = baseBlock + floor(effective block scaling stat / divisor), when present. Gear DEF/MDEF reduce incoming damage; they do not directly add card Block.
- EVA card effects grant the flat evasionMultiplier (default 1) when evasionScalingStat is present; they do not multiply by the attribute value.
- Damage is then multiplied for a critical hit using floor(damage×1.5), then reduced by the appropriate target defense and Block. No minimum +1 critical-damage exception applies.

### 3.2 Tabletop 2d6 Combat Resolution & Formulas
Combat uses **2x 1d6 (2d6)** dice rolls rather than 1d20:
- **Base Hit Threshold**: `7`. Rolling 7 or higher hits; 6 or lower misses.
- **Snake Eyes (`1 + 1 = 2`)**: Total miss (always misses, regardless of accuracy).
- **Boxcars (`6 + 6 = 12`)**: Critical hit; applies **+50% bonus ATK damage** ($\lfloor \text{damage} \times 1.5 \rfloor$).
- **ACC & EVA Scaling**:
  - `Player ACC` = `floor(DEX/2)` + `cardAccBonus` + temporary ACC modifiers (e.g. `Melee ATK` adds `+1 ACC`).
  - `Player EVA` = $\lfloor \text{AGI} / 2 \rfloor + \text{gear.eva} + \text{roundBonusEVA}$.
  - `Net ACC` = $\text{Attacker ACC} - \text{Target EVA}$.
  - Target roll needed to hit: $\text{neededRoll} = 7 - \text{Net ACC}$. (e.g. 3 ACC vs 2 EVA = +1 Net ACC, hits on 6+).
- **Combat Pre-Play Confirmation Modal**:
  - Clicking any playable card from hand opens a confirmation modal before any AP or action is committed:
    - **Source & Target Comparison**: Displays the action card and target (creature or hero) side-by-side with an arrow flow (`Use {card} on {target}`).
    - **Attack Math Breakdown**: Displays Hero ACC (DEX + card bonus), Target EVA, Net ACC modifier, needed roll on 2d6, and exact hit probability percentage calculated over the 36 combinations (accounting for Snake Eyes auto-miss and Boxcars auto-crit).
    - **Direct Target Switching**: When facing multiple enemies, players can click monster chips inside the popup to switch target and preview live math differences before hitting **Confirm**.
    - **Confirm & Cancel Controls**: AP is only spent upon clicking `Confirm Use (X AP)`; clicking `Cancel`, backdrop, or pressing `Escape` cancels without spending AP.

---

## 4. Stage 1 Monster Deck (38 Hostiles) & Turn 15 Boss

### 4.1 Monster Deck (`38` Cards)

The complete generated [Ordinary Monsters catalog](CATALOGS.md#ordinary-monsters) contains all 15 types and 38 Stage 1 copies, with collector IDs, runtime template IDs, creature types, MDEF, rewards, terrain eligibility, patterns and ability descriptions. It includes Leech, Creeper, Assasin, Stalker and Witch. The sections below specify their timing; edit catalog values in src/data/monsters.ts and regenerate documentation.

### 4.2 Turn 15 Stage 1 Boss Card
When the player reaches **Turn 15**, after resolving Row 15's tile, the **Stage 1 Boss** appears:

See the generated [Bosses catalog](CATALOGS.md#bosses) for exact boss stats and rewards. Bosses are separately spawned and do not occupy ordinary deck slots.

### 4.3 Official Standard TCG Card Architecture (MTG & Pokémon Inspired)

Every Monster and Combat Action card adheres to standard physical collectible card game specifications:

1. **Official Standard TCG Sizing**:
   - Strictly conforms to the standard official physical card aspect ratio of **5:7** (equivalent to **2.5 inches × 3.5 inches** / 63.5 mm × 88.9 mm).
   - All card types maintain this exact aspect ratio across desktop and mobile viewports (`aspect-ratio: 5 / 7`).
2. **Reusable Card Border Templates**:
   - **Grassland Creatures (`tcg-template-grassland`)**: Vivid emerald/forest green gradient frame (`#184224` to `#0c2613`, border `#2d7a3e`, inner glow `#4ade80`), stone header banner, and dark green slate textbox.
   - **Boss Creatures (`tcg-template-boss`)**: Radiant metallic gold frame (`#4d380e` to `#201704`, border `#f59e0b`, inner glow `#fef08a`), dragon filigree header, and royal obsidian textbox.
   - **Attack Action Cards (`tcg-template-attack`)**: Crimson/ruby frame (`#dc2626` border with `#f87171` inner glow) with top-left AP mana gem socket.
   - **Defense Action Cards (`tcg-template-defense`)**: Azure/sapphire frame (`#0284c7` border with `#38bdf8` inner glow) with top-left AP mana gem socket.
3. **Full-Bleed Raster Art Layer**:
   - Creature and action illustrations are high-resolution digital raster art paintings loaded on top of the card template (`/cards/creatures/*.jpg`, `/cards/actions/*.jpg`).
   - Dynamic overlays sit directly above the art window: `Shield` overlay (`🛡️ X Block`), glowing `TARGET` badge, and `DEFEATED` banner.
4. **Header (Ample Space for Full Names)**:
   - Top row: Level at left, inline CREATURE/BOSS CREATURE and subtype, spawn icons at right.
   - Second row: Card name at left and collector number at right.
   - Right: **Spawn Terrain Icons** (`Grasslands 🌿` and `Forest 🌲`).
   - *Note*: No HP pill is placed in the header to ensure maximum name space; creature HP is displayed in the footer and the combat status dock.
5. **Card Type Line & Inscribed Rewards**:
   - The compact first header row displays level, type/subtype and spawn terrains.
   - Upper-left of artwork displays floating inscribed rewards (`+X Gold`, `+X SP`) with raster icons.
   - Above the card frame floats the **Target Pill (`🎯 TARGET (Roll X+)`)** when targeted.
6. **Description / Text Area**:
   - Semi-transparent frosted glass text box displaying:
     - **Cyclic Attack Pattern Table**: Turn-by-turn move list (`Turn 1: Slash (3 DMG)`).
     - **Abilities**: Monster passive or special traits (e.g. *Warlord's Guard*).
     - No duplicated derived stats appear in the textbox; positive combat stats are in the footer. Monster damage comes from attack patterns, with no separate ATK stat.
7. **Interactive Combat Status Dock (`.creature-combat-dock`)**:
   - Positioned below creature cards in battle:
     - `NEXT:` upcoming attack intent label, damage, and block.
     - `HP:` live `${hp} / ${maxHp} HP` progress bar with block shield indicator.
8. **Card Footer**:
   - Left: Printed `HP {maxHp}`.
   - Right: Icon/value pairs for positive DEF, MDEF, ACC and EVA only. Collector number is in the header.
9. **Right-Click & Long-Press (2s) Card Info Modal (Offline Play Reference)**:
   - Right-clicking or holding for 2 seconds on any card opens the high-resolution Card Detail Modal.
   - Designed for physical print verification: displays the full physical card alongside exact **Tabletop Stat Scaling Formulas** (e.g., `Base 2 DMG + ⌊STR / 2⌋`), live character sheet calculations (e.g., `2 + ⌊4 / 2⌋ = 4 DMG`), cycling monster AI patterns, and complete flavor lore.

---

## 5. Stages, Adventure Decks, Shrines & Encounter Cards

### 5.1 Card Numbering & Catalog Architecture
All 15 Adventure Cards follow a strict, standardized collector card numbering scheme starting with `adv`:
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

**Deck Viewer Ordering Invariant**: Cards in the Deck Viewer modal are strictly ordered by `cardNumber` matching the exact sequence above.

### 5.2 Stage 1: "The Goblin King" Deck Composition (30 Land Cards)
- `advgrs-00` (Undiscovered Grassland LVL1) &times; 3
- `advgrs-01` (Grassland Encounter LVL2) &times; 5
- `advgrs-02` (Grassland Encounter LVL3) &times; 3
- `advgrs-03` (Grassland Village LVL1) &times; 3
- `advgrs-04` (Grassland Shrine LVL1) &times; 3
- `advfrs-00` (Undiscovered Forest LVL2) &times; 2
- `advfrs-01` (Forest Encounter LVL3) &times; 3
- `advfrs-02` (Forest Encounter LVL4) &times; 2
- `advfrs-03` (Forest Village LVL2) &times; 2
- `advfrs-04` (Forest Shrine LVL2) &times; 2
- `advsmp-00` (Undiscovered Swamp LVL3) &times; 1
- `advsmp-01` (Swamp Encounter LVL4) &times; 1
- `advsmp-02` (Swamp Encounter LVL5) &times; 0
- `advsmp-03` (Swamp Village LVL3) &times; 0
- `advsmp-04` (Swamp Shrine LVL3) &times; 0
- **Total**: 30 cards. Turn 15 Boss: **Goblin Chieftain**.

### 5.2.1 Undiscovered Terrains & Exploration Mechanics
Stepping onto an undiscovered card (`advgrs-00`, `advfrs-00`, or `advsmp-00`) triggers a `1d6` roll:
- **Combat (`roll <= card.level`)**: Enemy ambush! Battle starts drawing hostiles matching the card's terrain and level.
- **Treasure (`roll === 6`)**: Secret cache found! Cards are drawn from the Treasure Deck until an item with `item.level <= card.level` is found (higher level items are discarded to `treasureDiscard`). The found item is added directly to the player's backpack.
- **Safe (`other rolls`)**: Calm passage through the wilderness without hostiles or loot.

### 5.3 Stage 2: "Cult of Trolls" Deck Composition & 3-Boss Encounter (30 Land Cards)
- `advgrs-00` (Undiscovered Grassland LVL1) &times; 0
- `advgrs-01` (Grassland Encounter LVL2) &times; 0
- `advgrs-02` (Grassland Encounter LVL3) &times; 2
- `advgrs-03` (Grassland Village LVL1) &times; 0
- `advgrs-04` (Grassland Shrine LVL1) &times; 0
- `advfrs-00` (Undiscovered Forest LVL2) &times; 2
- `advfrs-01` (Forest Encounter LVL3) &times; 6
- `advfrs-02` (Forest Encounter LVL4) &times; 3
- `advfrs-03` (Forest Village LVL2) &times; 3
- `advfrs-04` (Forest Shrine LVL2) &times; 3
- `advsmp-00` (Undiscovered Swamp LVL3) &times; 1
- `advsmp-01` (Swamp Encounter LVL4) &times; 4
- `advsmp-02` (Swamp Encounter LVL5) &times; 2
- `advsmp-03` (Swamp Village LVL3) &times; 2
- `advsmp-04` (Swamp Shrine LVL3) &times; 2
- **Total**: 30 cards.
- **Turn 15 Boss: Cult of Trolls (3 Trolls Active Simultaneously)**:
  1. **Troll Healer** (20 HP, 1 DEF, 2 ACC, 0 EVA): Casts *Troll Mending* each round, restoring 10 HP to a random living damaged troll.
  2. **Troll Hexer** (20 HP, 1 DEF, 2 ACC, 0 EVA): Casts *Troll Hex* each round, inflicting a random 1-turn debuff on the hero:
     - Roll 1: Hero loses 1 ACC (`-1 ACC` on attack hit checks).
     - Roll 2: Damage hero takes increases by 1 (`+1 DMG taken` from incoming monster attacks).
     - Roll 3: Hero EVA is reduced by 1 (`-1 EVA` on monster attack rolls).
  3. **Troll Warrior** (24 HP, 1 DEF, 3 ACC, 0 EVA): Attacks hero for 6 DMG each round with *Troll Smash*.

### 5.2 Encounter Level & Terrain-Aware Spawning Formula
When the player steps on an Encounter card:
- The card's `level` specifies the encounter budget:
  $$\sum_{m \in \text{battleArea}} m.\text{level} \ge \text{card}.\text{level}$$
- Monster draws are strictly filtered to match the encounter's terrain:
  $$\text{monster}.\text{spawnTerrains}.\text{includes}(\text{card}.\text{terrain})$$
- Eligible creature types are defined by each catalog row's spawnTerrains. See [CATALOGS.md](CATALOGS.md#ordinary-monsters); Ramram is Grasslands-only, Goblin includes Swamp, and Stalker includes Grasslands/Forest. Cave and Underground are creature spawn tags, not current map biomes.
- **Creature Draw Rule**: When drawing monster cards for an encounter, if the monster LVL drawn is higher than the LVL of the encounter (`monster.level > encounterLevel`), it goes straight into the monster discard pile.
- Incompatible terrain monsters drawn go back to the **bottom of the monster deck immediately instead of the discard pile**.
- In an encounter with Level 2 budget, monsters draw until total level $\ge 2$ (e.g. 2 Level 1 monsters or 1 Level 2 monster like `Basilisk`, `Zombie`, or `Rattler`). In an encounter with Level 3 budget (e.g. `advfrs-01` Forest; Swamp encounter cards start at Level 4), monsters draw until total level $\ge 3$ (e.g. 1 Level 3 `Bullwark`, or 1 Level 2 + 1 Level 1, or 3 Level 1 monsters).
- All monsters in the battle area fight together. On the enemy turn, each living monster executes its intent. The player designates which monster to target with Attack cards.
- **3D Monster Carousel (Single-Row Targeting for 3+ Opponents)**:
  - When 3 or more monsters are active simultaneously, opponents are displayed in a 3D perspective carousel (`.monster-carousel-track`) with the active target at center (`.is-center`, `scale(1.02)`, glowing gold border `#fbbf24`), flanked by adjacent living hostiles (`.is-prev` at `-175px` and `.is-next` at `+175px`, `scale(0.82)`, `opacity: 0.62`, clickable).
  - Prevents multi-row wrapping and screen breaking.
  - Traverse targets with `A` / `D` or `ArrowLeft` / `ArrowRight` keyboard shortcuts, touch chevrons (`.monster-carousel-nav`), or tapping any flanking monster directly.
  - Guidance text: *"Traverse targets with A or D. You can also use the LEFT and RIGHT keys. Tap a monster to target it with attacks."*
- Rewards: Winning awards the sum of all inscribed `Stat Point Bonuses` and `Gold` from every defeated monster.

### 5.3 3-Row Pyramid Vision Cone & Lagging Discard
- `Row R`: Player's current card `(C, R)` + lagging `unchosen`/`unreachable` cards on Row `R`.
- `Row R + 1`: `2` selectable forward choices `(C - 0.5, R + 1)` and `(C + 0.5, R + 1)` + `1` far-side `unreachable` card.
- `Row R + 2`: `3` newly drawn lookahead cards `(C - 1.0, R + 2)`, `(C, R + 2)`, and `(C + 1.0, R + 2)`.
- **Lagging Row Discard**: Moving to `Row R` sweeps only `Row R - 1` into `adventureDiscard` (keeping up to **9 Adventure Cards** on the board at once). When `adventureDeck` hits `0`, `adventureDiscard` is shuffled into `adventureDeck`.

---

## 6. Core TypeScript Data Schemas

The canonical data contracts are [src/core/types.ts](../src/core/types.ts). Do not maintain a second schema copy here. These include six CharacterStats attributes; ClassId for Fighter/Wizard/Rogue; physical and magical intents; MDEF; poison and DEF piercing; drain and revival metadata; Resilient; timed ACC/EVA buffs; Skittish; all active hooks and four deck systems.

Adventure TerrainType is start/grasslands/forest/swamp. Monster spawnTerrains is a separate string-tag list that also supports Cave and Underground; these tags do not create adventure tiles. Core logTimestamp is an optional explicit input supplied by the application clock for deterministic logging. Legacy prayer fields are retained for compatibility but do not define the current Shrine flow.

---

## 15. Audio State Machine Specification

| Scene (`audioScene`) | Trigger Condition | Active Music Track (`currentMusic`) | Loop | Exit Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `intro` | `screen === 'welcome'` | `start-screen` (`/audio/start-screen.mp3`) | Yes | Turns off immediately when moving to `class_select`. |
| `none` | Village / Shrine / Exploration / Victory / GameOver / StageComplete | `null` | N/A | Audio is stopped / silent. |
| `map` | `screen === 'class_select'` or (`screen === 'play_area'` && `activeHook.type === 'NONE'`) | `map-area` (`/audio/map-area.mp3`) | Yes | Stops when exiting map navigation (to combat, village, or shrine). |
| `battle` | `screen === 'play_area'` && `activeHook.type === 'COMBAT'` | `battle-normal` (`/audio/battle-normal.mp3`) | Yes | Stops when combat completes (victory, defeat, stage clear). |


## Leech — mon3smp-01

The Goblin King monster deck: 1 copy. Rewards: 8 SP and 16 Gold. Artwork: `/cards/creatures/leech.jpg`. Level 4; Swamp and Cave; 10 HP, 1 DEF, 2 EVA, 2 ACC, 3 MDEF.

Alternates Soul Drain (6 magical damage, using the universal 2d6 attack roll) and Channel (+2 HP capped at Max HP, +2 Block). Soul Drain uses Hero MDEF instead of DEF; Divine Protection and Block still apply. It heals half the actual HP lost by the hero, rounded down and capped at Leech Max HP; misses and fully absorbed hits heal nothing. Hero INT-scaled spell attacks use monster MDEF (default 0) instead of DEF; other attacks use DEF.

Each living Leech tracks its own completed Channel count. Every third Channel (normally monster turns 6, 12, 18...) removes the first Zombie card from `monsterDiscard` and returns that same card/instance to battle at full HP, starting Block, and pattern index 0. It first acts on the next monster turn. No Zombie means no revival; the next opportunity remains the next third Channel. Dead Leeches do not Channel. Multiple Leeches consume distinct available discard cards. Revived Zombies participate in ordinary targeting, victory rewards, and final discard handling.

## Creeper — mon3smp-02

The Goblin King monster deck: 1 copy. Rewards: 4 SP and 8 Gold. Artwork: `/cards/creatures/creeper.jpg`. Level 3; Swamp only; 12 HP, 2 DEF, 0 EVA, 1 ACC, 1 MDEF.

Alternates Submerge (regain 3 HP, capped at Max HP; gain 3 Block) and Ambush (7 physical damage, universal 2d6 attack check; reduced by Hero DEF rather than MDEF, then Divine Protection and Block).

Resilient is a declarative on-defeat ability. After each lethal hero attack, consume one seeded 1d6 roll before victory, rewards, or discard resolution. On 6, Creeper returns immediately at 6 HP with no Block, preserving its pattern position. Otherwise it remains defeated. This can trigger again on each subsequent defeat; misses and nonlethal hits do not roll. The revived creature retains its card identity, remains targetable, and prevents victory until finally defeated. Logs show the die result and whether it revived. No extra card or reward is created by resurrection.

## Assasin — mon3smp-03

Display name Assasin, using the supplied artwork `/cards/creatures/assasin.jpg`. Level 3; Swamp, Cave, Underground; 10 HP, 1 DEF, 3 EVA, 2 ACC, 1 MDEF. The Goblin King monster deck: 1 copy; Rewards: 4 SP and 8 Gold.

Alternates Poison Dart (3 physical damage ignoring up to 3 Hero DEF; universal 2d6 attack check, applies poison on hit) and Piercing Strike (7 physical damage, ignores up to 2 Hero DEF). Piercing cannot reduce effective DEF below 0; MDEF does not absorb it. Divine Protection and Block still apply. Poison application requires a successful hit, including critical hits, and does not require HP damage or bypass the hit check.

Poison is a single non-stacking persistent status. At the hero's next and every subsequent combat End Turn, before monsters act, it deals 1 HP damage, bypassing DEF/MDEF, Divine Protection, and Block. New poison applied during the monster turn first ticks on the next hero End Turn. It persists across battles until cleansed by a shrine or village rest; map movement alone does not tick poison. Lethal poison ends the run before monsters act or RNG advances. The combat hero panel and log show poison and its damage.

Underground is recognized as a creature spawn tag and visible badge; no Underground adventure tiles are introduced by this catalog entry.

## Stalker — mon1grs-06

Level 2; Grasslands and Forest; 8 HP, 0 DEF, 1 EVA, 1 ACC. Artwork: `/cards/creatures/stalker.jpg`. The Goblin King monster deck includes 1 copy; Rewards: 2 SP and 4 Gold.

Alternates Sprint (+1 EVA and +1 ACC for 2 turns) and Pounce (6 physical damage with a normal 2d6 hit check). Sprint applies during its monster turn and lasts through the next Pounce and the following hero action turn; it expires at the start of the monster turn after that. A new Sprint refreshes the bonuses without stacking. Existing one-turn creature buffs retain their original duration.

Skittish: each successful hit against a living Stalker immediately grants +1 EVA for the rest of the current hero turn. Repeated hits add another +1 each; fully blocked hits still trigger it, misses do not. The incoming attack rolls against EVA before its own Skittish bonus. All Skittish bonuses expire at hero End Turn, independently of Sprint. Lethal hits do not buff a dead creature. Live card stats, target roll labels, and confirmation odds include current EVA bonuses.

Creature types: **Leech — Undead**, **Creeper — Undead**, **Assasin — Human**, **Rattler — Reptile**. These catalog types appear on cards and in inspection and pile views.

## Deck searches, fizzle and public graveyards

A spell or ability with a **draw-until** effect draws from the top and stops immediately when its condition is met. If it reaches the end of the current deck without meeting the condition, the unfinished effect fizzles. It never forces an ineligible card, loops through the same cards indefinitely, or searches a nonempty deck's graveyard for a replacement. Drawing the last card successfully is still a success.

If the effect starts by needing a draw from an already empty deck, reshuffle that deck's graveyard once to form its new deck, then perform one bounded pass. If that new deck also cannot meet the condition, fizzle; do not reshuffle again inside the same search. A later independent draw from an empty deck can reshuffle normally. Ordinary fixed-count draws (e.g. shop stock or combat hands) still reshuffle whenever another card is needed and the draw pile is empty.

Keep completed draws and their consequences if an ability cannot be fully completed. Encounter generation, treasure discovery and shop stocking are game mechanics rather than ability searches: recycle when another draw needs an empty deck, continuing until the budget, reward or stock target is filled while eligible physical supply remains. Encounter recycling never introduces an incompatible-terrain or over-level creature. If no further eligible creature can be drawn, fight any creatures already selected; if none were selected, resolve the tile without combat or victory rewards and preserve Turn 15 boss triggering. This is unavailable eligible supply, not ability fizzle.

Monster terrain rejects retain the existing bottom-of-deck rule. To prevent cycling, a search examines each card present at the start of its pass at most once, including cards put on the bottom. Over-level monsters are discarded as before. If an encounter pass ends with only incompatible terrain cards still in the deck, stop; do not reshuffle or draw from its graveyard while the physical deck remains nonempty. A physically emptied encounter deck may recycle its graveyard if it contains a creature matching both terrain and the encounter level cap. Rejected cards can appear in that new shuffled deck, but each pass is bounded. Spell/ability searches never revisit rejected cards during that effect.

Graveyards/discard piles are public and may be inspected or searched when an ability explicitly permits it. Leech searches monsterDiscard for one Zombie: if absent, the revival portion fizzles immediately and battle continues; no draw or reshuffle is involved. Deck order stays hidden. Players may inspect potential card types and counts through catalog-sorted pile views, but cannot choose or search a hidden draw position. Card counting is allowed.


## Treasure level filtering and recycling

Village stock accepts only `item.level === village.level`. Wrong-level items, both lower and higher, go immediately to treasureDiscard and do not count toward the `5 + village level` stock target. Draw again until the target is filled, reshuffling the treasure graveyard whenever a further draw needs an empty deck.

Undiscovered terrain rewards use `item.level <= terrain.level` as a cap. A Level 2 Forest discovery accepts Level 1 or Level 2 items. If the last card is an invalid Level 3 item, discard it, reshuffle the treasure graveyard into the new deck, and continue drawing until a valid reward appears. This is a game mechanic, not a spell/attack fizzle. Starting with an empty Treasure Deck follows the same reshuffle rule.

Eligible physical copies are conserved; nothing is created to fill stock. If no matching supply exists anywhere in the deck/graveyard (for example no Level 3 items are currently defined, or all matching copies are already owned), stop safely with empty/partial stock or no reward rather than loop forever. This is unavailable supply, not ability failure. A village's stock is generated only once per visit, including empty stock; returning to its menu does not reroll it. The current item catalog has only Levels 1 and 2; Level 3 shops need corresponding content.

## Battle hand carousel and revised full-size creature template

The battle hand uses one centered, fully readable action card with dimmed flanking previews. Browse using chevrons, numbered selectors, Q/E keys, or horizontal swipes. Browsing updates existing nodes in place and never spends AP. Tapping the center card opens the existing confirmation; Flee occupies its own separate slot. A/D and left/right arrows retain enemy targeting. End Turn resets hand selection; selection clamps safely after playing a card. Empty hands retain End Turn. Inspect/confirmation overlays suspend hand navigation; reduced-motion settings disable transitions.

Full-size creature cards in battle and inspection share one header/footer template: first header line is level at left, CREATURE/BOSS CREATURE and subtype inline, with spawn icons at right. Second line holds the name at left and collector number at right. The rules textbox contains abilities and patterns without a duplicate derived-stat row. The bottom dock shows printed Max HP plus icon/value pairs only for positive DEF, MDEF, ACC and EVA; zero-valued combat stats are omitted. Live battle ACC/EVA include temporary buffs and highlight positive bonuses; HP/Block remain live in the external combat dock. Compact pile cards retain their simplified art-first template.

Stalker base EVA is 1. Sprint adds 1 EVA (total 2); an additional Skittish hit bonus raises that total for the current hero turn. Catalog tables have been regenerated.

## Witch — mon3smp-04

Witch (`mon3smp-04`), Level 3, Swamp/Cave, 10 HP, 1 DEF, 3 MDEF, 1 EVA, 1 ACC. Artwork: `/cards/creatures/witch.jpg`. Rewards: 4 SP and 8 Gold by the default level formula below. Stalker retains `mon1grs-06`. The Goblin King Stage 1 monster deck includes 1 Witch.

Witch cycles through Blinding Hex (Hero -1 EVA and -1 ACC for 2 turns), Expose weakness (Hero -1 DEF and -1 MDEF for 1 turn), and Smite (7 magical damage). Non-damaging hexes apply directly without a hit roll, immediately affecting later attackers in the same enemy phase. Smite uses the universal 2d6 attack roll, Hero MDEF instead of DEF, then Divine Protection and Block. DEF and MDEF after penalties cannot drop below zero; ACC/EVA remain signed modifiers under the existing hit system.

Hex duration counts subsequent hero turns: a hex is active immediately, stays through the stated number of hero turns and their following enemy phases, then expires before the next hero hand. Thus Expose weakness remains active for Witch's next Smite. Recasting the same named hex from the same creature refreshes its duration without stacking; different creatures' hexes accumulate independently. Timed hexes are combat-local, separate from persistent poison/blindness/crippled status names and the existing Ghoul/Troll modifiers. They expire by duration even if their source is defeated.

Regen1 restores 1 HP after each completed living Witch turn, including hex turns and missed Smite attacks, capped at her 10 Max HP. A defeated Witch does not act or regenerate. Timed modifiers affect hero accuracy, enemy hit checks, physical/magical absorption, confirmation odds, live battle stats and visible hex badges. Card faces, intent docks and inspection show each hex's values and duration.

## Default creature rewards

Unless a creature explicitly specifies different rewards, its level factor is `2 ** (level - 1)`: Level 1 through 6 use factors 1, 2, 4, 8, 16 and 32. The inscription is `1 SP * factor` and `2 Gold * factor`, before player victory bonuses. Thus Level 3 grants 4 SP/8 Gold and Level 4 grants 8 SP/16 Gold. All current ordinary creatures and bosses use this formula; Goblin Chieftain (Level 2) grants 2 SP/4 Gold and each Level 3 Troll grants 4 SP/8 Gold. Only an explicitly requested future exception should override it. `getDefaultMonsterRewards` in src/data/monsters.ts supplies reward inscriptions for every current monster template; combat awards the card's inscribed values.
