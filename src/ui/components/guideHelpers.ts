import {
  calculateMaxHp,
  computeEffectiveStats,
  getDerivedCombatStats,
} from '../../core/stats';
import { ClassId, EquippedGear, EnemyTerrain, ShopItemDef, TerrainType } from '../../core/types';
import { getTrainOfferCount, VILLAGE_SHOP_BASE_SLOTS } from '../../core/village';
import { CLASS_CATALOG, STARTING_BASE_STATS } from '../../data/classes';
import { ACTION_CARD_CATALOG } from '../../data/actionCards';
import {
  getEnemyMainTerrain,
  getEnemySupplyCount,
  getScenarioEnemyDeckComposition,
  ENEMY_TEMPLATES,
  ENEMY_TERRAIN_LEVELS,
  ORDINARY_ENEMY_TEMPLATE_IDS,
} from '../../data/enemies';
import { PATH_CARD_CATALOG } from '../../data/paths';
import { getTreasureSupplyCount, SHOP_ITEM_CATALOG, ShopItemTemplate } from '../../data/shopItems';
import {
  ADVENTURE_CARD_CATALOG,
  ADVENTURE_CARD_ORDER,
  STAGE_1_DECK_COMPOSITION,
  STAGE_1_MAX_TURNS,
  STAGE_1_MISSION_NAME,
  STAGE_2_DECK_COMPOSITION,
  STAGE_2_MAX_TURNS,
  STAGE_2_MISSION_NAME,
  STAGE_3_DECK_COMPOSITION,
  STAGE_3_MAX_TURNS,
  STAGE_3_MISSION_NAME,
} from '../../data/stages';

const TERRAIN_LABELS: Record<TerrainType | EnemyTerrain, string> = {
  start: 'Start',
  grasslands: 'Grasslands',
  forest: 'Forest',
  swamp: 'Swamp',
  cave: 'Cave',
  underground: 'Underground',
  underworld: 'Underworld',
};

const SHOP_ITEMS_BY_ID = new Map<string, ShopItemTemplate>(
  SHOP_ITEM_CATALOG.map((item) => [item.id, item])
);

const SCENARIO_CONFIG: Record<1 | 2 | 3, {
  name: string;
  maxTurns: number;
  adventureComposition: Record<string, number>;
  bossLabel: string;
}> = {
  1: {
    name: STAGE_1_MISSION_NAME,
    maxTurns: STAGE_1_MAX_TURNS,
    adventureComposition: STAGE_1_DECK_COMPOSITION,
    bossLabel: `${ENEMY_TEMPLATES.goblin_chieftain.name} (Turn ${STAGE_1_MAX_TURNS} Culmination)`,
  },
  2: {
    name: STAGE_2_MISSION_NAME,
    maxTurns: STAGE_2_MAX_TURNS,
    adventureComposition: STAGE_2_DECK_COMPOSITION,
    bossLabel: `Cult of Trolls &mdash; ${ENEMY_TEMPLATES.troll_healer.name}, ${ENEMY_TEMPLATES.troll_hexer.name} &amp; ${ENEMY_TEMPLATES.troll_brute.name} (Turn ${STAGE_2_MAX_TURNS})`,
  },
  3: {
    name: STAGE_3_MISSION_NAME,
    maxTurns: STAGE_3_MAX_TURNS,
    adventureComposition: STAGE_3_DECK_COMPOSITION,
    bossLabel: `${ENEMY_TEMPLATES.king_nezenheim.name} (Turn ${STAGE_3_MAX_TURNS} Culmination)`,
  },
};

export function getTreasureDeckSummary(): {
  totalCards: number;
  uniqueItems: number;
  weapons: number;
  armor: number;
  accessories: number;
  potions: number;
} {
  let totalCards = 0;
  let weapons = 0;
  let armor = 0;
  let accessories = 0;
  let potions = 0;
  for (const item of SHOP_ITEM_CATALOG) {
    const count = getTreasureSupplyCount(item);
    totalCards += count;
    if (item.category === 'weapon') weapons += count;
    else if (item.category === 'armor') armor += count;
    else if (item.category === 'accessory') accessories += count;
    else if (item.category === 'consumable') potions += count;
  }
  return { totalCards, uniqueItems: SHOP_ITEM_CATALOG.length, weapons, armor, accessories, potions };
}

