export type ClassId = 'fighter' | 'wizard' | 'rogue';

export interface CharacterStats {
  str: number;
  dex: number;
  agi: number;
  int: number;
  cha: number;
  luk: number;
}

export type StatKey = keyof CharacterStats;

export const STATS: StatKey[] = ['str', 'dex', 'agi', 'int', 'cha', 'luk'];

export interface ClassPassiveDef {
  name: string;
  description: string;
}

export interface CharacterClassDef {
  id: ClassId;
  name: string;
  title: string;
  description: string;
  primaryStat: StatKey;
  secondaryStats: [StatKey, StatKey];
  classBonuses: CharacterStats;
  starterCardIds: string[];
  passive: ClassPassiveDef;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface CombatGearBonuses {
  acc?: number;   // Direct ACC bonus
  atk?: number;   // Physical ATK bonus
  def?: number;   // Physical DEF bonus
  matk?: number;  // Magical ATK bonus
  mdef?: number;  // Magical DEF bonus
  eva?: number;   // Direct EVA bonus
  pen?: number;   // Physical penetration; bypasses enemy natural DEF
}

export interface DerivedCombatStats {
  acc: number;    // floor(DEX / 2) + gear.acc
  eva: number;    // floor(AGI / 2) + gear.eva
  atk: number;    // floor(STR / 2) + floor(DEX / 3) + gear.atk
  def: number;    // floor(STR / 5) + floor(AGI / 3) + gear.def
  matk: number;   // floor(INT / 2) + gear.matk
  mdef: number;   // floor(INT / 5) + gear.mdef
  pen: number;    // Gear-only physical DEF penetration
  act: number;    // 3 + floor(INT / 5) (Max Action Points in battle)
  critThreshold?: number; // 12 - floor(LUK / 10) (Minimum 2d6 roll for critical hit)
  berzerkBonus?: number; // Fighter [Berzerk] ATK bonus
}

export interface ShopItemDef {
  id: string;
  instanceId: string;
  name: string;
  description: string;
  category: 'consumable' | EquipmentSlot;
  buyPrice: number;
  sellPrice: number;
  level?: number;
  statBonus?: Partial<CharacterStats>;
  gearBonus?: CombatGearBonuses;
  healAmount?: number;
  luckyCharmGoldBonus?: boolean;
  cardNumber?: string;
  flavorText?: string;
}

export interface EquippedGear {
  weapon: ShopItemDef | null;
  armor: ShopItemDef | null;
  accessory: ShopItemDef | null;
}

export interface PlayerResources {
  hp: number;
  maxHp: number;      // 10 + (effectiveStr * 2)
  statPoints: number; // Earned from Monster Cards; spent to upgrade Base Stats (cost = (currentBaseStat + 1)^2)
  gold: number;
}

export type CombatCardType = 'attack' | 'defense' | 'skill' | 'enchantment';
export type ScalingStat = 'str' | 'dex' | 'agi' | 'int' | 'cha' | 'luk';
export type CombatScalingStat = ScalingStat | 'atk' | 'def';
export type CombatTargetMode = 'single_enemy' | 'all_enemies' | 'self';
export type CardDiscardMode = 'none' | 'exact' | 'any';

export interface CombatCardDef {
  id: string;
  instanceId: string;
  name: string;
  classId: ClassId;
  cardType: CombatCardType;
  apCost: number;
  baseDamage: number;
  damageScalingStat?: CombatScalingStat;
  damageScalingDivisor?: number; // 2 for +1 per 2 stat; 1 for +1 per 1 stat
  damageScalingMultiplier?: number;
  baseBlock: number;
  blockScalingStat?: CombatScalingStat;
  blockScalingDivisor?: number;
  blockScalingMultiplier?: number;
  evasionScalingStat?: ScalingStat;
  evasionMultiplier?: number;    // 1 for -1 per 1 AGI; 2 for -2 per 1 AGI
  accBonus?: number;             // Bonus to attacker ACC when playing this card
  targetMode?: CombatTargetMode;
  discardMode?: CardDiscardMode;
  discardCount?: number;
  damagePerDiscard?: number;
  drawCards?: number;
  gainAp?: number;
  staysInPlay?: boolean;
  drawOnApGain?: boolean;
  /** This card is an upgrade template stored in the Void, not a learnable card. */
  isSkillUpgrade?: boolean;
  /** Template ID of the owned card this Void card replaces at a Shrine. */
  upgradeOf?: string;
  cardNumber?: string;
  flavorText?: string;
}

export interface MonsterIntent {
  label: string;
  damage: number;
  block: number;
  damageType?: 'physical' | 'magical';
  poisonOnHit?: boolean;
  ignoreDef?: number;
  drainFraction?: number;
  reviveEvery?: number;
  reviveTemplateId?: MonsterTemplateId;
  heal?: number;
  accBonus?: number;
  evaBonus?: number;
  bonusDuration?: number;
  heroEvaDebuff?: number;
  heroEvaDebuffDuration?: number;
  heroStatDebuff?: { stats: Partial<Record<'acc' | 'eva' | 'def' | 'mdef', number>>; duration: number };
}

export type MonsterTemplateId =
  | 'goblin'
  | 'pink_slime'
  | 'fighting_beetle'
  | 'wild_dog'
  | 'ramram'
  | 'rattler'
  | 'bullwark'
  | 'tree_snapper'
  | 'zombie'
  | 'ghoul'
  | 'leech'
  | 'creeper'
  | 'assassin'
  | 'stalker'
  | 'witch'
  | 'goblin_chieftain'
  | 'troll_healer'
  | 'troll_hexer'
  | 'troll_brute';

export interface MonsterCard {
  id: string;
  templateId: MonsterTemplateId;
  name: string;
  level: number;
  isBoss?: boolean;
  maxHp: number;
  mdef?: number;           // Magical Defense (default 0)
  def?: number;            // Physical Defense (default 0)
  acc?: number;            // 2d6 Accuracy (default 1)
  eva?: number;            // 2d6 Evasion (default 0)
  statPointReward: number; // Inscribed directly on Monster Card
  goldReward: number;      // Inscribed directly on Monster Card
  startingBlock?: number;
  skittishEvaOnHit?: number;
  resilient?: { requiredRoll: number; reviveHp: number };
  endTurnRegen?: number;
  abilities: string[];
  pattern: MonsterIntent[];
  cardNumber?: string;     // e.g. "GRS · 001/011"
  spawnTerrains?: string[]; // e.g. ["grasslands", "forest"]
  creatureType?: string;   // e.g. "Goblinoid", "Ooze", "Insect", "Beast"
  flavorText?: string;
}

/** One Monster Card in the battle area, with its own live combat state. */
export interface CombatMonster {
  monster: MonsterCard;
  hp: number;
  block: number;
  patternIndex: number;
  accBonusTurns?: number;
  evaBonusTurns?: number;
  skittishEvaBonus?: number;
  channelCount?: number;
  attackBonus?: number;
  accBonus?: number;
  evaBonus?: number;
}

export interface CombatAttackRollSummary {
  attackerName: string;
  targetName: string;
  actionName: string;
  die1: number;
  die2: number;
  total: number;
  netAcc: number;
  neededRoll: number;
  isHit: boolean;
  isCrit: boolean;
  isSnakeEyes: boolean;
  damageDealt: number;
  damageBlocked: number;
  defenseType?: 'DEF' | 'MDEF';
  damageDefReduced?: number;
  /** Natural target DEF actually bypassed by the hero's physical PEN. */
  damagePenetrated?: number;
  damageProtReduced?: number;
}

export interface ActiveCombatState {
  heroStatDebuffs?: HeroStatDebuff[];
  monsters: CombatMonster[];  // Battle area: monsters are added until total level >= the tile's level
  combatTurn: number;
  playerAp: number;
  playerMaxAp: number;        // 3 AP
  playerBlock: number;
  playerEvasionMod: number;   // Temporary round EVA bonus against monster 2d6 attack rolls
  playerEvaDebuffTurns?: number; // Multi-turn debuff counter reducing Hero EVA (e.g. from Ghoul Growl)
  playerAccMod?: number;      // Temporary round ACC modifier (e.g. from Hexer)
  playerVulnerableMod?: number; // Temporary round damage intake increase (e.g. from Hexer)
  drawPile: CombatCardDef[];
  hand: CombatCardDef[];      // Five cards are drawn at the start of each turn (recycling discard as needed)
  discardPile: CombatCardDef[];
  inPlay?: CombatCardDef[];      // Battle-long enchantments; destroyed cards move to discardPile
  combatLog: string[];
  lastAttackRoll?: CombatAttackRollSummary;
  lastFleeRoll?: {
    roll: number;
    threshold: number;
    success: boolean;
  };
}

export interface HeroStatDebuff {
  sourceId: string;
  label: string;
  stats: Partial<Record<'acc' | 'eva' | 'def' | 'mdef', number>>;
  turnsRemaining: number;
}

export type NegativeStatusType = 'poison' | 'blindness' | 'crippled';

export type ShrinePrayerOptionId =
  | 'cleanse'
  | 'blessing_str'
  | 'blessing_dex'
  | 'blessing_agi'
  | 'blessing_int'
  | 'blessing_cha'
  | 'blessing_luk'
  | 'divine_protection'
  | 'revitalize';

export interface ShrinePrayerOption {
  id: ShrinePrayerOptionId;
  name: string;
  description: string;
}

export interface ActiveVillageState {
  coord: GridCoord;
  turn: number;
  subView: 'main' | 'shop' | 'train';
  trainOptions: CombatCardDef[];
  shopStock: ShopItemDef[];
  shopStockDrawn?: boolean; // Even empty/exhausted stock is generated only once per visit.
  /** @deprecated Village services are repeatable; retained for save compatibility. */
  actionTaken?: boolean;
}

export interface ActiveShrineState {
  coord: GridCoord;
  turn: number;
  grantedBoon?: ShrinePrayerOption;
  replacedBoonName?: string | null;
  prayed?: boolean;
  prayOptions?: ShrinePrayerOption[];
  chosenOptionId?: ShrinePrayerOptionId;
}

export type TerrainType = 'start' | 'grasslands' | 'forest' | 'swamp';

export interface AdventureCard {
  id: string;
  name?: string;
  terrain: TerrainType;
  level: number;        // On Encounter cards this is the encounter budget (total monster level to fill)
  hasHostile: boolean;
  hasVillage: boolean;
  hasShrine: boolean;
  revealed: boolean;
  cardNumber?: string;
  flavorText?: string;
  isUndiscovered?: boolean;
}

export interface GridCoord {
  col: number;
  row: number;
}

export type BoardNodeStatus =
  | 'current'
  | 'unchosen'
  | 'available'
  | 'lookahead'
  | 'unreachable';

export interface PlacedCardNode {
  coord: GridCoord;
  card: AdventureCard;
  status: BoardNodeStatus;
  turnPlaced: number;
}

export type GameScreen = 'welcome' | 'class_select' | 'play_area';

export type MusicTrackId = 'start-screen' | 'map-area' | 'battle-normal' | null;
export type GameAudioScene = 'intro' | 'map' | 'battle' | 'none';

export type ExplorationOutcome = 'combat' | 'treasure' | 'safe';

export interface ActiveExplorationState {
  coord: GridCoord;
  card: AdventureCard;
  roll: number;                 // Natural 1d6 result
  luckBonus?: number;           // floor(effective LUK / 5)
  effectiveRoll?: number;       // Natural roll + luckBonus; 6+ finds treasure
  outcome: ExplorationOutcome;
  foundItem?: ShopItemDef | null;
  discardedOverLevelCount?: number;
}

export interface CombatVictoryState {
  defeatedMonsters: MonsterCard[];
  statPointsEarned: number;
  goldEarned: number;
  baseGold: number;
  luckBonusGold: number;
  luckyCharmGold: number;
  isBoss: boolean;
  bossTitle?: string;
  stageNumber?: number;
  canContinue?: boolean;
}

export type ActiveHook =
  | { type: 'NONE' }
  | { type: 'COMBAT'; combat: ActiveCombatState }
  | { type: 'VILLAGE'; village: ActiveVillageState }
  | { type: 'SHRINE'; shrine: ActiveShrineState }
  | { type: 'EXPLORATION'; exploration: ActiveExplorationState }
  | { type: 'VICTORY'; victory: CombatVictoryState }
  | { type: 'ON_STAGE_COMPLETE'; turn: number; bossDefeated: string; stageNumber?: number; canContinue?: boolean }
  | { type: 'ON_GAME_OVER'; turn: number; defeatedBy: string };

export interface RunState {
  /** Explicit observational input supplied by the application boundary for replayable logs. */
  logTimestamp?: string;
  seed: string;
  rngState: number;
  screen: GameScreen;
  turn: number;
  maxTurns: number;
  currentMission?: number;           // 1: The Goblin King, 2: Cult of Trolls
  missionName?: string;              // 'The Goblin King' | 'Cult of Trolls'
  reshuffleCount: number;
  playerClass: ClassId | null;
  playerBaseStats: CharacterStats;   // Starts at { str: 1, agi: 1, int: 1, luk: 1 }
  playerClassBonuses: CharacterStats;// Fighter { +3, +2, +1, 0 } | Wizard { +1, +2, +3, 0 }
  playerBlessingBonuses: CharacterStats; // Blessings from Shrines { str, agi, int, luk }
  activeBlessingId?: ShrinePrayerOptionId | null; // Only 1 shrine blessing active at a time
  divineProtection: number;          // Flat damage reduction for the current map from Shrine prayer
  statusEffects: NegativeStatusType[]; // Negative statuses (poison, blindness, crippled)
  playerResources: PlayerResources | null;
  equippedGear: EquippedGear;
  backpack: ShopItemDef[];
  playerMasterDeck: CombatCardDef[];
  /** Learnable, non-starter skill cards waiting to be offered at Villages. */
  newSkillsDeck: CombatCardDef[];
  /** Unlearned Village skill offers, recycled into the New Skills Deck when needed. */
  newSkillsDiscard: CombatCardDef[];
  newSkillsReshuffleCount: number;
  playerPosition: GridCoord;
  adventureDeck: AdventureCard[];
  adventureDiscard: AdventureCard[];
  monsterDeck: MonsterCard[];
  monsterDiscard: MonsterCard[];
  treasureDeck: ShopItemDef[];
  treasureDiscard: ShopItemDef[];
  treasureReshuffleCount: number;
  /** Number of cards removed through village training during this run. */
  trainRemovalCount: number;
  board: Record<string, PlacedCardNode>;
  pathHistory: GridCoord[];
  activeHook: ActiveHook;
  bannerMessage: string;
  welcomePreparing: boolean;
  currentMusic: MusicTrackId;
  audioScene: GameAudioScene;
  audioState: GameAudioScene;
}

export type InspectedCardInfo =
  | { kind: 'action'; card: CombatCardDef }
  | {
      kind: 'monster';
      monster: MonsterCard;
      currentHp?: number;
      block?: number;
      accBonusTurns?: number;
  evaBonusTurns?: number;
  skittishEvaBonus?: number;
  channelCount?: number;
  attackBonus?: number;
      accBonus?: number;
      evaBonus?: number;
      activeBoons?: { name: string; description: string; value: string }[];
    }
  | { kind: 'adventure'; card: AdventureCard }
  | { kind: 'item'; item: ShopItemDef };
