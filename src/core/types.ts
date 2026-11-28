export type ClassId = 'fighter' | 'wizard' | 'rogue';

export interface CharacterStats {
  str: number;
  dex: number;
  agi: number;
  int: number;
  cha: number;
  vit: number;
}

export type StatKey = keyof CharacterStats;

export const STATS: StatKey[] = ['str', 'dex', 'agi', 'int', 'cha', 'vit'];

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
  startingGear: {
    weaponId: string;
    armorId: string;
  };
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
  acc: number;    // DEX + gear.acc (1 ACC per 1 DEX)
  eva: number;    // AGI + gear.eva (1 EVA per 1 AGI)
  atk: number;    // floor(STR / 2) + floor(DEX / 3) + gear.atk
  def: number;    // floor((STR + AGI + VIT) / 5) + gear.def
  matk: number;   // floor(INT / 2) + gear.matk
  mdef: number;   // floor(INT / 5) + gear.mdef
  pen: number;    // Gear-only physical DEF penetration
  act: number;    // 3 + floor(INT / 5) (Max Action Points in battle)
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
  /** Melee vs ranged weapon classification (used for Thorn retaliation). */
  weaponRange?: 'melee' | 'ranged';
  healAmount?: number;
  luckyCharmGoldBonus?: boolean;
  goldEarnedBonusPercent?: number;
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
  maxHp: number;      // 10 + (effectiveVit * 2)
  statPoints: number; // Earned from Enemy Cards; spent to upgrade Base Stats (cost = currentBaseStat * 10)
  gold: number;
}

export type ActionCardType = 'attack' | 'defense' | 'skill' | 'enchantment';
export type ScalingStat = 'str' | 'dex' | 'agi' | 'int' | 'cha' | 'vit';
export type ActionScalingStat = ScalingStat | 'atk' | 'def' | 'dex_agi';
export type ActionTargetMode = 'single_enemy' | 'all_enemies' | 'self';
export type CardDiscardMode = 'none' | 'exact' | 'any';

export interface ActionCardDef {
  id: string;
  instanceId: string;
  name: string;
  classId: ClassId;
  cardType: ActionCardType;
  level?: number;
  apCost: number;
  baseDamage: number;
  damageScalingStat?: ActionScalingStat;
  damageScalingDivisor?: number; // 2 for +1 per 2 stat; 1 for +1 per 1 stat
  damageScalingMultiplier?: number;
  damageScalingRound?: 'floor' | 'ceil';
  /** Add the hero's current derived ACC once after ordinary damage scaling. */
  damageAddsAccuracy?: boolean;
  /** When true alongside damageAddsAccuracy, apply scaling multiplier/divisor to (stat + ACC) together. */
  damageScalingIncludesAccuracy?: boolean;
  baseBlock: number;
  blockScalingStat?: ActionScalingStat;
  blockScalingDivisor?: number;
  blockScalingMultiplier?: number;
  blockScalingRound?: 'floor' | 'ceil';
  evasionScalingStat?: ScalingStat;
  evasionMultiplier?: number;    // 1 for -1 per 1 AGI; 2 for -2 per 1 AGI
  accBonus?: number;             // Bonus to attacker ACC when playing this card
  /** Overrides weapon range for this action card (e.g. ranged spells vs melee staff strikes). */
  attackRange?: 'melee' | 'ranged';
  targetMode?: ActionTargetMode;
  discardMode?: CardDiscardMode;
  discardCount?: number;
  damagePerDiscard?: number;
  drawCards?: number;
  gainAp?: number;
  staysInPlay?: boolean;
  drawOnApGain?: boolean;
  drawOnEnterHand?: number;
  /** This card is an upgrade template stored in the Void, not a learnable card. */
  isSkillUpgrade?: boolean;
  /** Template ID of the owned card this Void card replaces at a Shrine. */
  upgradeOf?: string;
  cardNumber?: string;
  flavorText?: string;
}