export function getPathsDeckSummary(): { totalCards: number; breakdownText: string } {
  const entries = PATH_CARD_CATALOG.map((card) => `<code>${card.copies}&times; ${card.name}</code>`);
  const totalCards = PATH_CARD_CATALOG.reduce((sum, card) => sum + card.copies, 0);
  return { totalCards, breakdownText: entries.join(', ') };
}

export function getSkillSectionCounts(): {
  fighter: number;
  wizard: number;
  upgrades: number;
  universal: number;
} {
  const cards = Object.values(ACTION_CARD_CATALOG);
  return {
    fighter: cards.filter((tpl) => tpl.classId === 'fighter' && !tpl.isSkillUpgrade).length,
    wizard: cards.filter((tpl) => tpl.classId === 'wizard' && !tpl.isSkillUpgrade).length,
    upgrades: cards.filter((tpl) => tpl.isSkillUpgrade).length,
    universal: 1,
  };
}

export function getTrainOfferRangeText(): string {
  return `Draft 1 of ${getTrainOfferCount(1)}&ndash;${getTrainOfferCount(4)} learnable cards (<code>2 + Village Level</code>) from the Skills Deck`;
}

export function getMarketStockFormulaText(): string {
  return `<code>${VILLAGE_SHOP_BASE_SLOTS} + Village Level</code>`;
}

export function renderGuideScenarioBoxHtml(scenarioLevel: 1 | 2 | 3): string {
  const cfg = SCENARIO_CONFIG[scenarioLevel];
  const advTotal = Object.values(cfg.adventureComposition).reduce((sum, n) => sum + n, 0);

  // Group adventure cards by terrain in canonical order
  const advTerrainOrder: TerrainType[] = ['grasslands', 'forest', 'swamp', 'cave', 'underground'];
  const advByTerrain = new Map<TerrainType, { total: number; parts: string[] }>();
  for (const code of ADVENTURE_CARD_ORDER) {
    const count = cfg.adventureComposition[code] ?? 0;
    if (count <= 0) continue;
    const def = ADVENTURE_CARD_CATALOG[code];
    if (!def) continue;
    const bucket = advByTerrain.get(def.terrain) ?? { total: 0, parts: [] };
    bucket.total += count;
    const label = def.isUndiscovered
      ? 'Undiscovered'
      : def.hasHostile
        ? `${def.name} (Hostile Lvl ${def.level})`
        : def.hasVillage
          ? 'Village'
          : 'Shrine';
    bucket.parts.push(`${count} ${label}`);
    advByTerrain.set(def.terrain, bucket);
  }
  const advLines = advTerrainOrder
    .filter((t) => advByTerrain.has(t))
    .map((t) => {
      const b = advByTerrain.get(t)!;
      return `<br/>&bull; <b>${b.total} ${TERRAIN_LABELS[t]}:</b> ${b.parts.join(', ')}`;
    })
    .join('');

  // Enemy deck & Void counts
  const totalOrdinarySupply = ORDINARY_ENEMY_TEMPLATE_IDS.reduce(
    (sum, id) => sum + getEnemySupplyCount(ENEMY_TEMPLATES[id]),
    0
  );
  const enemyEntries = getScenarioEnemyDeckComposition(scenarioLevel);
  const enemyInDeck = enemyEntries.reduce((sum, e) => sum + e.count, 0);
  const enemyInVoid = Math.max(0, totalOrdinarySupply - enemyInDeck);

  const monByTerrain = new Map<EnemyTerrain, { total: number; parts: string[] }>();
  for (const entry of enemyEntries) {
    const tpl = ENEMY_TEMPLATES[entry.templateId];
    const terrain = getEnemyMainTerrain(tpl);
    const bucket = monByTerrain.get(terrain) ?? { total: 0, parts: [] };
    bucket.total += entry.count;
    bucket.parts.push(`${entry.count} ${tpl.name}`);
    monByTerrain.set(terrain, bucket);
  }
  const monTerrainOrder: EnemyTerrain[] = ['grasslands', 'forest', 'swamp', 'cave', 'underground', 'underworld'];
  const monLines = monTerrainOrder
    .filter((mt) => monByTerrain.has(mt))
    .map((mt) => {
      const b = monByTerrain.get(mt)!;
      const bandOffset = (ENEMY_TERRAIN_LEVELS[mt] ?? 1) - scenarioLevel;
      const supplyNote = scenarioLevel === 3
        ? (mt === 'swamp' ? '~2/3 Supply' : '~1/3 Supply')
        : (bandOffset <= 0 ? 'Full Supply' : bandOffset === 1 ? '~2/3 Supply' : '~1/3 Supply');
      return `<br/>&bull; <b>${b.total} ${TERRAIN_LABELS[mt]} (${supplyNote}):</b> ${b.parts.join(', ')}`;
    })
    .join('');

  const treasure = getTreasureDeckSummary();

  return `
              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">SCENARIO ${scenarioLevel}: ${cfg.name.toUpperCase()}</h5>
                <ul class="adnd-bullet-list">
                  <li><b>Adventure Deck (${advTotal} Cards):</b>${advLines}</li>
                  <li><b>Enemy Deck (${enemyInDeck} Cards in Deck &bull; ${enemyInVoid} in Void):</b>${monLines}
                    <br/>&bull; <b>Stage Boss${scenarioLevel === 2 ? 'es' : ''}:</b> ${cfg.bossLabel}
                  </li>
                  <li><b>Treasure Deck (${treasure.totalCards} Cards):</b>
                    <br/>&bull; ${treasure.uniqueItems} unique items (${treasure.weapons} Weapons, ${treasure.armor} Armor, ${treasure.accessories} Accessories, ${treasure.potions} Potions); villages stock exact-level items
                  </li>
                </ul>
              </div>`;
}

