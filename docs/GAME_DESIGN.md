# Game Design Specification — *The Paths We Choose*

> *"The paths we choose is a game about choices we take that create risks and opportunities."*

The Goblin King uses a **38-card ordinary Monster Deck**. Exact card quantities and creature data are in the generated [catalogs](CATALOGS.md#ordinary-monsters); collector IDs identify types and runtime IDs distinguish copies. Goblins include Swamp eligibility; Ramram is Grasslands-only. Bosses are separate.

---

## 1. Vision & Pillars

**The Paths We Choose** blends the tactical node-pathing and deckbuilding combat of *Slay the Spire* with classic tabletop dungeon-crawl mechanics, `2x 1d6` (2d6) probability rolls, equipment slots, and attribute archetypes (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`).

### Core Design Pillars
1. **Two-Row Pyramid Lookahead (Strategic Vision Cone)**:
   - The player always sees **3 active rows on the board**:
     1. **Current Row (`Row R`)**: The tile the player token is currently on (plus any unchosen/unreachable sibling tiles from that row).
     2. **Next Choice Row (`Row R + 1`)**: The **2 immediate forward tiles** the player can step onto next (plus 1 unreachable tile on the far side from the previous turn's lookahead).
     3. **Lookahead Row (`Row R + 2`)**: **3 tiles above the next row**—intersecting the leftmost, middle (shared), and rightmost paths of the 2 choices below them.
2. **Stat-Driven Evolution, Primary/Secondary Archetypes & Shrine Conversion**:
   - There are **no character levels or XP bars**—your attributes (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) directly define your hero's growth!
   - Every character begins with **Base `1`** in all 6 stats, plus their **Class Stat Bonuses** (1 Primary stat with `+2`, 2 Secondary stats with `+1` each, and others with `+0`):
     - **Fighter**: Primary `STR (+2)`, Secondary `DEX (+1), AGI (+1)` -> Starting Effective `STR 3, DEX 2, AGI 2, INT 1, CHA 1, LUK 1` (16 Max HP, 1 ACC, 1 EVA, 1 ATK, 0 DEF, 3 ACT).
     - **Wizard**: Primary `INT (+2)`, Secondary `DEX (+1), CHA (+1)` -> Starting Effective `STR 1, DEX 2, AGI 1, INT 3, CHA 2, LUK 1` (12 Max HP, 1 ACC, 0 EVA, 1 MATK, 0 MDEF, 3 ACT).
     - **Rogue**: Primary `AGI (+2)`, Secondary `DEX (+1), STR (+1)` -> Starting Effective `STR 2, DEX 2, AGI 3, INT 1, CHA 1, LUK 1` (14 Max HP, 1 ACC, 1 EVA, 1 ATK, 1 DEF, 3 ACT).
   - **Charisma (`CHA`)**: Each point of Effective CHA reduces the prices of purchaseable goods in Village Shops by **5%** (e.g. 1 CHA = 5% off, 2 CHA = 10% off; minimum 1 Gold).
   - **Starting 4 Stat Points & Welcome Preparation Dialog**: Players start with **4 Stat Points (SP)** and are greeted with a preparation dialog on game start featuring the Shrine stat converter widget, allowing immediate Base Stat upgrades before stepping forward.
   - Defeating Monsters rewards **Stat Points (`SP`)** (inscribed directly on the Monster Card).
   - **Shrines (`hasShrine: true`)**: Players convert Stat Points into **Base Stats** at Shrines or during initial Turn 0 preparation. Upgrading a Base Stat from current level `B` to `B + 1` costs **`(B + 1) * (B + 1)` Stat Points** (e.g., `Base 1 -> 2` costs `2x2 = 4 SP`, `Base 2 -> 3` costs `3x3 = 9 SP`, `Base 4 -> 5` costs `5x5 = 25 SP`). Multiple upgrades can be purchased during a single Shrine visit as long as the player has sufficient Stat Points. Outside of Shrines, the character sheet displays a read-only preview of current stats and the next upgrade cost.
   - **Automatic Shrine Boon**: Upon arrival, the player receives one eligible random boon, replacing the previous blessing (Cleanse, Blessing of {Stat} for `+1` map stat, Divine Protection for `-1` damage taken, or Revitalize).
3. **Tabletop 2d6 Combat Rolls, ACC & EVA System**:
   - **Universal Hit Check**: Anything that performs an attack on a target (player attack cards, hybrid cards with damage, and monster attack intents) performs a **`2x 1d6` (2d6)** hit check.
   - **Hit Check Math**: Needs a roll of $\text{neededRoll} = 7 - (\text{Attacker ACC} - \text{Target EVA})$ to hit.
   - With no modifiers, rolls of **7 and above hit** (58.33%), while **6 and below miss** (41.67%).
   - **Snake eyes (`1 + 1 = 2`)**: Total miss (automatic miss regardless of accuracy modifiers).
   - **Critical Hits**: Meeting or exceeding the critical threshold (default `12`, improved by LUK) is an automatic critical hit applying **+50% bonus ATK damage** ($\lfloor \text{damage} \times 1.5 \rfloor$).
   - **ACC vs. EVA Formulas**: `1 ACC` per `2 DEX` ($\lfloor\text{DEX}/2\rfloor$), `1 EVA` per `2 AGI` ($\lfloor\text{AGI}/2\rfloor$). Defense cards can grant temporary round EVA bonuses.
   - **Physical ATK & DEF Formulas**: Physical ATK = $\lfloor\text{STR}/2\rfloor + \lfloor\text{DEX}/3\rfloor + \text{gear.atk}$; Physical DEF = $\lfloor\text{STR}/5\rfloor + \lfloor\text{AGI}/3\rfloor + \text{gear.def}$.
   - **Magical DEF Formula**: Magical DEF = $\lfloor\text{INT}/5\rfloor + \text{gear.mdef}$.
   - **Battle ACT (Max Action Points)**: Starts at 3 Base AP, increases by $+1$ for every 5 INT ($3 + \lfloor\text{INT}/5\rfloor$).
   - **Critical Hit Threshold**: $\max(2, 12 - \lfloor\text{LUK}/10\rfloor)$. Base threshold is 12 (Boxcars, 2.8%); 10 LUK lowers threshold to 11+ (8.3%); 20 LUK lowers threshold to 10+ (16.7%).
4. **Four Interlocking Decks (Adventure, Monster, Player Combat & Treasure)**:
   - **Adventure Deck (30 cards per Stage)**: Generates the 1 -> 2 -> 3 pyramid board with full-art physical raster land cards and a 9-card lagging row discard cycle. All cards are numbered systematically (`advgrs-00` to `advsmp-04`) and sorted by collector card number in the Deck Viewer:
     - **Stage 1 ("The Goblin King")**: 30 cards composed of Grassland (`advgrs-00` x3, `advgrs-01` x5, `advgrs-02` x3, `advgrs-03` x3, `advgrs-04` x3), Forest (`advfrs-00` x2, `advfrs-01` x3, `advfrs-02` x2, `advfrs-03` x2, `advfrs-04` x2), and Swamp (`advsmp-00` x1, `advsmp-01` x1).
     - **Stage 2 ("Cult of Trolls")**: 30 cards composed of Grassland (`advgrs-02` x2), Forest (`advfrs-00` x2, `advfrs-01` x6, `advfrs-02` x3, `advfrs-03` x3, `advfrs-04` x3), and Swamp (`advsmp-00` x1, `advsmp-01` x4, `advsmp-02` x2, `advsmp-03` x2, `advsmp-04` x2).
   - **Monster Deck (38 cards)**: Drawn when stepping onto an **Encounter** Adventure Card; each Monster Card inscribes its **Level**, **Max HP**, **Stat Point Bonus**, **Gold Reward**, **Spawn Terrains**, and **Attack Pattern**. Draws are filtered to match the encounter's terrain (`Ramram` in Grasslands only; `Goblin` in Grasslands/Forest/Swamp; `Rattler` in Forest only; `Bullwark`, `Basilisk`, and `Zombie` in Forest/Swamp). If a drawn monster's level is higher than the encounter level, it goes straight to the monster discard pile. Incompatible terrain cards go to the bottom of the deck. Monsters do not carry a separate ATK stat as their damage is defined directly by their attack patterns; creatures with an empty pattern skip their turn and log that they did nothing.
   - **Treasure Deck (28 cards)**: Two copies of each of 14 shop items circulate through shops, inventory and treasure finds.
   - **Player Combat Deck (10 starter cards)**: Drawn `5` cards per combat turn with **`3 + floor(INT/5)` maximum Action Points (AP)** per turn, where every card's power scales directly with the hero's **Effective Stats**.
5. **Village Menu, Turn 15 Bosses & Multi-Stage Progression**:
   - Stepping on a **Village Tile** lets the player choose **1 action**: **Rest** (full HP), **Shop** (buy/sell gear with live equipment comparisons), or **Train** (remove 1 card or draft 1 of 3 class cards).
   - Reaching **Turn 15** in Stage 1 triggers the **Goblin Chieftain** Boss! Defeating it unlocks the Stage Completion modal, allowing the adventurer to proceed directly to Stage 2: **"Cult of Trolls"**.
   - Reaching **Turn 15** in Stage 2 triggers the **Cult of Trolls Boss Encounter** featuring 3 Trolls simultaneously: **Troll Healer** (heals a random damaged troll for 10 HP), **Troll Hexer** (casts random 1-turn debuffs: -1 ACC, +1 DMG taken, or -1 EVA), and **Troll Warrior** (attacks for 6 DMG each round)!

---

## 2. Screen Flow & User Journey

Welcome → Class Selection → Turn 0 Preparation → Map. Map tiles open Exploration, Combat, Village or Shrine overlays. Combat resolves through Victory acknowledgement or GameOver; ordinary Flee returns to the map without rewards. Acknowledging boss victory opens StageComplete; Stage 1 can continue into Cult of Trolls. See the complete [state diagram](ARCHITECTURE.md#state-machine).

### 2.1 Welcome Screen
- Atmospheric full-screen presentation featuring **height-maximized background artwork** (`/background/start-screen.png`, spanning `100dvh` viewport height edge-to-edge).
- Centered frosted-glass card displaying the game title (**The Paths We Choose**), tagline, and version badge.
- Primary CTA: **Start Adventure** (transitions to Class Selection).
- Plays the looping intro soundtrack (`start-screen.mp3`), with fixed audio mute/unmute control.

### 2.2 Class Selection Screen
- Every hero starts with **Base Stats `1` across all 6 attributes** (`STR 1, DEX 1, AGI 1, INT 1, CHA 1, LUK 1`) plus their **Class Stat Bonuses** (Primary `+2`, Secondary `+1` each):
  - **Fighter**:
    - Archetype: Primary `STR (+2)`, Secondary `DEX (+1), AGI (+1)`
    - Class Stat Bonuses: `STR +2, DEX +1, AGI +1, INT +0, CHA +0, LUK +0`
    - **Effective Starting Stats**: `STR 3, DEX 2, AGI 2, INT 1, CHA 1, LUK 1` -> **16 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **1 EVA**, **1 ATK**, **0 DEF**, **3 ACT**.
    - **Class Passive `[Berzerk]`**: Gain `+1 ATK` bonus when HP is 50% or below Max HP; if 25% or below, gain `+2 ATK` bonus instead.
    - Starter Combat Deck (`10 cards`): **8x Melee ATK** + **2x Shield DEF**.
  - **Wizard**:
    - Archetype: Primary `INT (+2)`, Secondary `DEX (+1), CHA (+1)`
    - Class Stat Bonuses: `STR +0, DEX +1, AGI +0, INT +2, CHA +1, LUK +0`
    - **Effective Starting Stats**: `STR 1, DEX 2, AGI 1, INT 3, CHA 2, LUK 1` -> **12 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **0 EVA**, **1 MATK**, **0 MDEF**, **3 ACT**.
    - **Class Passive `[Conserve]`**: When ending turn in battle with unused Action Points, those AP carry over to the next battle turn.
    - Starter Combat Deck (`10 cards`): **8x Fireball ATK** + **2x Force Field DEF**.
  - **Rogue**:
    - Archetype: Primary `AGI (+2)`, Secondary `DEX (+1), STR (+1)`
    - Class Stat Bonuses: `STR +1, DEX +1, AGI +2, INT +0, CHA +0, LUK +0`
    - **Effective Starting Stats**: `STR 2, DEX 2, AGI 3, INT 1, CHA 1, LUK 1` -> **14 Max HP** (`10 + Effective STR * 2`), **1 ACC**, **1 EVA**, **1 ATK**, **1 DEF**, **3 ACT**.
    - **Class Passive `[Steal]`**: Whenever rolling a 2d6 to perform an attack hit check and it is a pair (`1+1, 2+2, 3+3, 4+4, 5+5, 6+6`), immediately gain `+1 Gold`.
    - Starter Combat Deck (`10 cards`): **8x Melee ATK** + **2x Shield DEF**.
- **3-Card Smooth Interactive Carousel**:
  - The screen presents an interactive 3D perspective carousel with the 3 classes (`Fighter`, `Wizard`, `Rogue`).
  - The selected center class card is scaled up (`scale(1.05)`), fully opaque, and highlighted with a glowing golden border (`#f59e0b`).
  - The previous and next class cards flank the center card at &plusmn;330px, scaled down (`scale(0.85)`), dimmed (`opacity: 0.52`), and clickable.
  - **Guidance Info Text**: Centered below the carousel cards: *"Move left or right with A or D. You can also use the LEFT and RIGHT keys. Select the Adventurer Class and click Embark to start"*.
  - **Keyboard Navigation**: Pressing `A`, `a`, or `ArrowLeft` smoothly rotates to the previous class; `D`, `d`, or `ArrowRight` rotates to the next class; `Enter` or `Space` embarks on the adventure.
  - **Adventurer Cards (`public/cards/adventurers/*.jpg`)**: Carousel cards feature high-resolution artwork of each class (`fighter.jpg`, `wizard.jpg`, `rogue.jpg`).
  - **Right Sidebar & Embark CTA**: The active hero's Primary/Secondary roles, Passive, Stat table, Max HP, and Starter Deck are displayed in a dedicated panel on the right side of the screen, with the prominent golden **Embark** CTA positioned cleanly centered underneath it.
  - **Hardware-Accelerated In-Place Transitions**: DOM elements and the side detail panel are updated in place (`updateClassCarouselDom`) so GPU transitions animate smoothly without re-rendering or screen tearing.

### 2.3 Play Area Screen & Character Sheet HUD
1. **Top / Side HUD**:
   - **Turn Tracker**: `Turn X / 15` (starts at `Turn 0`; increments by `+1` each move; reaching `Turn 15` triggers the Stage 1 Boss).
   - **Vitality & Currency**: **HP Bar** (`currentHp / maxHp`), **Unspent Stat Points (`SP`)**, and **Gold** (rendered with dedicated `/icons/sp.png` and `/icons/gold.png` raster icons).
   - **Character Sheet Panel & Hero Portrait**:
     - Features the **Hero Portrait** on the left (`/cards/adventurers/*.jpg`) paired with the 6 core stats (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) stacked cleanly on the right with bold values and `ⓘ` info pills.
     - **Stat Info Modal (Right-Click / Long-Press / ⓘ)**: Right-clicking or holding down for 1s (or clicking `ⓘ`) on any stat opens the Stat Info Modal, displaying:
       1. **Effective Computation Breakdown**: `Effective Stat = Base + Class Bonus + Shrine Blessing + Gear`.
       2. **Derived Bonus Stats & Combat Scaling**: Exact formulas and live numbers (e.g. Max HP $+2 \times \text{STR}$, ATK $\lfloor\text{STR}/2\rfloor$, DEF $\lfloor\text{STR}/5\rfloor$, ACC, EVA, MATK $\lfloor\text{INT}/2\rfloor$, MDEF $\lfloor\text{INT}/5\rfloor$, CHA shop discount, LUK victory spoils).
       3. **Next SP Required to Level**: Target Base level, `(currentBase + 1)²` SP formula, live SP balance, ready/needed chip, and reminder that upgrades occur at Shrines or during Turn 0 preparation.
     - Derived combat statistics chips: `ACC` (`acc.png`), `EVA` (`eva.png`), `ATK` (`atk.png`), `DEF` (`def.png`), `MATK` (`matk.png`), `MDEF` (`mdef.png`), and `DISC` (`cha.png`).
     - Notes that Base Stats can only be upgraded at a Shrine or during initial Turn 0 preparation.
   - **Equipment Slots (`Weapon`, `Armor`, `Accessory`) & Permanent Backpack**:
     - Displays equipped items with dedicated slot icons (`slot-weapon.png`, `slot-armor.png`, `slot-accessory.png`), mini raster artwork, and an **Unequip** button on filled slots.
     - **Permanent Backpack Section**: Permanently visible below equipment slots (`🎒 Backpack (${state.backpack.length})`), listing all unequipped gear with **Equip** buttons (or **Use** for consumables).
     - **Map Equipment Management**: Players can freely equip and unequip gear anytime while navigating the map outside combat. Equipping or unequipping items that modify attributes (like `Ring of Beasts +1 STR`) dynamically syncs vitals (Max HP) and clamps current HP cleanly.
     - **Combat Lock**: Equipping and unequipping is strictly disabled during active combat (`activeHook.type === 'COMBAT'`).
   - **Deck Counters**:
     - **Adventure Deck / Discard** (`25` / `0` at Turn 0, 30 adventure cards minus 5 initially dealt; Start Tile is separate).
     - **Monster Deck / Discard** (`38` / `0` at Turn 0).
     - **Player Combat Deck** (`10` cards badge).

---

## 3. Village Tiles & The Village Menu (1 Action per Visit)

5 of the cards in the Stage 1 Adventure Deck are **Village Cards** (3x `Grassland Village` at Level 1 and 2x `Forest Village` at Level 2, `hasVillage: true`). Swamp Village cards occur in Stage 2. Stepping onto a Village Card opens the **Village Menu** (Level 3 Swamp Village draws `5 + 3 = 8` cards, Forest Village draws `5 + 2 = 7` cards, and Grassland Village draws `5 + 1 = 6` cards):

### 3.1 Submenu Navigation & Finalization Rules
- When the player opens **Shop** or **Train**, they can press **`<- Back to menu`** to return to the Village Menu **as long as no action has been taken yet**.
- In the **Shop**, once the player makes any purchase or sale, their visit action is committed: the back button is disabled and replaced with a notice, and leaving the shop completes the visit.
- Choosing **Rest**, drafting/removing a card in **Train**, or pressing **Leave village** consumes the visit immediately.

### 3.2 Village Actions
1. **Rest (Inn / Campfire)**:
   - Restores the player's `HP` to full (`hp = maxHp`) and cleanses all negative status ailments (poison, blindness, crippled) at a cost of **`5 gold + 1 gold for every 10 HP missing rounded down`** ($\text{cost} = 5 + \lfloor \text{missingHp} / 10 \rfloor$).
   - **Resting Conditions**:
     - **Disabled on Full Health with No Ailments**: If the player is on full health (`hp >= maxHp`) and has zero active negative status ailments, resting is disabled (`Already at full health (no ailments to cure)`).
     - **Enabled with Ailments**: If the player has at least one active status ailment, resting is available even at full health (for the base 5 Gold) to cleanse all ailments.
     - **Insufficient Gold**: If the player lacks sufficient gold for the calculated cost, resting is disabled (`Needs X gold (You have Yg)`).
   - Completes the Village visit upon use.
2. **Shop (Village Merchant — Buy / Sell Equipment & Consumables)**:
   - **Starting Gold**: Adventurers start every run with **20 Gold** (`gold: 20`).
   - **Treasure Deck & Dynamic Shop Stock**:
     - At game start, a **Treasure Deck of 28 cards** (all 14 catalog items x 2 copies) is generated and shuffled deterministically.
     - The shop no longer sells the entire catalog at once. When opening a Village Shop, **`5 + Village Level` item cards** are drawn from the top of the Treasure Deck (e.g. 6 items for a Level 1 Village) and placed into `shopStock`.
     - **Card Arts in Shop Options**: Every option displayed in the store features its official 5:7 raster card artwork (`/cards/items/*.jpg`), item type, stats, level badge, and Charisma price discount.
     - **Discarding Unbought Items**: When the player leaves or completes the village visit, all remaining unbought cards in `shopStock` are automatically swept into the `treasureDiscard` pile.
     - **Selling Items**: Selling an equipped or backpack item places that card into `treasureDiscard`.
     - **Endless Reshuffle**: If cards are drawn while the Treasure Deck is depleted, the Treasure Discard pile is shuffled to form the new Treasure Deck.
   - **Equipment Slot Inspection**: The Shop directly displays the player's current equipment (`Weapon`, `Armor`, `Accessory`), backpack items, and current effective stats.
   - **Stat Comparison Preview**: For every piece of gear in the shop, the player sees:
     - Which slot it fits and which currently equipped item it replaces (moving the old item to the backpack).
     - Live stat delta chips: e.g. `STR 4 -> 5 (+1)`, `ATK 1 -> 2 (+1)`, `DEF 0 -> 1 (+1)`, `Max HP 18 -> 20 (+2)`.
   - **14 Shop Item Catalog (Levels 1 & 2)**:
     - `Health Potion` (Consumable, 6g, Level 1): Restores 10 HP immediately.
     - `Iron Sword` (Weapon, 10g, Level 1): +1 ATK (boosts physical attack card damage).
     - `Apprentice Staff` (Weapon, 15g, Level 1): +1 MATK (boosts spell damage).
     - `Robe` (Armor, 15g, Level 1): +1 MDEF (reduces incoming magic damage intake).
     - `Leather Clothes` (Armor, 12g, Level 1): +1 EVA.
     - `Chainmail` (Armor, 15g, Level 1): +1 DEF (reduces physical attack damage intake).
     - `Book of Spells` (Accessory, 15g, Level 1): +1 INT.
     - `Ring of Beasts` (Accessory, 15g, Level 1): +1 STR.
     - `Sandals of Swiftness` (Accessory, 15g, Level 1): +1 AGI.
     - `Lucky Charm` (Accessory, 20g, Level 1): Produces an extra `(1d6 - 1)` Gold (0–5 Gold) after every victory.
     - `Iron Sword +` (Weapon, 30g, Level 2): +2 ATK (boosts physical attack card damage).
     - `Chainmail +` (Armor, 45g, Level 2): +2 DEF (significantly blunts incoming physical attack damage).
     - `Robe +` (Armor, 45g, Level 2): +2 MDEF (substantially reduces incoming magic damage intake).
     - `Apprentice Staff +` (Weapon, 45g, Level 2): +2 MATK (significantly amplifies magical spell damage).
   - **Treasure Deck & Village Stock**: 28-card Treasure Deck (2 copies of each of the 14 catalog items). Opening a village store draws `5 + Village Level` cards into `shopStock`.
   - **Derived Combat Stats**:
     - **Hero ATK**: $\lfloor \text{STR} / 2 \rfloor + \lfloor \text{DEX} / 3 \rfloor + \text{gear.atk}$.
     - **Hero DEF**: $\lfloor \text{STR} / 5 \rfloor + \lfloor \text{AGI} / 3 \rfloor + \text{gear.def}$. Reduces physical damage intake when hit.
     - **Hero MATK & MDEF**: $\text{MATK} = \lfloor \text{INT} / 2 \rfloor + \text{gear.matk}$; $\text{MDEF} = \lfloor \text{INT} / 5 \rfloor + \text{gear.mdef}$. Boosts spell scaling and magical resistance.
     - **Hero ACC & EVA**: $\text{ACC} = \lfloor \text{DEX} / 2 \rfloor$, $\text{EVA} = \lfloor \text{AGI} / 2 \rfloor + \text{gear.eva}$.
   - Players can buy items with **Gold** (subject to Charisma discounts) or sell owned items for `50%` of their Gold value. Each item features full-bleed physical TCG raster art.
3. **Train (Guild Hall — Deck Improvement)**:
   - Choose **one** of two free deck-sculpting options:
     - **Remove 1 Card**: Permanently remove `1` card from `playerMasterDeck` (minimum deck size `5`).
     - **Draft 1 of 3 Class Cards**: View **3 class-applicable combat cards** and pick **1 card** to add permanently to `playerMasterDeck`.

### 3.4 Undiscovered Terrains & Exploration Mechanic
- Adventure cards without pre-determined structures or encounters are designated as **Undiscovered Terrains**:
  - `advgrs-00`: **Undiscovered Grassland** (Level 1)
  - `advfrs-00`: **Undiscovered Forest** (Level 2)
  - `advsmp-00`: **Undiscovered Swamp** (Level 3)
- When the player steps onto an Undiscovered Terrain, an **Exploration Modal** opens displaying a simulated `1d6` exploration roll:
  1. **Hostile Ambush (`roll <= card.level`)**:
     - Hostile creatures ambush the party.
     - The modal notifies the player and provides a `Proceed to Battle` action.
     - On confirmation, combat begins: monsters are drawn from the monster deck according to encounter rules (`encounterLevel = card.level`, matching terrain).
  2. **Secret Treasure Discovered (`roll === 6`)**:
     - The player uncovers a hidden treasure cache.
     - Cards are drawn from the Treasure Deck until an item with **`item.level <= card.level`** is found.
     - Any drawn items exceeding `card.level` are placed into the `treasureDiscard` pile (and recycled if the deck runs dry).
     - The eligible item is awarded directly into the player's permanent backpack.
     - The player clicks `Claim Treasure & Continue` to safely resume journeying.
  3. **Peaceful Wilderness (all other rolls)**:
     - The journey through the wilderness is calm and serene.
     - No battle occurs and no treasure is found.
     - The player clicks `Continue Journey →` to move forward.

---

## 4. Shrine Tiles (Base Stat Upgrades & Altar Prayers)

5 of the cards in the Stage 1 Adventure Deck are **Shrine Cards** (3x `Grassland Shrine` at Level 1 and 2x `Forest Shrine` at Level 2, `hasShrine: true`). Swamp Shrines occur in Stage 2; see the generated [Adventure Decks](CATALOGS.md#adventure-decks).

### 4.1 Upgrading Base Stats with Stat Points
- Shrines are sacred locations where players commune with ancient altars to convert **Stat Points (`SP`)** into permanent **Base Stat upgrades**.
- The player can spend Stat Points on any attribute (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) that they can afford.
- Each upgrade increases the target Base Stat from `B` to `B + 1` at a cost of **`(B + 1) * (B + 1)` Stat Points** (e.g. Base 1 to 2 costs 4 SP, Base 4 to 5 costs 25 SP).
- Multiple upgrades can be performed during a single Shrine visit.
- Upgrading `STR` immediately increases `Max HP` (and restores the equivalent current HP) by `+2 HP`.

### 4.2 Automatic Sacred Shrine Boons & Single Blessing Invariant
- **Automatic Boon Upon Arrival**: Visiting a Sacred Shrine automatically bestows a random eligible divine boon upon arrival—players no longer need to click a manual prayer button.
- **Single Active Blessing Invariant**: The adventurer can only have **1 shrine blessing active at a time**. Receiving a new blessing automatically replaces and eliminates the previous blessing (resets any previous blessing stat bonuses or divine protection and recalculates vitals).
- The altar selects from all currently eligible boons:
  1. **Cleanse**: Cleanses all negative status effects (poison, blindness, crippled); only eligible if the player currently has at least one negative status.
  2. **Blessing of {stat name}**: Grants a temporary `+1` blessing bonus to the named attribute (`STR`, `DEX`, `AGI`, `INT`, `CHA`, or `LUK`) for the remainder of the current map; no condition.
  3. **Divine Protection**: Reduces incoming monster attack damage by `1` for the remainder of the current map; poison bypasses it. No eligibility condition.
  4. **Revitalize**: Fully restores current HP to Max HP immediately; only eligible if current `HP < Max HP`.

> [!NOTE]
> **Map-Temporary Boons**: Both **Stat Blessings** and **Divine Protection** last only for the current map. Unlike Base Stats (which are permanent character growth upgraded with Stat Points), divine blessings do not carry over to the next map after defeating the Stage Boss and are cleared upon stage transition.

- **Stat Info Inspection in Shrines**: Right-clicking (or contextmenu / long-press / clicking `ⓘ`) on any stat option inside the shrine converter modal opens the dedicated Stat Info Modal displaying complete computation breakdowns, scaling formulas, and next SP costs.
- **Leaving the Shrine**: After reviewing the granted blessing and performing any desired Base Stat upgrades, players press **Leave Shrine →** to continue their journey.

---

## 5. Hostile Encounters, Battle Area & Turn 15 Boss

### 5.1 Encounter Level, Budgets & Terrain-Aware Spawning
In Stage 1, **Encounter cards have levels 2–4**, as defined in the [Adventure Decks](CATALOGS.md#adventure-decks):
- Terrains where hostiles appear are called **Encounter cards** (e.g. `Grassland Encounter`, `Forest Encounter`).
- The card's **Level** represents the **Encounter Level Budget**.
- When the player steps onto an Encounter card, Monster Cards are drawn from the Monster Deck into the **Battle Area** until the **total level of all monsters >= the encounter level budget**:
  - Spawning strictly respects the tile's terrain: only monsters with `spawnTerrains.includes(card.terrain)` are drawn.
  - Eligible types and their levels come from the generated [Ordinary Monsters](CATALOGS.md#ordinary-monsters) spawn-terrain columns. Goblin includes Swamp; Ramram is Grasslands-only; Stalker includes Grasslands and Forest. Leech, Creeper and Assasin add further Swamp options, subject to the encounter's level cap.
  - **Creature Draw Rule (Higher Level to Discard)**: If a drawn monster's level is higher than the encounter level (`monster.level > encounterLevel`), it goes straight into the monster discard pile.
  - **Incompatible Terrain Rule**: Any drawn card from the deck that does not match the tile's terrain goes back to the **bottom of the monster deck immediately instead of the discard pile**.
  - Drawing a Level 2 or Level 3 monster fulfills the budget quickly or forms multi-creature encounters.
  - The Turn 15 Boss (**Goblin Chieftain**) is Level 2, so it fights as a formidable solo encounter.

### 5.2 Simultaneous Multi-Monster Battle Area
- All monsters in the battle area are active at once:
  - Each monster displays its individual **HP**, **Block**, **ACC**, **EVA**, and **Next Action Intent**.
  - On the monster turn, every living monster acts independently, rolling its own `2x 1d6` against the player's EVA threshold ($7 - (\text{Monster ACC} - \text{Player EVA})$).
- The player can tap any living monster in the battle area to designate it as the **Target** for attack cards.
- **3D Monster Carousel (Single-Row Targeting for 3+ Opponents)**:
  - When 3 or more monsters appear (such as Blob + Rattler + Scavenger or the 3 Cult of Trolls bosses), enemies are arranged in an interactive 3D perspective carousel (`.monster-carousel-track`) rather than wrapping into multiple vertical rows that break viewport constraints.
  - **Active Center Target**: The selected target is centered (`.is-center`, `scale(1.02)`, full opacity, glowing golden border, floating `🎯 TARGET (Roll X+)` badge, and live NEXT intent/HP dock below).
  - **Flanking Opponents**: The adjacent living enemies flank the active target (`.is-prev` and `.is-next`, `scale(0.82)`, dimmed `opacity: 0.62`, clickable). Clicking any flanking card smoothly transitions it to the center.
  - **Keyboard Traversal & Controls**: Use `A` / `D` or `ArrowLeft` / `ArrowRight` to cycle through living targets. Touch chevrons (`.monster-carousel-nav`) provide one-click traversal on mobile/touch screens.
  - **Guidance Instructions**: *"Traverse targets with A or D. You can also use the LEFT and RIGHT keys. Tap a monster to target it with attacks."* is displayed directly below the track.
  - **In-Place Updates (`updateMonsterCarouselDom`)**: Target shifts update DOM attributes in place without re-rendering the full document, preserving 60fps hardware-accelerated CSS transitions.
- Defeating all monsters in the encounter wins the battle and awards the combined **Stat Points (`SP`)** and **Gold** inscribed across all defeated Monster Cards.

### 5.3 Turn 15 Stage Boss Encounter
- When the player reaches **Turn 15**, after resolving Row 15's tile, the **Stage 1 Boss Card** (**Goblin Chieftain**, Level 2 Boss) appears in the battle area.
- Defeating the **Goblin Chieftain** completes the Stage 1 Adventure in victory!

### 5.4 Combat Turn Structure (*Slay the Spire* + Tabletop 2d6)
1. **Player Turn (Draw 5 & INT-based AP)**:
   - Reset player temporary `block = 0` and round `bonusEva = 0`, refill **`3 + floor(INT/5)` AP** (Wizard also carries unused AP), and draw **5 cards** from `combatDrawPile`.
   - **Pre-Play Action Confirmation Modal**: Clicking a card from hand does not immediately execute it. A confirmation popup opens showing the source card and target card side-by-side (`Use {card} on {target}`):
     - **Attack Cards**: Roll `2x 1d6` (2d6). Needs $7 - (\text{Player ACC} - \text{Target EVA})$ to hit. Snake eyes is an automatic miss; boxcars is an automatic critical dealing +50% ATK damage. On hit, deals base damage + stat scaling (`+1 DMG` per `2 Effective STR` or `2 Effective INT`) to the targeted monster; the damage is reduced first by the **monster's MDEF for INT-scaled spells or DEF for other attacks**, then by its temporary Block, and the remainder reduces HP. `Melee ATK` provides an inherent **`+1 ACC`** bonus on rolls. The modal displays Hero ACC, Monster EVA, Net ACC modifier, needed roll threshold, and exact 2d6 hit probability before confirming.
     - **Defense Cards**: Grant temporary **Block** + apply temporary round **EVA** (`+1 EVA` or `+2 EVA` per defense card multiplier), making enemy attacks harder to hit. The modal displays Block gained and Combat EVA gained before confirming.
   - Clicking **Confirm Use** spends the AP and executes the action; **Cancel** returns to card selection without spending AP.
   - **Permanent FLEE Action (2 AP)**: A `Flee` card is always available beside the hand and is never drawn, discarded, or shuffled. After confirmation, roll `1d6`; if the roll is $\le \lfloor(\text{AGI} + \text{LUK}) / 2\rfloor$ the hero escapes, combat ends with **no rewards**, and the encountered monsters go to the monster discard pile. On failure, the 2 AP is spent and combat continues. Stage Bosses cannot be fled from.
2. **Monster Turn (`2d6` Attack Roll & Pattern Execution)**:
   - Each living monster rolls **`2d6`** against the player's EVA: $\text{neededRoll} = 7 - (\text{Monster ACC} - \text{Player EVA})$.
   - **Snake eyes (`1 + 1 = 2`)**: Automatic miss.
   - **Boxcars (`6 + 6 = 12`)**: Automatic critical hit (+50% monster ATK damage).
   - **On Miss**: `0` damage taken (`DODGED!`).
   - **On Hit**: Damage is absorbed first by **Hero Natural DEF** ($\lfloor\text{STR}/5\rfloor + \lfloor\text{AGI}/3\rfloor + \text{gear.def}$), reduced by `divineProtection`, absorbed by temporary `playerBlock`, and any remainder reduces `playerResources.hp`.
   - **Explicit Absorption Logging**: Log entries explicitly state the absorbed damage amount (e.g. `2 absorbed by Hero DEF, 0 blocked, 4 HP damage`).
   - **Dice Banner Detail**: The 2d6 outcome banner details DEF absorption (e.g. `🎯 HIT! (4 DMG, 2 absorbed by Hero DEF)`).
3. **Hero Character, Vitals & Backpack Sidebar in Combat (`.combat-hero-sidebar`)**:
   - The battle view features a dedicated 3-column layout on desktop:
     - **Left Column (`.combat-hero-sidebar`)**: Displays Hero portrait, prominent HP / Max HP graphical bar, 6 core stats (`STR`, `DEX`, `AGI`, `INT`, `CHA`, `LUK`) with right-click inspection, prominent derived stats chips (**DEF**, **ATK**, **ACC**, **EVA**, **BLK**, **AP**), and Backpack items with active `Use` buttons for consumables.
     - **Center Column (`.combat-main-col`)**: Active monster row, dice roll banner, player hand, draw/discard piles, and End Turn button.
     - **Right Column (`.combat-log-sidebar`)**: Scrollable Battle Log with real-time timestamps and Blue (Hero) / Red (Enemy) actor badges.
   - Using a consumable (e.g. `Health Potion`) during battle immediately heals the player and records a timestamped log entry (`🧪 Used Health Potion: restored +X HP`).
4. **Dynamic Monster Attack Scaling & Flashing Boons**:
   - When a monster's attack is scaled by abilities (such as *Bullwark's Charge Momentum* increasing damage by `+1 ATK` per charge), the pattern table on the live card and the `NEXT:` status dock display the updated boosted damage (e.g. `7 DMG` instead of base `6 DMG`).
   - The boosted number pulses with a flashing amber animation (`.is-buffed-flashing`).
   - An active boon badge is displayed on the card face (`🔥 Boon: +X ATK`).
   - Inspecting the monster displays a dedicated `✨ Active Boons & Combat Enhancements` section detailing the active enhancement and updates pattern steps.
5. **Combat Victory Modal & Rewards Showcase**:
   - Defeating all monsters in battle pauses gameplay and immediately opens the dedicated **Victory Modal** (`activeHook.type === 'VICTORY'`) rather than abruptly snapping back to the map.
   - **Showcased Rewards & Loots**:
     - **Defeated Foes**: Vanquished monster cards with raster art thumbnails, creature subtypes, levels, and individual SP/Gold yields.
     - **Loot Cards Grid**:
       - **Stat Points (`+X SP`)**: Inscribed directly on Monster Cards, saved to the player's treasury for upgrading Base Stats at Sacred Shrines.
       - **Gold Spoils (`+Y Gold`)**: Inscribed creature gold plus Luck bonus ($\lfloor\text{LUK}/2\rfloor$) and Lucky Charm roll (`(1d6 - 1)`), with full breakdown of base spoils and bonus additions.
   - **Interactive Confirmation Action (`OK &mdash; Return to Map &rarr;`)**:
     - The player reviews their spoils and presses the golden **OK** button to return to map navigation.
     - Smoothly transitions `activeHook` to `'NONE'` and resumes the map area exploration soundtrack (`map-area.mp3`).
     - For Stage Boss victories (e.g. Turn 15 Goblin Chieftain), the button reads `OK &mdash; Proceed &rarr;`, which transitions smoothly into the Stage Complete screen (`ON_STAGE_COMPLETE`).
6. **Battle State Combat Log Sidebar, Timestamps & Actor Badges**:
   - **Split Layout Architecture**: In battle state, the combat dialog is laid out side-by-side with the main combat stage on the left (`.combat-main-col`) and a dedicated Battle Log sidebar on the right (`.combat-log-sidebar`).
   - **Timestamps**: Every action taken during combat logs a timestamp (`[HH:MM:SS]`) using monospace typography (`.combat-log-time`).
   - **Actor Color Coding**:
     - **Hero ('You')**: Highlighted in **Blue** (`.combat-log-actor.is-hero`, text `#38bdf8`, background `rgba(14, 165, 233, 0.22)`, border `rgba(56, 189, 248, 0.55)`, left border accent `3px solid #38bdf8`).
     - **Enemies / Hostiles**: Highlighted in **Red** (`.combat-log-actor.is-enemy`, text `#f87171`, background `rgba(239, 68, 68, 0.22)`, border `rgba(248, 113, 113, 0.55)`, left border accent `3px solid #ef4444`). The badge identifies the specific acting creature (e.g. `Pincer`, `Scavenger`, `Bullwark`, `Zombie`).
     - **System / Encounter**: Neutral slate badge (`.combat-log-actor.is-system`, left border accent `3px solid #64748b`).
   - **Scrollable History**: Entries are listed in reverse chronological order (newest on top) with a scrollable list and live total count indicator.
   - **Mobile Responsiveness**: When screen width is 960px or below, the sidebar stacks smoothly beneath the End Turn button with independent scrolling.

### 5.5 Official Standard TCG Card Architecture & Unified Full-Art Template
All game cards (Adventure Lands, Monster Creatures, Player Actions, Items & Equipment, and Hero) follow official physical **Trading Card Game (TCG)** standards with a unified reusable full-art layout:
- **Official Sizing & Aspect Ratio**:
  - Strictly follows standard TCG card proportions of **5:7** (equivalent to **2.5" × 3.5"** / 63.5 mm × 88.9 mm) across all card types and viewports.
- **Unified Reusable Full-Art Card Format Across All Types**:
  1. **Full-Bleed Raster Art Layer (`inset: 0`)**: Digital raster paintings cover the entire card surface edge-to-edge from top to bottom (`.tcg-art-window` with `position: absolute; inset: 0`), replacing legacy cropped rectangular windows. Every card has dedicated unique art.
  2. **Consolidated Top Header (Meta Line & Card Name)**: Full-size creatures use level at left, inline type/subtype and spawn icons at right on the first row; name and collector number occupy the second row. Other card types retain their type stack and level/AP placement.
  3. **Floating Target Pill (`.combat-target-badge-top`)**: The active target pill (`🎯 TARGET (Roll X+)`) floats above the card frame in combat so target selection does not obscure card art.
  4. **Inscribed Rewards (`.tcg-art-rewards`)**: Displayed on the upper-left of creature artwork directly below the header as floating badges with visible numeric values (`+4 Gold`, `+1 SP`) using official raster icons.
  5. **Uninterrupted Artwork Showcase (`.tcg-art-spacer`)**: The middle dividing ribbon is completely eliminated, providing a large, continuous vertical artwork showcase area (`flex: 1 1 auto; min-height: 10px;`) between the top header and the bottom textbox.
  6. **Rules-Only Compact Textbox (`.tcg-textbox`) & Universal Bottom Docking**: Semi-transparent background (`rgba(..., 0.95)`) docked cleanly to the bottom of the card frame (`margin-top: auto !important; margin-bottom: 0 !important;` when followed by a footer, or `margin-bottom: 6px/8px !important;` when no footer exists), universally eliminating dead space or vertical floating gaps below the rules across ALL card types (Creature, Adventure/Land, Item/Equipment, Action, and Hero). `.tcg-inner-frame` is positioned with `position: absolute !important; inset: 3px !important;` (or `inset: 4px !important;` in inspect cards) to strictly prevent height collapse under `aspect-ratio: 5/7` flex containers. Displays ONLY essential gameplay rules (slot bonuses, damage/block scaling). On creature cards, the textbox displays abilities, the cyclic attack pattern table (`Turn 1: Slash (3 DMG)`), while positive creature stats are consolidated in the bottom dock with raster icons; no derived-stat row appears in the textbox. Monsters have no ATK stat because their damage is defined directly by their attack patterns; empty-pattern creatures skip their turn and log that they did nothing. **Flavor text is omitted from the card face** to maximize art space and prevent visual clutter (lore text remains accessible in the inspect detail modal).
  7. **Universal Bottom Docking & Footer Architecture**:
     - `.tcg-inner-frame` is anchored across the entire card via `position: absolute !important; inset: 3px !important;` (or `inset: 4px !important;` in inspect cards) with `display: flex; flex-direction: column;`, mathematically guaranteeing it spans from the top border to the bottom border.
     - When a footer is present (`.tcg-footer`), the textbox docks flush to the top edge of the footer (`margin-bottom: 0 !important; border-bottom-left-radius: 0; border-bottom-right-radius: 0;`), while the footer has `margin-top: 0 !important; margin-bottom: 6px/8px !important;`.
     - When no footer is present (e.g. Adventure Lands in inspect modals, mini cards), the textbox docks flush to the bottom edge with its own rounded bottom corners (`border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; margin-bottom: 6px/8px !important;`).
     - Middle spacer (`.tcg-art-spacer`, `.tcg-item-art-spacer`, `.adv-art-spacer`) expands with `flex: 1 1 auto; min-height: 10px;` so central artwork is always unobstructed and maximized.
  8. **Interactive Combat Status Dock & Flickering Prevention (`.creature-combat-dock`)**: Positioned below creature cards in battle, housing the active `NEXT:` move intent and the live `HP:` progress bar (`${hp} / ${maxHp} HP` with Block indicator), keeping the physical card face clean and authentic.
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
- **Reusable Card Border Templates**:
  - Grassland creatures and lands feature **vibrant green double borders** (`#2d7a3e` outer frame, `#4ade80` inner trim, `tcg-template-grassland`).
  - Forest lands feature **deep pine green borders** (`#059669` outer frame, `#34d399` inner trim, `tcg-template-forest`).
  - The Stage 1 Boss (**Goblin Chieftain**) features a radiant **gold metallic frame** (`tcg-template-boss`).
  - Action cards feature **crimson/ruby frames** for Attacks (`tcg-template-attack`) and **azure/sapphire frames** for Defenses (`tcg-template-defense`).
  - Item / Equipment cards feature a **rich gold & bronze frame** (`tcg-template-item`).
- **Card Inspection Modal (Right-Click & 2s Long-Press)**:
  - Right-clicking or pressing and holding for 2 seconds on any card opens the Card Detail Modal.
  - Formatted for offline tabletop play and card printing: presents the full physical card, generic stat scaling formulas (`Base + ⌊STAT / 2⌋`), live calculations based on the hero's current attributes, cycling monster move patterns, complete flavor text, and land board mechanics.

### 9. Right Sidebar Decks & Discard Piles (Multipliers Modal)
- **Dedicated Right Sidebar (`.play-sidebar-right`)**:
  - Displays four distinct card pile groups:
    1. **Adventure Piles**: Adventure Deck & Adventure Discard pile.
    2. **Monster Piles**: Monster Deck & Monster Discard pile.
    3. **Treasure Piles**: Treasure Deck & Treasure Discard pile.
    4. **Player Combat Piles**: Player Draw Deck & Player Discard pile.
- **Card Piles & Unique Multipliers**:
  - Left-clicking or right-clicking any deck or discard pile opens a modal showing the contents of that pile.
  - The modal aggregates identical cards and displays each unique card with a prominent multiplier badge (`&times; N`), showing the exact number of copies in that pile along with its percentage distribution.
  - Right-clicking or holding down on any unique card within the pile modal opens its full card inspection detail view.

---

## 13. Audio & Soundtrack State Machine

The game features dynamic, looped audio tracking synchronized with game state:

- **State Tracking (`currentMusic` & `audioScene`)**:
  - `currentMusic: 'start-screen' | 'map-area' | 'battle-normal' | null`
  - `audioScene: 'intro' | 'map' | 'battle' | 'none'`
- **Start Screen (`/audio/start-screen.mp3`)**:
  - Plays on the welcome/start screen (`screen: 'welcome'`, `audioScene: 'intro'`).
  - Loops continuously.
- **Map Area (`/audio/map-area.mp3`)**:
  - Starts on the character selection screen (`screen: 'class_select'`) and continues seamlessly through map navigation (`screen: 'play_area'`, `activeHook.type: 'NONE'`, `audioScene: 'map'`).
  - Loops continuously.
  - Stops immediately when exiting map navigation (entering combat, village, or shrine).
- **Battle Normal (`/audio/battle-normal.mp3`)**:
  - Plays when an encounter begins (`activeHook.type: 'COMBAT'`, `audioScene: 'battle'`).
  - Loops continuously.
  - Stops immediately when battle completes (victory, defeat, or stage boss completion).
  - On combat victory, returning to map navigation resumes `map-area.mp3`.
- **Autoplay Handling & Player Controls**:
  - Encapsulated in `AudioManager` (`src/audio/audioManager.ts`).
  - Modern browser autoplay restrictions are gracefully handled with a user gesture unlock listener (`pointerdown`, `click`, `keydown`).
  - A discreet floating audio button allows players to toggle mute/unmute at any point during gameplay.

## Game updates

When a new deployment is detected, an unobtrusive notice offers **Reload to update**. Checks run on launch, every minute while the tab is visible, and when returning to the tab. Gameplay continues until the player chooses to reload. Reloading an active adventure requires confirmation because run saving is not yet available; cancelling keeps the adventure running. Network failures do not interrupt play. Normal visits and reloads revalidate cached game files, so players do not need to clear their browser cache. Deployment details and launch verification are documented in ARCHITECTURE.md under Cloudflare releases and cache freshness.

## Leech creature

Leech (`mon3smp-01`, Level 4, Swamp/Cave) alternates **Soul Drain** (6 MATK, heals 50% of actual HP damage rounded down) with **Channel** (regenerate 2 HP, +2 Block). Every third Channel returns one discarded Zombie to battle at full HP; the Zombie acts next round. Leech has 10 HP, 1 DEF, 3 MDEF, 2 ACC, and 2 EVA. Magical attacks use MDEF rather than DEF, with ordinary Block and Divine Protection still applying. Creature cards and inspection show MDEF and label magical pattern damage MATK. The Goblin King deck includes 1 Leech; Rewards: 8 SP and 16 Gold.

## Creeper creature

Creeper (`mon3smp-02`, Level 3, Swamp only) has 12 HP, 2 DEF, 0 EVA, 1 ACC, and 1 MDEF. It alternates **Submerge** (+3 HP, +3 Block) and **Ambush** (7 physical damage). **Resilient** rolls a seeded 1d6 whenever Creeper is defeated: on 6, it immediately returns with 6 HP before victory resolves. It retains its attack-cycle position and can trigger Resilient on later defeats too. The Goblin King deck includes 1 Creeper; Rewards: 4 SP and 8 Gold.

## Assasin creature and poison

Assasin (`mon3smp-03`, artwork `assasin.jpg`) inhabits Swamp, Cave, and Underground. Level 3; 10 HP, 1 DEF, 3 EVA, 2 ACC, 1 MDEF. Alternates **Poison Dart** (3 physical damage ignoring up to 3 Hero DEF, plus poison on a successful 2d6 hit) with **Piercing Strike** (7 physical damage ignoring up to 2 Hero DEF).

Poison deals 1 HP damage at each subsequent hero End Turn before monsters act, does not stack, bypasses defenses and Block, persists across battles, and is cured by shrine cleanse or village rest. The first tick occurs on the hero End Turn after poison is applied. Poison can end the run. Underground is a creature spawn tag; this change does not add Underground map tiles. The Goblin King deck includes 1 Assasin; Rewards: 4 SP and 8 Gold.

## Stalker creature

Stalker (`mon1grs-06`, Level 2, Grasslands/Forest) has 8 HP, 0 DEF, 1 EVA, and 1 ACC. Alternates **Sprint** (+1 EVA and +1 ACC for two turns, lasting through Pounce) with **Pounce** (6 physical damage). **Skittish** grants an immediate +1 EVA per successful hit for the remainder of the hero turn, including blocked hits. Sprint refreshes without stacking; Skittish bonuses expire at hero End Turn. Current EVA affects subsequent attack rolls and displayed target odds. The Goblin King monster deck includes 1 Stalker; Rewards: 2 SP and 4 Gold.

Creature types: **Leech — Undead**, **Creeper — Undead**, **Assasin — Human**, **Rattler — Reptile**. These catalog types appear on cards and in inspection and pile views.

## Draw-until effects and graveyards

Spell/ability draw-until effects fizzle when the current deck/pass ends without satisfying their condition; they never force an invalid card or loop. A new draw that starts with an empty deck first reshuffles its graveyard, then gets one bounded search pass. A later draw may reshuffle again; an ongoing failed search may not. Completed ability draws remain in effect. Encounter generation, treasure discovery and shop stocking are recycling game mechanics, not abilities: when another draw needs an empty deck, reshuffle the graveyard and continue while eligible supply remains. Encounter terrain/level restrictions still apply. If only incompatible terrain cards remain in a nonempty monster deck after a full pass, stop without accessing its graveyard. If the encounter budget cannot be completed, fight existing draws; zero-monster encounters resolve without rewards and retain the normal Turn 15 boss check. This is unavailable eligible supply, not ability fizzle.

Graveyards are public. Explicit graveyard searches such as Leech's Zombie revival stop immediately and fizzle if no valid target exists. Deck order is hidden; viewing available card types/counts and card counting are allowed. Existing incompatible-terrain bottom placement is preserved with one examination per card per search. See MECHANICS_AND_DATA.md for exact boundaries.

## Treasure level filtering and recycling

Village stock accepts only `item.level === village.level`. Wrong-level items, both lower and higher, go immediately to treasureDiscard and do not count toward the `5 + village level` stock target. Draw again until the target is filled, reshuffling the treasure graveyard whenever a further draw needs an empty deck.

Undiscovered terrain rewards use `item.level <= terrain.level` as a cap. A Level 2 Forest discovery accepts Level 1 or Level 2 items. If the last card is an invalid Level 3 item, discard it, reshuffle the treasure graveyard into the new deck, and continue drawing until a valid reward appears. This is a game mechanic, not a spell/attack fizzle. Starting with an empty Treasure Deck follows the same reshuffle rule.

Eligible physical copies are conserved; nothing is created to fill stock. If no matching supply exists anywhere in the deck/graveyard (for example no Level 3 items are currently defined, or all matching copies are already owned), stop safely with empty/partial stock or no reward rather than loop forever. This is unavailable supply, not ability failure. A village's stock is generated only once per visit, including empty stock; returning to its menu does not reroll it. The current item catalog has only Levels 1 and 2; Level 3 shops need corresponding content.

## Battle hand carousel and revised full-size creature template

The battle hand uses one centered, fully readable action card with dimmed flanking previews. Browse using chevrons, numbered selectors, Q/E keys, or horizontal swipes. Browsing updates existing nodes in place and never spends AP. Tapping the center card opens the existing confirmation; Flee occupies its own separate slot. A/D and left/right arrows retain enemy targeting. End Turn resets hand selection; selection clamps safely after playing a card. Empty hands retain End Turn. Inspect/confirmation overlays suspend hand navigation; reduced-motion settings disable transitions.

Full-size creature cards in battle and inspection share one header/footer template: first header line is level at left, CREATURE/BOSS CREATURE and subtype inline, with spawn icons at right. Second line holds the name at left and collector number at right. The rules textbox contains abilities and patterns without a duplicate derived-stat row. The bottom dock shows printed Max HP plus icon/value pairs only for positive DEF, MDEF, ACC and EVA; zero-valued combat stats are omitted. Live battle ACC/EVA include temporary buffs and highlight positive bonuses; HP/Block remain live in the external combat dock. Compact pile cards retain their simplified art-first template.

Stalker base EVA is 1. Sprint adds 1 EVA (total 2); an additional Skittish hit bonus raises that total for the current hero turn. Catalog tables have been regenerated.

## Witch and default creature rewards

Witch (`mon3smp-04`) is registered with Level 3 Swamp/Cave eligibility, 10 HP, 1 DEF, 3 MDEF, 1 EVA, 1 ACC, 4 SP and 8 Gold. It cycles Blinding Hex (-1 Hero EVA/ACC, 2 turns), Expose weakness (-1 Hero DEF/MDEF, 1 turn), then Smite (7 magical damage), and regenerates 1 HP at the end of each living turn, capped at Max HP. The Goblin King Stage 1 deck includes 1 Witch. See [exact timing](MECHANICS_AND_DATA.md#witch--mon3smp-04).

Default creature rewards double at each level: factor `2 ** (level - 1)`, yielding `factor` SP and `2 * factor` Gold. Every current ordinary monster and boss uses this formula. A future exception requires an explicit reward override; existing boss rewards have been normalized to their levels.