export interface EnemyIntent {
  label: string;
  damage: number;
  /** Optional second-hand attack damage resolved as a separate hit roll (e.g. Phalanx T2). */
  offhandDamage?: number;
  block: number;
  damageType?: 'physical' | 'magical';
  magicDamage?: number;
  poisonOnHit?: boolean;
  /** Inflicts timed Poison (damage, duration) on hit. */
  poison?: { damage: number; duration: number };
  ignoreDef?: number;
  drainFraction?: number;
  drainRound?: 'floor' | 'ceil';
  /** Marks the attack with the LSteal attribute (heals 50% of actual damage dealt rounded up). */
  lifesteal?: boolean;
  reviveEvery?: number;
  reviveTemplateId?: EnemyTemplateId;
  heal?: number;
  accBonus?: number;
  evaBonus?: number;
  defBonus?: number;
  bonusDuration?: number;
  defDuration?: number;
  evaDuration?: number;
  accDuration?: number;
  /** Summon one matching enemy from the hidden draw pile directly into play (and shuffle the deck). */
  summonFromEnemyDeck?: EnemyTemplateId;
  /** If the summon misses, return one matching discard card (FIFO) to the top of the draw pile. */
  returnDiscardToEnemyDeckOnMiss?: EnemyTemplateId;
  /** Summon any random undead enemy from the enemy draw pile directly into play. */
  summonUndeadFromEnemyDeck?: boolean;
  /** If undead summon misses, return one matching undead discard card (FIFO) to the top of the draw pile. */
  returnUndeadDiscardToEnemyDeckOnMiss?: boolean;
  /** Dynamic damage added for each living matching enemy currently in play. */
  damagePerEnemyInPlay?: { templateId: EnemyTemplateId; amount: number };
  /** Dynamic damage added for each currently active negative effect on the hero. */
  damagePerHeroDebuff?: number;
  /** Resolve this intent as separate attacks, each with its own 3d6 hit check and mitigation. */
  hitCount?: number;
  heroEvaDebuff?: number;
  heroEvaDebuffDuration?: number;
  heroStatDebuff?: { stats: Partial<Record<'acc' | 'eva' | 'def' | 'mdef', number>>; duration: number };
  /** Apply heroStatDebuff only after at least one successful hit from this intent. */
  heroStatDebuffOnHit?: boolean;
  /** Choose one temporary combat buff deterministically when this intent resolves. */
  randomBuff?: { amount: number; stats: Array<'atk' | 'acc'>; duration: number };
}

export type EnemyTemplateId =
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
  | 'phalanx'
  | 'cultist_mage'
  | 'lurker'
  | 'dark_orc'
  | 'orc_shaman'
  | 'goblin_chieftain'
  | 'troll_healer'
  | 'troll_hexer'
  | 'troll_brute'
  | 'king_nezenheim';

export type EnemyRarity = 'common' | 'uncommon' | 'rare';
export type EnemyTerrain = 'grasslands' | 'forest' | 'swamp' | 'cave' | 'underground' | 'underworld';

export interface EnemyCard {
  id: string;
  templateId: EnemyTemplateId;
  name: string;
  level: number;
  isBoss?: boolean;
  maxHp: number;
  atk?: number;            // Physical Attack (default 0)
  mdef?: number;           // Magical Defense (default 0)
  def?: number;            // Physical Defense (default 0)
  acc?: number;            // 3d6 MACG-3D6 Accuracy (default 1)
  eva?: number;            // 3d6 MACG-3D6 Evasion (default 0)
  statPointReward: number; // Inscribed directly on Enemy Card
  goldReward: number;      // Inscribed directly on Enemy Card
  startingBlock?: number;
  skittishEvaOnHit?: number;
  hardenDefOnHit?: number;
  undyingTokens?: number;
  resilient?: { requiredRoll: number; reviveHp: number };
  regenOnStart?: number;
  summonOnTurnStart?: EnemyTemplateId;
  endTurnRegen?: number;
  /** Passive Channel: gains +amount MATK at end of turn (optional duration in turns; permanent if omitted). */
  channel?: { amount: number; duration?: number };
  /** Passive Bloodlust: +1 ATK when HP < 50% Max HP, +2 ATK when HP < 25% Max HP. */
  bloodlust?: boolean;
  /** Retaliation after a successful player attack; bypasses DEF and Block but respects Divine Protection. */
  retaliationDamageOnHeroAttack?: number;
  /** Physical supply rarity. Defaults to uncommon when omitted. */
  rarity?: EnemyRarity;
  /** Lowest-level terrain in which this enemy can appear. */
  mainTerrain?: EnemyTerrain;
  abilities: string[];
  pattern: EnemyIntent[];
  cardNumber?: string;     // e.g. "GRS · 001/011"
  spawnTerrains?: EnemyTerrain[]; // e.g. ["grasslands", "forest"]
  enemyType?: string;   // e.g. "Goblinoid", "Ooze", "Insect", "Beast"
  flavorText?: string;
}

