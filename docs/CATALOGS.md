# Generated Content Catalogs

Generated from src/data by scripts/sync-doc-catalogs.cjs. Do not edit these tables manually. Run npm run docs:sync after changing catalogs; npm run docs:check verifies them. These tables record implementation data, not approval for a new gameplay rule. Mechanics and ability timing are specified in MECHANICS_AND_DATA.md.

## Classes

Effective stats below are Base + Class, before preparation upgrades, gear or blessings. Stat order: STR / DEX / AGI / INT / CHA / LUK.

| Class | Primary | Secondary | Class bonuses | Effective stats | Max HP | Starter deck | Passive |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fighter | str | dex, agi | 2 / 1 / 1 / 0 / 0 / 0 | 3 / 2 / 2 / 1 / 1 / 1 | 16 | 8× Melee ATK, 2× Shield DEF | Gain +1 ATK bonus when HP is 50% or below Max HP. If 25% or below, gain +2 ATK bonus instead. |
| Wizard | int | dex, cha | 0 / 1 / 0 / 2 / 1 / 0 | 1 / 2 / 1 / 3 / 2 / 1 | 12 | 8× Fireball ATK, 2× Force Field DEF | When you end turn in battle with unused Action Points, they carry over to your next battle turn. |
| Rogue | agi | dex, str | 1 / 1 / 2 / 0 / 0 / 0 | 2 / 2 / 3 / 1 / 1 / 1 | 14 | 8× Melee ATK, 2× Shield DEF | Whenever you roll a 2d6 to perform an attack hit check and it is a pair (1+1, 2+2, 3+3, 4+4, 5+5, 6+6), you immediately gain 1 Gold. |

## Ordinary Monsters

Stage 1 copies total: **38**. Runtime instance IDs distinguish physical copies; collector numbers identify types. Optional monster MDEF defaults to 0; unspecified creature type is shown explicitly.

| Collector ID | Template ID | Name | Type | Stage 1 copies | Level | HP | DEF | MDEF | ACC | EVA | SP | Gold | Terrains | Pattern | Abilities |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mon1grs-01 | goblin | Goblin | Goblinoid | 6 | 1 | 6 | 0 | 0 | 1 | 1 | 1 | 2 | grasslands, forest, swamp | 1. Slash: 4 physical damage<br>2. Cautious Poke: 3 physical damage; +2 Block | None |
| mon1grs-02 | pink_slime | Blob | Ooze | 3 | 1 | 4 | 1 | 0 | 0 | 0 | 1 | 2 | grasslands, forest | 1. Ooze Bump: 3 physical damage; +1 HP<br>2. Acid Glob: 4 physical damage | None |
| mon1grs-03 | fighting_beetle | Pincer | Insect | 3 | 1 | 5 | 1 | 0 | 0 | 0 | 1 | 2 | grasslands, forest | 1. Shell Guard: 2 physical damage; +3 Block<br>2. Horn Charge: 4 physical damage | None |
| mon1grs-04 | wild_dog | Scavenger | Beast | 3 | 1 | 6 | 0 | 0 | 2 | 2 | 1 | 2 | grasslands, forest | 1. Savage Bite: 4 physical damage<br>2. Lunging Bite: 3 physical damage; +1 ACC for 1 turn(s) | None |
| mon1grs-05 | ramram | Ramram | Beast | 3 | 1 | 6 | 0 | 0 | 2 | 1 | 1 | 2 | grasslands | 1. Headbutt: 4 physical damage<br>2. Sturdy Horn Guard: 3 physical damage; +2 Block | None |
| mon1grs-06 | stalker | Stalker | Unspecified | 3 | 2 | 8 | 0 | 0 | 1 | 1 | 2 | 4 | grasslands, forest | 1. Sprint: +1 EVA for 2 turn(s); +1 ACC for 2 turn(s)<br>2. Pounce: 6 physical damage | Skittish: Each hit immediately grants +1 EVA for the rest of the hero turn.; Sprint grants +1 EVA and +1 ACC for 2 turns; refreshing does not stack. |
| mon2frs-01 | rattler | Rattler | Reptile | 2 | 2 | 6 | 0 | 0 | 3 | 2 | 2 | 4 | forest | 1. Venom Strike: 5 physical damage<br>2. Coil & Strike: 4 physical damage; +2 Block | None |
| mon2frs-02 | tree_snapper | Basilisk | Reptile | 2 | 2 | 8 | 1 | 0 | 1 | 1 | 2 | 4 | swamp, forest | 1. Stalk: +2 EVA for 1 turn(s)<br>2. Snapping Jaws: 6 physical damage | None |
| mon2frs-03 | zombie | Zombie | Undead | 4 | 2 | 7 | 1 | 0 | 0 | 0 | 2 | 4 | swamp, cave, forest | 1. Regenerate: +2 HP<br>2. Rotting Claw: 5 physical damage | Lifesteal (Attacks restore HP equal to unblocked damage dealt) |
| mon2frs-04 | ghoul | Ghoul | Undead | 2 | 2 | 8 | 0 | 0 | 1 | 2 | 2 | 4 | forest, swamp | 1. Growl: -1 Hero EVA for 2 turns<br>2. Mad Dash: 6 physical damage | None |
| mon2frs-05 | bullwark | Bullwark | Beast | 2 | 3 | 12 | 2 | 0 | 1 | 0 | 4 | 8 | swamp, forest | 1. Bulwark Brace: +4 Block<br>2. Heavy Charge: 6 physical damage | Charge Momentum (Attacks increase by 1 each time it performs a charge attack) |
| mon3smp-01 | leech | Leech | Undead | 1 | 4 | 10 | 1 | 3 | 2 | 2 | 8 | 16 | swamp, cave | 1. Soul Drain: 6 magical damage; drain 50% HP damage<br>2. Channel: +2 Block; +2 HP; every 3 casts revive one discarded zombie | Soul Drain restores 50% of HP damage dealt (rounded down).; Every third Channel returns one Zombie from the monster discard pile at full HP; it acts next round. |
| mon3smp-02 | creeper | Creeper | Undead | 1 | 3 | 12 | 2 | 1 | 1 | 0 | 4 | 8 | swamp | 1. Submerge: +3 Block; +3 HP<br>2. Ambush: 7 physical damage | Resilient: Whenever defeated, roll 1d6. On a 6, return to life with 6 HP. |
| mon3smp-03 | assassin | Assasin | Human | 2 | 3 | 10 | 1 | 1 | 2 | 3 | 4 | 8 | swamp, cave, underground | 1. Poison Dart: 3 physical damage; ignore 3 DEF; poison on hit<br>2. Piercing Strike: 7 physical damage; ignore 2 DEF | Poison Dart poisons on hit: 1 HP damage at each subsequent hero End Turn until cleansed; does not stack.; Piercing Strike ignores up to 2 Hero DEF. |
| mon3smp-04 | witch | Witch | Unspecified | 1 | 3 | 10 | 1 | 3 | 1 | 1 | 4 | 8 | swamp, cave | 1. Blinding Hex: -1 Hero EVA, -1 Hero ACC for 2 turns<br>2. Expose weakness: -1 Hero DEF, -1 Hero MDEF for 1 turns<br>3. Smite: 7 magical damage | Regen1: Regain 1 HP at the end of each turn, up to Max HP. |