function formatItemBonusSummary(item: ShopItemTemplate): string {
  const parts: string[] = [];
  if (item.gearBonus?.atk) parts.push(`+${item.gearBonus.atk} ATK`);
  if (item.gearBonus?.matk) parts.push(`+${item.gearBonus.matk} MATK`);
  if (item.gearBonus?.def) parts.push(`+${item.gearBonus.def} DEF`);
  if (item.gearBonus?.mdef) parts.push(`+${item.gearBonus.mdef} MDEF`);
  if (item.gearBonus?.acc) parts.push(`+${item.gearBonus.acc} ACC`);
  if (item.gearBonus?.eva) parts.push(`+${item.gearBonus.eva} EVA`);
  if (item.gearBonus?.pen) parts.push(`+${item.gearBonus.pen} PEN`);
  if (item.statBonus?.str) parts.push(`+${item.statBonus.str} STR`);
  if (item.statBonus?.dex) parts.push(`+${item.statBonus.dex} DEX`);
  if (item.statBonus?.agi) parts.push(`+${item.statBonus.agi} AGI`);
  if (item.statBonus?.int) parts.push(`+${item.statBonus.int} INT`);
  if (item.statBonus?.cha) parts.push(`+${item.statBonus.cha} CHA`);
  if (item.statBonus?.vit) parts.push(`+${item.statBonus.vit} VIT`);
  return parts.join(', ');
}

function toEquippedDef(tpl: ShopItemTemplate | undefined): ShopItemDef | null {
  return tpl ? { ...tpl, instanceId: `guide_${tpl.id}` } : null;
}