/** One Enemy Card in the battle area, with its own live combat state. */
export interface CombatEnemy {
  enemy: EnemyCard;
  hp: number;
  block: number;
  patternIndex: number;
  accBonusTurns?: number;
  evaBonusTurns?: number;
  defBonusTurns?: number;
  skittishEvaBonus?: number;
  hardenDefBonus?: number;
  undyingTokensRemaining?: number;
  channelStacks?: Array<{ amount: number; turnsRemaining?: number }>;
  channelCount?: number;
  attackBonus?: number;
  attackBonusTurns?: number;
  accBonus?: number;
  evaBonus?: number;
  defBonus?: number;
  /** True if this enemy was summoned into battle (awards no gold/SP and returns immediately to discard). */
  isSummon?: boolean;
  /** HP percentage thresholds (e.g. 50, 25) that have already triggered passive summons. */
  triggeredHpThresholds?: number[];
}

export interface CombatAttackRollSummary {
  attackerName: string;
  targetName: string;
  targetIndex?: number;
  actionName: string;
  die1: number;
  die2: number;
  die3?: number;
  total: number;
  netAcc: number;
  minHitRoll: number;
  maxHitRoll: number;
  isHit: boolean;
  isDiabolic?: boolean;
  isTriples?: boolean;
  damageDealt: number;
  damageBlocked: number;
  incomingDamage?: number;
  defenseType?: 'DEF' | 'MDEF';
  damageDefReduced?: number;
  /** Natural target DEF actually bypassed by the hero's physical PEN. */
  damagePenetrated?: number;
  damageProtReduced?: number;
}

export interface PendingPathTreasureCheck {
  coord: GridCoord;
  terrainCard: AdventureCard;
  pathCard: PathCard;
}

export interface ActiveCombatState {
  heroStatDebuffs?: HeroStatDebuff[];
  playerPoison?: { damage: number; turnsRemaining: number } | null;
  pendingPathTreasureCheck?: PendingPathTreasureCheck;
  enemies: CombatEnemy[];  // Battle area: enemies are added until total level >= the tile's level
  combatTurn: number;
  playerAp: number;
  playerMaxAp: number;        // 3 AP
  playerBlock: number;
  playerEvasionMod: number;   // Temporary round EVA bonus against enemy 3d6 attack rolls
  playerEvaDebuffTurns?: number; // Multi-turn debuff counter reducing Hero EVA (e.g. from Ghoul Growl)
  playerAccMod?: number;      // Temporary round ACC modifier (e.g. from Hexer)
  playerVulnerableMod?: number; // Temporary round damage intake increase (e.g. from Hexer)
  drawPile: ActionCardDef[];
  hand: ActionCardDef[];      // Five cards are drawn at the start of each turn (recycling discard as needed)
  discardPile: ActionCardDef[];
  /** Cards resolving now. A played card reaches discard only after its full effect resolves. */
  stack?: ActionCardDef[];
  inPlay?: ActionCardDef[];      // Battle-long enchantments; destroyed cards move to discardPile
  combatLog: string[];
  lastAttackRoll?: CombatAttackRollSummary;
  lastAttackRolls?: CombatAttackRollSummary[];
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
  damageTaken?: number;
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
  | 'blessing_vit'
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
  trainOptions: ActionCardDef[];
  shopStock: ShopItemDef[];
  shopStockDrawn?: boolean; // Even empty/exhausted stock is generated only once per visit.
  attachedShrineCard?: AdventureCard;
  savedShrineState?: Omit<ActiveShrineState, 'returnToVillage'>;
  /** @deprecated Village services are repeatable; retained for save compatibility. */
  actionTaken?: boolean;
}