## Bosses

Bosses are spawned separately and excluded from ordinary-deck conservation. Stage 1 uses Goblin Chieftain; Stage 2 uses the three Trolls together.

| Name | Template | Level | HP | DEF | MDEF | ACC | EVA | SP | Gold | Pattern | Abilities |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goblin Chieftain | goblin_chieftain | 2 | 24 | 0 | 0 | 3 | 2 | 2 | 4 | 1. Commanding Strike: 4 physical damage; +2 Block<br>2. Brutal Cleave: 6 physical damage<br>3. Rallying Guard: 3 physical damage; +4 Block | Warlord's Guard (Starts combat with 3 Block) |
| Troll Healer | troll_healer | 3 | 20 | 1 | 0 | 2 | 0 | 4 | 8 | 1. Troll Mending: +2 Block | Troll Mending (Heals a random troll for 10 HP each round) |
| Troll Hexer | troll_hexer | 3 | 20 | 1 | 0 | 2 | 0 | 4 | 8 | 1. Troll Hex: +2 Block | Hex Curse (Casts a random debuff on the hero: -1 ACC, +1 DMG taken, or -1 EVA for 1 turn) |
| Troll Warrior | troll_brute | 3 | 24 | 1 | 0 | 3 | 0 | 4 | 8 | 1. Troll Smash: 6 physical damage | Relentless Assault (Attacks hero for 6 DMG each round) |

## Adventure Decks

Both missions contain 30 land cards. Start Tile is separate.

| Collector ID | Name | Terrain | Level | Stage 1 copies | Stage 2 copies |
| --- | --- | --- | --- | --- | --- |
| advgrs-00 | Undiscovered Grassland | grasslands | 1 | 3 | 0 |
| advgrs-01 | Grassland Encounter | grasslands | 2 | 5 | 0 |
| advgrs-02 | Grassland Encounter | grasslands | 3 | 3 | 2 |
| advgrs-03 | Grassland Village | grasslands | 1 | 3 | 0 |
| advgrs-04 | Grassland Shrine | grasslands | 1 | 3 | 0 |
| advfrs-00 | Undiscovered Forest | forest | 2 | 2 | 2 |
| advfrs-01 | Forest Encounter | forest | 3 | 3 | 6 |
| advfrs-02 | Forest Encounter | forest | 4 | 2 | 3 |
| advfrs-03 | Forest Village | forest | 2 | 2 | 3 |
| advfrs-04 | Forest Shrine | forest | 2 | 2 | 3 |
| advsmp-00 | Undiscovered Swamp | swamp | 3 | 1 | 1 |
| advsmp-01 | Swamp Encounter | swamp | 4 | 1 | 4 |
| advsmp-02 | Swamp Encounter | swamp | 5 | 0 | 2 |
| advsmp-03 | Swamp Village | swamp | 3 | 0 | 2 |
| advsmp-04 | Swamp Shrine | swamp | 3 | 0 | 2 |

