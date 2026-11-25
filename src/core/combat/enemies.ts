import { createTimestamp } from '../log';
import { shuffleArray } from '../rng';
import { ActiveCombatState, CombatEnemy, EnemyCard, EnemyIntent } from '../types';

export function getEnemyChannelMatkBonus(cm: CombatEnemy): number {
  return (cm.channelStacks ?? []).reduce((sum, s) => sum + s.amount, 0);
}

export function getEnemyEffectiveAtk(
  cm: CombatEnemy,
  enemiesInPlay: CombatEnemy[] = []
): number {
  let atk = (cm.enemy.atk ?? 0) + (cm.attackBonus ?? 0);
  if (cm.enemy.bloodlust && cm.enemy.maxHp > 0) {
    if (cm.hp < cm.enemy.maxHp * 0.25) atk += 2;
    else if (cm.hp < cm.enemy.maxHp * 0.5) atk += 1;
  }
  if (cm.enemy.templateId === 'goblin_chieftain') {
    const otherGoblins = enemiesInPlay.filter(
      (c) =>
        c.hp > 0 &&
        c !== cm &&
        (c.enemy.templateId === 'goblin' ||
          c.enemy.enemyType?.toLowerCase().includes('goblin'))
    ).length;
    atk += otherGoblins;
  }
  return atk;
}

export function getEnemyEffectiveDef(
  cm: CombatEnemy,
  enemiesInPlay: CombatEnemy[] = []
): number {
  let def = (cm.enemy.def ?? 0) + (cm.defBonus ?? 0);
  if (cm.enemy.templateId === 'goblin_chieftain') {
    const otherGoblins = enemiesInPlay.filter(
      (c) =>
        c.hp > 0 &&
        c !== cm &&
        (c.enemy.templateId === 'goblin' ||
          c.enemy.enemyType?.toLowerCase().includes('goblin'))
    ).length;
    def += otherGoblins;
  }
  return def;
}

export function getEnemyIntent(
  cm: CombatEnemy,
  enemiesInPlay: CombatEnemy[] = [],
  heroDebuffCount = 0
): EnemyIntent {
  const pattern = cm.enemy.pattern;
  if (!pattern || pattern.length === 0) {
    return { label: 'Idle', damage: 0, block: 0 };
  }
  const idx = Math.max(0, cm.patternIndex ?? 0) % pattern.length;
  const rawIntent = pattern[idx];
  const atk = getEnemyEffectiveAtk(cm, enemiesInPlay);
  const enemyBonus = rawIntent.damagePerEnemyInPlay
    ? enemiesInPlay.filter((candidate) =>
      candidate.hp > 0 && candidate.enemy.templateId === rawIntent.damagePerEnemyInPlay!.templateId
    ).length * rawIntent.damagePerEnemyInPlay.amount
    : 0;
  const isMagical = rawIntent.damageType === 'magical';
  const channelMatk = getEnemyChannelMatkBonus(cm);
  const atkBonus = isMagical ? channelMatk : atk;
  return {
    ...rawIntent,
    damage: rawIntent.damage > 0
      ? Math.max(0, rawIntent.damage + atkBonus + enemyBonus + (rawIntent.damagePerHeroDebuff ?? 0) * heroDebuffCount)
      : 0,
    ...(rawIntent.offhandDamage && rawIntent.offhandDamage > 0
      ? { offhandDamage: Math.max(0, rawIntent.offhandDamage + atk) }
      : {}),
    ...(rawIntent.magicDamage && rawIntent.magicDamage > 0
      ? { magicDamage: Math.max(0, rawIntent.magicDamage + channelMatk) }
      : {}),
  };
}

export function firstLivingEnemyIndex(combat: ActiveCombatState): number {
  return combat.enemies.findIndex((m) => m.hp > 0);
}

/**
 * Summons the first matching enemy template from the Enemy Deck into play (as a summon)
 * and shuffles the deck. If none is found in the draw pile, optionally retrieves one from
 * the Enemy Discard (FIFO) onto the top of the Enemy Deck.
 */
export function summonEnemyFromDeckOrDiscard(params: {
  templateId: string;
  fallbackTemplateId?: string;
  summonerName: string;
  enemyDeck: EnemyCard[];
  enemyDiscard: EnemyCard[];
  enemies: CombatEnemy[];
  rngState: number;
  logTimestamp?: string;
  logEntries: string[];
}): number {
  const {
    templateId,
    fallbackTemplateId,
    summonerName,
    enemyDeck,
    enemyDiscard,
    enemies,
    logTimestamp,
    logEntries,
  } = params;
  let nextRng = params.rngState;
  const summonIndex = enemyDeck.findIndex((m) => m.templateId === templateId);
  if (summonIndex >= 0) {
    const [summoned] = enemyDeck.splice(summonIndex, 1);
    enemies.push({
      enemy: summoned,
      hp: summoned.maxHp,
      block: summoned.startingBlock ?? 0,
      patternIndex: 0,
      undyingTokensRemaining: summoned.undyingTokens,
      isSummon: true,
    });
    const shuffleRes = shuffleArray(enemyDeck, nextRng);
    enemyDeck.length = 0;
    enemyDeck.push(...shuffleRes.shuffled);
    nextRng = shuffleRes.nextState;
    logEntries.push(
      `[${createTimestamp(logTimestamp)}] 📯 ${summonerName} summoned ${summoned.name} from the Enemy Deck into play and shuffled the deck. It acts next round.`
    );
    return nextRng;
  }

  const fallbackIndex = fallbackTemplateId
    ? enemyDiscard.findIndex((m) => m.templateId === fallbackTemplateId)
    : -1;
  if (fallbackIndex >= 0) {
    const [returned] = enemyDiscard.splice(fallbackIndex, 1);
    enemyDeck.unshift(returned);
    logEntries.push(
      `[${createTimestamp(logTimestamp)}] 📯 ${summonerName}'s call finds no ${fallbackTemplateId} in the Enemy Deck. Retrieved ${returned.name} from the Enemy Discard (FIFO) and placed it on top of the Enemy Deck.`
    );
  } else {
    logEntries.push(
      `[${createTimestamp(logTimestamp)}] 📯 ${summonerName}'s call finds no ${fallbackTemplateId ?? templateId} in the Enemy Deck or Discard.`
    );
  }
  return nextRng;
}