export interface ActiveShrineState {
  coord: GridCoord;
  turn: number;
  shrineCard?: AdventureCard;
  deityName?: string;
  offeredBoon?: ShrinePrayerOption;
  grantedBoon?: ShrinePrayerOption;
  replacedBoonName?: string | null;
  prayed?: boolean;
  meditating?: boolean;
  prayOptions?: ShrinePrayerOption[];
  chosenOptionId?: ShrinePrayerOptionId;
  returnToVillage?: ActiveVillageState;
  alreadyVisited?: boolean;
}

export type TerrainType = 'start' | 'grasslands' | 'forest' | 'swamp' | 'cave' | 'underground';

export interface AdventureCard {
  id: string;
  name?: string;
  terrain: TerrainType;
  level: number;        // On Encounter cards this is the encounter budget (total enemy level to fill)
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
  attachedShrineCard?: AdventureCard;
  status: BoardNodeStatus;
  turnPlaced: number;
}

export type GameScreen = 'welcome' | 'class_select' | 'play_area';

export type MusicTrackId = 'start-screen' | 'map-area' | 'battle-normal' | 'victory' | 'shrine' | 'village' | null;
export type GameAudioScene = 'intro' | 'map' | 'battle' | 'victory' | 'shrine' | 'village' | 'none';

export type ExplorationOutcome = 'combat' | 'treasure' | 'safe';

export interface ActiveExplorationState {
  coord: GridCoord;
  card: AdventureCard;
  roll: number;                 // Natural 1d6 result
  effectiveRoll?: number;       // 1d6 roll; 6 finds treasure
  outcome: ExplorationOutcome;
  foundItem?: ShopItemDef | null;
  discardedOverLevelCount?: number;
  merchantStock?: ShopItemDef[];
  healedAmount?: number;
  chestAttemptMethod?: 'force_open' | 'lockpick' | 'remove_seal';
  chestCheckRoll?: PathCheckRollResult;
  destroyedItem?: ShopItemDef | null;
  damageTaken?: number;
  goldRollDie?: number;
  goldAwarded?: number;
  trapNet?: number;
  trapRoll?: PathCheckRollResult;
}

export type PathCardTemplateId =
  | 'enemy_camp'
  | 'merchant'
  | 'sanctuary'
  | 'ambush'
  | 'magical_chest'
  | 'trapped_chest'
  | 'gold_stash'
  | 'spring_trap';

export interface PathCard {
  id: string;
  templateId: PathCardTemplateId;
  name: string;
  cardNumber: string;
  challengeLabel: string;
  description: string;
}

export type PathChallengePhase =
  | 'sneak_prompt'
  | 'sneak_success'
  | 'sneak_fail'
  | 'treasure_prompt'
  | 'treasure_success'
  | 'treasure_fail'
  | 'merchant_offer'
  | 'sanctuary_prompt'
  | 'sanctuary_done'
  | 'ambush_prompt'
  | 'chest_prompt'
  | 'chest_success'
  | 'chest_fail'
  | 'gold_stash_prompt'
  | 'gold_stash_done'
  | 'spring_trap_prompt'
  | 'spring_trap_success'
  | 'spring_trap_fail';

export interface PathCheckRollResult {
  dice: [number, number, number];
  total: number;
  netModifier: number;
  minHitRoll: number;
  maxHitRoll: number;
  hitPercent: number;
  tier: number;
  isDiabolic: boolean;
  success: boolean;
}

export interface ActivePathChallengeState {
  coord: GridCoord;
  terrainCard: AdventureCard;
  pathCard: PathCard;
  phase: PathChallengePhase;
  sneakNet: number;
  sneakRoll?: PathCheckRollResult;
  treasureNet?: number;
  treasureRoll?: PathCheckRollResult;
  foundItem?: ShopItemDef | null;
  discardedOverLevelCount?: number;
  merchantStock?: ShopItemDef[];
  healedAmount?: number;
  chestAttemptMethod?: 'force_open' | 'lockpick' | 'remove_seal';
  chestCheckRoll?: PathCheckRollResult;
  destroyedItem?: ShopItemDef | null;
  damageTaken?: number;
  goldRollDie?: number;
  goldAwarded?: number;
  trapNet?: number;
  trapRoll?: PathCheckRollResult;
}