## Shop and Treasure

Treasure deck: two copies per item, 28 cards total. Prices below are before Charisma discount.

| Item | ID | Slot/type | Level | Buy Gold | Sell Gold | Effects |
| --- | --- | --- | --- | --- | --- | --- |
| Health Potion | lvl1_health_potion | consumable | 1 | 6 | 3 | Restores 10 HP immediately when used. |
| Iron Sword | lvl1_iron_sword | weapon | 1 | 10 | 5 | Weapon Slot: +1 ATK (boosts physical attack card damage). |
| Apprentice Staff | lvl1_apprentice_staff | weapon | 1 | 15 | 7 | Weapon Slot: +1 MATK (boosts magical spell damage). |
| Robe | lvl1_robe | armor | 1 | 15 | 7 | Armor Slot: +1 MDEF (reduces incoming magic damage intake). |
| Leather Clothes | lvl1_leather_clothes | armor | 1 | 12 | 6 | Armor Slot: +1 EVA (increases evasion against all 2d6 attacks). |
| Chainmail | lvl1_chainmail | armor | 1 | 15 | 7 | Armor Slot: +1 DEF (reduces incoming physical attack damage). |
| Book of Spells | lvl1_book_of_spells | accessory | 1 | 15 | 7 | Accessory Slot: +1 INT (boosts spellcraft and intellect). |
| Ring of Beasts | lvl1_ring_of_beasts | accessory | 1 | 15 | 7 | Accessory Slot: +1 STR (+2 Max HP and melee scaling). |
| Sandals of Swiftness | lvl1_sandals_of_swiftness | accessory | 1 | 15 | 7 | Accessory Slot: +1 AGI (improves agility and baseline evasion). |
| Lucky Charm | lvl1_lucky_charm | accessory | 1 | 20 | 10 | Accessory Slot: Produces an additional (1d6 - 1) Gold per victory. |
| Iron Sword + | lvl2_iron_sword_plus | weapon | 2 | 30 | 15 | Weapon Slot: +2 ATK (boosts physical attack card damage). |
| Chainmail + | lvl2_chainmail_plus | armor | 2 | 45 | 22 | Armor Slot: +2 DEF (significantly reduces incoming physical attack damage). |
| Robe + | lvl2_robe_plus | armor | 2 | 45 | 22 | Armor Slot: +2 MDEF (substantially reduces incoming magic damage intake). |
| Apprentice Staff + | lvl2_apprentice_staff_plus | weapon | 2 | 45 | 22 | Weapon Slot: +2 MATK (significantly amplifies magical spell damage). |

## Combat Cards

Fields below are base data, not complete effective damage. STR damage also adds floor(DEX/3), weapon ATK and Berzerk; INT damage adds weapon MATK. Gear DEF/MDEF do not directly increase card Block. EVA effects use the multiplier as a flat amount. See MECHANICS_AND_DATA.md for formulas.

| Card | ID | AP | Damage base | Damage scaling | Block base | Block scaling | Round EVA | Card ACC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Melee ATK | melee_atk | 1 | 2 | str/2 | 0 | None | 0 | 1 |
| Shield DEF | shield_def | 1 | 0 | None | 2 | str/2 | 1 | 0 |
| Heavy Cleave | heavy_cleave | 2 | 5 | str/1 | 0 | None | 0 | 0 |
| Iron Parry | iron_parry | 1 | 1 | str/2 | 3 | str/2 | 1 | 0 |
| Battle Focus | battle_focus | 1 | 0 | None | 2 | str/2 | 2 | 0 |
| Fireball ATK | fireball_atk | 1 | 2 | int/2 | 0 | None | 0 | 0 |
| Force Field DEF | force_field_def | 1 | 0 | None | 2 | int/2 | 1 | 0 |
| Arcane Blast | arcane_blast | 2 | 5 | int/1 | 0 | None | 0 | 0 |
| Frost Nova | frost_nova | 1 | 2 | int/2 | 2 | int/2 | 1 | 0 |
| Blink Ward | blink_ward | 1 | 0 | None | 2 | int/2 | 2 | 0 |

Train pools: fighter: melee_atk, shield_def, heavy_cleave, iron_parry, battle_focus; wizard: fireball_atk, force_field_def, arcane_blast, frost_nova, blink_ward; rogue: melee_atk, shield_def, heavy_cleave, iron_parry, battle_focus.