export function renderGuideClassBoxHtml(
  classId: ClassId,
  emoji: string,
  vitalsMode: 'physical' | 'magic',
  tacticsText: string
): string {
  const cls = CLASS_CATALOG[classId];
  const weaponTpl = SHOP_ITEMS_BY_ID.get(cls.startingGear.weaponId);
  const armorTpl = SHOP_ITEMS_BY_ID.get(cls.startingGear.armorId);
  const equippedGear: EquippedGear = {
    weapon: toEquippedDef(weaponTpl),
    armor: toEquippedDef(armorTpl),
    accessory: null,
  };
  const effectiveStats = computeEffectiveStats(
    STARTING_BASE_STATS,
    cls.classBonuses,
    equippedGear
  );
  const derived = getDerivedCombatStats(effectiveStats, equippedGear);
  const maxHp = calculateMaxHp(effectiveStats.vit);

  const primaryLabel = `${cls.primaryStat.toUpperCase()} (+${cls.classBonuses[cls.primaryStat]})`;
  const secondaryLabel = cls.secondaryStats
    .map((stat) => `${stat.toUpperCase()} (+${cls.classBonuses[stat]})`)
    .join(', ');

  const vitalsParts = vitalsMode === 'magic'
    ? `<b>${maxHp} Max HP</b>, ${derived.acc} ACC, ${derived.eva} EVA, ${derived.matk} MATK, ${derived.mdef} MDEF, ${derived.act} AP`
    : `<b>${maxHp} Max HP</b>, ${derived.acc} ACC, ${derived.eva} EVA, ${derived.atk} ATK, ${derived.def} DEF${derived.pen > 0 ? `, ${derived.pen} PEN` : ''}, ${derived.act} AP`;

  // Count starter cards in deck order
  const deckCounts = new Map<string, number>();
  for (const cardId of cls.starterCardIds) {
    deckCounts.set(cardId, (deckCounts.get(cardId) ?? 0) + 1);
  }
  const deckSummary = Array.from(deckCounts.entries())
    .map(([cardId, count]) => {
      const card = ACTION_CARD_CATALOG[cardId];
      if (!card) return `${count}&times; ${cardId}`;
      const isMagic = card.classId === 'wizard' || card.damageScalingStat === 'int';
      const scaleStat = (card.damageScalingStat ?? 'atk').toUpperCase();
      const scaleExpr = card.damageScalingDivisor && card.damageScalingDivisor > 1
        ? `${scaleStat}/${card.damageScalingDivisor}`
        : scaleStat;
      const effectText = card.baseDamage
        ? `${card.baseDamage} ${isMagic ? 'magic' : 'physical'} damage + ${scaleExpr}`
        : card.baseBlock
          ? `${card.baseBlock} Block`
          : card.flavorText;
      return `${count}&times; ${card.name} (${card.apCost} AP, ${effectText})`;
    })
    .join(' &bull; ');

  const gearSummary = [weaponTpl, armorTpl]
    .filter((item): item is ShopItemTemplate => Boolean(item))
    .map((item) => `LVL ${item.level} ${item.name} (${formatItemBonusSummary(item)})`)
    .join(' &bull; ');

  return `
              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">${emoji} ${cls.name}</h5>
                  <span class="adnd-class-role">Primary: ${primaryLabel} &bull; Secondary: ${secondaryLabel}</span>
                </div>
                <p class="adnd-class-summary">${cls.description}</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR ${effectiveStats.str}</b></span> &bull; <span><b>DEX ${effectiveStats.dex}</b></span> &bull; <span><b>AGI ${effectiveStats.agi}</b></span> &bull; <span><b>INT ${effectiveStats.int}</b></span> &bull; <span><b>CHA ${effectiveStats.cha}</b></span> &bull; <span><b>VIT ${effectiveStats.vit}</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> ${vitalsParts}.</li>
                  <li><b>Passive &mdash; <code>${cls.passive.name}</code>:</b> ${cls.passive.description}</li>
                  <li><b>Starter Action Deck:</b> ${deckSummary}.</li>
                  <li><b>Starter Gear:</b> ${gearSummary}.</li>
                  <li><b>Tactics:</b> ${tacticsText}</li>
                </ul>
              </div>`;
}