export interface CombatVictoryState {
  defeatedEnemies: EnemyCard[];
  statPointsEarned: number;
  goldEarned: number;
  baseGold: number;
  luckyCharmGold: number;
  isBoss: boolean;
  bossTitle?: string;
  stageNumber?: number;
  canContinue?: boolean;
  lastAttackRolls?: CombatAttackRollSummary[];
  finalCombatState?: ActiveCombatState;
  pendingPathTreasureCheck?: PendingPathTreasureCheck;
}

export interface EncounterClearState {
  card: AdventureCard;
  reason: string;
}

export type ActiveHook =
  | { type: 'NONE'; lastAttackRolls?: CombatAttackRollSummary[] }
  | { type: 'COMBAT'; combat: ActiveCombatState }
  | { type: 'VILLAGE'; village: ActiveVillageState }
  | { type: 'SHRINE'; shrine: ActiveShrineState }
  | { type: 'EXPLORATION'; exploration: ActiveExplorationState }
  | { type: 'PATH_CHALLENGE'; pathChallenge: ActivePathChallengeState }
  | { type: 'ENCOUNTER_CLEAR'; encounter: EncounterClearState }
  | { type: 'VICTORY'; victory: CombatVictoryState }
  | { type: 'BOSS_APPROACH'; bossEnemies: EnemyCard[] }
  | { type: 'ON_STAGE_COMPLETE'; turn: number; bossDefeated: string; stageNumber?: number; canContinue?: boolean }
  | { type: 'ON_GAME_OVER'; turn: number; defeatedBy: string; lastAttackRolls?: CombatAttackRollSummary[] };

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
  scenarioLevel?: number;            // Determines the three main-terrain setup bands
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
  playerMasterDeck: ActionCardDef[];
  /** Learnable, non-starter skill cards waiting to be offered at Villages. */
  newSkillsDeck: ActionCardDef[];
  /** Unlearned Village skill offers, recycled into the New Skills Deck when needed. */
  newSkillsDiscard: ActionCardDef[];
  newSkillsReshuffleCount: number;
  /** Physical cards banished during training. Static Void templates are derived separately. */
  voidCards?: ActionCardDef[];
  /** Physical treasure/shop items banished by selling in Village shops. */
  voidItems?: ShopItemDef[];
  playerPosition: GridCoord;
  adventureDeck: AdventureCard[];
  adventureDiscard: AdventureCard[];
  enemyDeck: EnemyCard[];
  enemyDiscard: EnemyCard[];
  /** Physical ordinary enemy cards not selected for the current scenario. */
  enemyVoid: EnemyCard[];
  treasureDeck: ShopItemDef[];
  treasureDiscard: ShopItemDef[];
  /** Physical treasure cards outside the current scenario level window (kept in the box). */
  treasureVoid?: ShopItemDef[];
  treasureReshuffleCount: number;
  pathsDeck?: PathCard[];
  pathsDiscard?: PathCard[];
  pathsReshuffleCount?: number;
  /** Number of cards removed through village training during this run. */
  trainRemovalCount: number;
  board: Record<string, PlacedCardNode>;
  pathHistory: GridCoord[];
  activeHook: ActiveHook;
  bannerMessage: string;
  /** Single unified adventure and combat chronicle for the run. */
  gameLog?: string[];
  welcomePreparing: boolean;
  currentMusic: MusicTrackId;
  audioScene: GameAudioScene;
  audioState: GameAudioScene;
}

export type InspectedCardInfo =
  | { kind: 'action'; card: ActionCardDef; isReference?: boolean }
  | {
      kind: 'enemy';
      enemy: EnemyCard;
      currentHp?: number;
      block?: number;
      accBonusTurns?: number;
  evaBonusTurns?: number;
  skittishEvaBonus?: number;
  hardenDefBonus?: number;
  undyingTokensRemaining?: number;
  channelStacks?: Array<{ amount: number; turnsRemaining?: number }>;
  channelCount?: number;
  attackBonus?: number;
      accBonus?: number;
      evaBonus?: number;
      activeBoons?: { name: string; description: string; value: string }[];
    }
  | { kind: 'adventure'; card: AdventureCard }
  | { kind: 'item'; item: ShopItemDef }
  | { kind: 'path'; card: PathCard; copies?: number };
