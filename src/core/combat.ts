import { roll1D6, roll2D6, rollInt, shuffleArray } from './rng';
import { syncAudioState } from './audio';
import {
  computeCombatGearBonuses,
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  getFleeThreshold,
  getPlayerAcc,
  getPlayerAtk,
  getPlayerAct,
  getPlayerCritThreshold,
  getPlayerDef,
  getPlayerMdef,
  getPlayerEva,
} from './stats';
import {
  ActiveCombatState,
  CharacterStats,
  CombatAttackRollSummary,
  CombatCardDef,
  CombatGearBonuses,
  CombatMonster,
  HeroStatDebuff,
  MonsterCard,
  MonsterIntent,
  RunState,
} from './types';

export const PLAYER_MAX_AP = 3;
export const PLAYER_HAND_SIZE = 5;
export const FLEE_AP_COST = 2; // Permanent FLEE action: never drawn, discarded, or shuffled
export const BASE_HIT_THRESHOLD = 5; // Standard 2d6 hit target (5 and above is a hit)
export const MONSTER_BASE_HIT_THRESHOLD = BASE_HIT_THRESHOLD;

export function getHeroStatDebuffMods(combat: Pick<ActiveCombatState, 'heroStatDebuffs'>) {
  const mods = { acc: 0, eva: 0, def: 0, mdef: 0 };
  for (const effect of combat.heroStatDebuffs ?? []) {
    if (effect.turnsRemaining <= 0) continue;
    for (const stat of ['acc', 'eva', 'def', 'mdef'] as const) mods[stat] -= effect.stats[stat] ?? 0;
  }
  return mods;
}

function getHeroDamageTakenDebuff(combat: Pick<ActiveCombatState, 'heroStatDebuffs'>): number {
  return (combat.heroStatDebuffs ?? []).reduce(
    (total, effect) => total + (effect.turnsRemaining > 0 ? effect.damageTaken ?? 0 : 0),
    0,
  );
}

function applyIntentHeroStatDebuff(
  activeEffects: HeroStatDebuff[],
  nextEffects: HeroStatDebuff[],
  sourceId: string,
  intent: MonsterIntent,
): { nextEffects: HeroStatDebuff[]; effect: HeroStatDebuff } | null {
  if (!intent.heroStatDebuff) return null;
  const effect: HeroStatDebuff = {
    sourceId,
    label: intent.label,
    stats: { ...intent.heroStatDebuff.stats },
    turnsRemaining: intent.heroStatDebuff.duration,
  };
  const isDifferent = (other: HeroStatDebuff) => other.sourceId !== effect.sourceId || other.label !== effect.label;
  const priorIndex = activeEffects.findIndex(other => !isDifferent(other));
  if (priorIndex >= 0) activeEffects.splice(priorIndex, 1);
  activeEffects.push(effect);
  return { nextEffects: [...nextEffects.filter(isDifferent), effect], effect };
}

export function createTimestamp(timestamp = '00:00:00'): string {
  return timestamp;
}

export interface ComputedCardEffect {
  damage: number;
  block: number;
  evasionBonus: number;
  accBonus: number;
}

export function computeCardEffect(
  card: CombatCardDef,
  effectiveStats: CharacterStats,
  gearCombatBonuses?: CombatGearBonuses,
  extraAtkBonus = 0,
  discardedCardCount = 0,
  extraAccBonus = 0,
): ComputedCardEffect {
  let damage = card.baseDamage;
  if (card.damageScalingStat) {
    const divisor = card.damageScalingDivisor ?? 2;
    const multiplier = card.damageScalingMultiplier ?? 1;
    const statVal = card.damageScalingStat === 'atk'
      ? getPlayerAtk(effectiveStats, gearCombatBonuses?.atk ?? 0) + extraAtkBonus
      : effectiveStats[card.damageScalingStat as keyof CharacterStats];
    damage += Math.floor(statVal / divisor) * multiplier;
    if (card.damageScalingStat === 'str') {
      damage += Math.floor(effectiveStats.dex / 3) + (gearCombatBonuses?.atk ?? 0) + extraAtkBonus;
    } else if (card.damageScalingStat === 'int') {
      damage += gearCombatBonuses?.matk ?? 0;
    }
  }
  if (card.damageAddsAccuracy) {
    damage += getPlayerAcc(effectiveStats, gearCombatBonuses?.acc ?? 0) + extraAccBonus;
  }
  damage += (card.damagePerDiscard ?? 0) * discardedCardCount;

  let block = card.baseBlock;
  if (card.blockScalingStat && card.baseBlock > 0) {
    const divisor = card.blockScalingDivisor ?? 2;
    const multiplier = card.blockScalingMultiplier ?? 1;
    const statVal = card.blockScalingStat === 'def'
      ? getPlayerDef(effectiveStats, gearCombatBonuses?.def ?? 0)
      : effectiveStats[card.blockScalingStat as keyof CharacterStats];
    block += Math.floor(statVal / divisor) * multiplier;
  }

  let evasionBonus = 0;
  if (card.evasionScalingStat) {
    evasionBonus = card.evasionMultiplier ?? 1;
  }

  const accBonus = card.accBonus ?? 0;

  return { damage, block, evasionBonus, accBonus };
}

export interface HitProbability {
  hitCombos: number;
  totalCombos: number;
  hitPercent: number;
  critPercent: number;
  snakeEyesPercent: number;
}

/**
 * Calculates the exact 2d6 hit probability against a needed target roll (out of 36 combinations).
 * Accounts for Snake Eyes (1+1=2) as an automatic total miss and rolls >= critThreshold as critical hits.
 */
export function computeHitProbability(neededRoll: number, critThreshold = 12): HitProbability {
  let hitCombos = 0;
  let critCombos = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (d1 === 1 && d2 === 1) {
        // Snake eyes always misses
        continue;
      }
      const sum = d1 + d2;
      if (sum >= critThreshold) {
        // Critical hit always hits & crits
        critCombos++;
        hitCombos++;
        continue;
      }
      if (sum >= neededRoll) {
        hitCombos++;
      }
    }
  }
  const hitPercent = Math.round((hitCombos / 36) * 1000) / 10;
  const critPercent = Math.round((critCombos / 36) * 1000) / 10;
  return {
    hitCombos,
    totalCombos: 36,
    hitPercent,
    critPercent,
    snakeEyesPercent: 2.8,
  };
}

export interface CombatAttackRoll {
  die1: number;
  die2: number;
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
  attackerAcc: number;
  targetEva: number;
  netAcc: number;
  neededRoll: number;
  isHit: boolean;
  isCrit: boolean;
  nextState: number;
}

/**
 * Evaluates an attack using 2x 1d6 (2d6).
 * - Total range: 2 - 12 (geared towards 7).
 * - Rolls of 5 and above hit; 4 and below miss.
 * - Snake eyes (1+1=2) is an automatic total miss regardless of modifiers.
 * - Rolls >= critThreshold (default 12) are critical hits applying +50% bonus ATK damage.
 * - Net accuracy = Attacker ACC - Target EVA. Modifiers adjust required roll: roll + netAcc >= 5.
 */
export function evaluateAttackRoll(
  rngState: number,
  attackerAcc: number,
  targetEva: number,
  critThreshold = 12
): CombatAttackRoll {
  const { die1, die2, total, isSnakeEyes, isBoxcars, nextState } = roll2D6(rngState);
  const netAcc = attackerAcc - targetEva;
  const neededRoll = BASE_HIT_THRESHOLD - netAcc;

  let isHit = false;
  let isCrit = false;

  if (isSnakeEyes) {
    isHit = false;
    isCrit = false;
  } else if (total >= critThreshold) {
    isHit = true;
    isCrit = true;
  } else {
    isHit = total + netAcc >= BASE_HIT_THRESHOLD;
  }

  return {
    die1,
    die2,
    total,
    isSnakeEyes,
    isBoxcars,
    attackerAcc,
    targetEva,
    netAcc,
    neededRoll,
    isHit,
    isCrit,
    nextState,
  };
}

export function getMonsterIntent(
  cm: CombatMonster,
  monstersInPlay: CombatMonster[] = [],
  heroDebuffCount = 0
): MonsterIntent {
  const pattern = cm.monster.pattern;
  if (!pattern || pattern.length === 0) {
    return { label: 'Idle', damage: 0, block: 0 };
  }
  const idx = Math.max(0, cm.patternIndex ?? 0) % pattern.length;
  const rawIntent = pattern[idx];
  const bonus = cm.attackBonus ?? 0;
  const creatureBonus = rawIntent.damagePerCreatureInPlay
    ? monstersInPlay.filter((candidate) =>
      candidate.hp > 0 && candidate.monster.templateId === rawIntent.damagePerCreatureInPlay!.templateId
    ).length * rawIntent.damagePerCreatureInPlay.amount
    : 0;
  return {
    ...rawIntent,
    damage: rawIntent.damage > 0
      ? Math.max(0, rawIntent.damage + bonus + creatureBonus + (rawIntent.damagePerHeroDebuff ?? 0) * heroDebuffCount)
      : 0,
  };
}

export function firstLivingMonsterIndex(combat: ActiveCombatState): number {
  return combat.monsters.findIndex((m) => m.hp > 0);
}

function drawCombatCards(
  drawPile: CombatCardDef[],
  discardPile: CombatCardDef[],
  count: number,
  rngState: number
): {
  drawn: CombatCardDef[];
  drawPile: CombatCardDef[];
  discardPile: CombatCardDef[];
  nextState: number;
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  let currentRng = rngState;
  const drawn: CombatCardDef[] = [];

  for (let i = 0; i < count; i++) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length === 0) break;
      const reshuffled = shuffleArray(currentDiscard, currentRng);
      currentDraw = reshuffled.shuffled;
      currentDiscard = [];
      currentRng = reshuffled.nextState;
    }
    drawn.push(currentDraw[0]);
    currentDraw = currentDraw.slice(1);
  }

  return {
    drawn,
    drawPile: currentDraw,
    discardPile: currentDiscard,
    nextState: currentRng,
  };
}

export function createCombatSession(
  monsters: MonsterCard[],
  masterDeck: CombatCardDef[],
  rngState: number,
  playerMaxAp = PLAYER_MAX_AP,
  logTimestamp = '00:00:00'
): { combat: ActiveCombatState; nextState: number } {
  const shuffledDeck = shuffleArray(masterDeck, rngState);
  const initialDraw = drawCombatCards(
    shuffledDeck.shuffled,
    [],
    PLAYER_HAND_SIZE,
    shuffledDeck.nextState
  );

  const combat: ActiveCombatState = {
    monsters: monsters.map((monster) => ({
      monster,
      hp: monster.maxHp,
      block: monster.startingBlock ?? 0,
      patternIndex: 0,
    })),
    combatTurn: 1,
    playerAp: playerMaxAp,
    playerMaxAp: playerMaxAp,
    playerBlock: 0,
    playerEvasionMod: 0,
    stack: [],
    inPlay: [],
    drawPile: initialDraw.drawPile,
    hand: initialDraw.drawn,
    discardPile: initialDraw.discardPile,
    combatLog: [
      `[${createTimestamp(logTimestamp)}] Encountered ${monsters
        .map((m) => `${m.name} (Lvl ${m.level}, ${m.maxHp} HP)`)
        .join(' + ')}!`,
    ],
  };

  return { combat, nextState: initialDraw.nextState };
}

export function playCombatCardFromHand(
  state: RunState,
  cardInstanceId: string,
  targetIndex: number,
  onCombatVictory: (
    updatedState: RunState,
    defeated: MonsterCard[],
    victoryDetails: {
      statPointsEarned: number;
      goldEarned: number;
      baseGold: number;
      luckBonusGold: number;
      luckyCharmGold: number;
      hasLuckyCharm?: boolean;
    }
  ) => RunState,
  discardedCardInstanceIds: string[] = []
): RunState {
  if (state.activeHook.type !== 'COMBAT' || !state.playerResources) {
    return state;
  }

  const combat = { ...state.activeHook.combat };
  const cardIndex = combat.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = combat.hand[cardIndex];
  if (combat.playerAp < card.apCost) {
    return state;
  }

  const selectedDiscardIds = [...new Set(discardedCardInstanceIds)];
  const selectedDiscards = combat.hand.filter((candidate, index) =>
    index !== cardIndex && selectedDiscardIds.includes(candidate.instanceId)
  );
  if (selectedDiscards.length !== selectedDiscardIds.length) return state;
  if (card.discardMode === 'none' && selectedDiscards.length > 0) return state;
  if (card.discardMode === 'exact' && selectedDiscards.length !== (card.discardCount ?? 0)) return state;

  const effectiveStats = getEffectiveStatsFromState(state);
  const gearCombat = computeCombatGearBonuses(state.equippedGear);
  const berzerkBonus = getFighterBerzerkBonus(
    state.playerClass,
    state.playerResources?.hp,
    state.playerResources?.maxHp
  );
  const liveAccModifier = (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
  const effect = computeCardEffect(
    card,
    effectiveStats,
    gearCombat,
    berzerkBonus,
    selectedDiscards.length,
    liveAccModifier,
  );
  const resolvingStack = [...(combat.stack ?? []), card];
  const logEntries: string[] = [
    `[${createTimestamp(state.logTimestamp)}] 🂠 ${card.name} enters the Stack and begins resolving.`,
  ];
  if (selectedDiscards.length > 0) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🗑️ ${card.name}: discarded ${selectedDiscards.map((discarded) => discarded.name).join(', ')}.`);
  }

  let nextRng = state.rngState;
  const monsters = combat.monsters.map((m) => ({ ...m }));
  let lastAttackRoll: CombatAttackRollSummary | undefined = undefined;
  let nextGold = state.playerResources?.gold ?? 0;
  let nextHeroHp = state.playerResources.hp;
  let heroKilledBy: string | null = null;

  const isAttackAction = card.cardType === 'attack' || effect.damage > 0;

  if (isAttackAction) {
    const targets = card.targetMode === 'all_enemies'
      ? monsters.map((monster, index) => monster.hp > 0 ? index : -1).filter((index) => index >= 0)
      : [
      monsters[targetIndex] && monsters[targetIndex].hp > 0
        ? targetIndex
        : firstLivingMonsterIndex(combat)
      ];

    for (const target of targets) {
    if (nextHeroHp <= 0) break;
    if (target >= 0 && monsters[target]) {
      const t = monsters[target];
      const cardAccBonus = card.accBonus ?? 0;
      const playerAccMod = (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
      const playerAcc = getPlayerAcc(effectiveStats, gearCombat.acc) + cardAccBonus + playerAccMod;
      const monsterEva = (t.monster.eva ?? 0) + (t.evaBonus ?? 0);
      const playerCritThreshold = getPlayerCritThreshold(effectiveStats);
      const attackRoll = evaluateAttackRoll(nextRng, playerAcc, monsterEva, playerCritThreshold);
      nextRng = attackRoll.nextState;

      // Rogue: [Steal] passive triggers on ANY pair (1+1, 2+2, 3+3, 4+4, 5+5, 6+6)
      if (state.playerClass === 'rogue' && attackRoll.die1 === attackRoll.die2) {
        nextGold += 1;
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 💰 [Steal] Rolled a pair [${attackRoll.die1}, ${attackRoll.die2}]! Snatched +1 Gold (Total: ${nextGold} Gold).`
        );
      }

      let damageDealt = 0;
      let damageBlocked = 0;
      let damageDefReduced = 0;
      let damagePenetrated = 0;

      let accBonusNote = '';
      if (cardAccBonus > 0 && playerAccMod !== 0) {
        accBonusNote = ` (incl. +${cardAccBonus} from ${card.name}, ${playerAccMod > 0 ? '+' : ''}${playerAccMod} from Hex)`;
      } else if (cardAccBonus > 0) {
        accBonusNote = ` (incl. +${cardAccBonus} from ${card.name})`;
      } else if (playerAccMod !== 0) {
        accBonusNote = ` (incl. ${playerAccMod > 0 ? '+' : ''}${playerAccMod} from Hex)`;
      }
      const berzerkNote = berzerkBonus > 0 ? ` (incl. +${berzerkBonus} from [Berzerk])` : '';

      if (attackRoll.isHit) {
        const baseDmg = effect.damage;
        const finalDmg = attackRoll.isCrit ? Math.floor(baseDmg * 1.5) : baseDmg;
        // Physical PEN bypasses natural monster DEF before temporary Block. Magical
        // attacks always resolve against MDEF and do not receive physical PEN.
        const isMagicalAttack = card.damageScalingStat === 'int';
        const naturalMonsterDef = Math.max(0, isMagicalAttack
          ? (t.monster.mdef ?? 0)
          : (t.monster.def ?? 0) + (t.defBonus ?? 0));
        const penetration = isMagicalAttack ? 0 : Math.min(gearCombat.pen, naturalMonsterDef);
        const monsterDef = Math.max(0, naturalMonsterDef - penetration);
        damagePenetrated = Math.min(penetration, finalDmg);
        damageDefReduced = Math.min(monsterDef, finalDmg);
        const afterDef = finalDmg - damageDefReduced;
        damageBlocked = Math.min(t.block, afterDef);
        damageDealt = afterDef - damageBlocked;
        t.block -= damageBlocked;
        t.hp = Math.max(0, t.hp - damageDealt);

        if (t.hp > 0 && t.monster.skittishEvaOnHit) {
          const bonus = t.monster.skittishEvaOnHit;
          t.skittishEvaBonus = (t.skittishEvaBonus ?? 0) + bonus;
          t.evaBonus = (t.evaBonus ?? 0) + bonus;
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${t.monster.name} — Skittish: gains +${bonus} EVA for the rest of this hero turn.`);
        }

        const critLabel = attackRoll.die1 === 6 && attackRoll.die2 === 6 ? 'BOXCARS CRIT' : 'CRITICAL HIT';
        const critText = attackRoll.isCrit ? ` [${critLabel}! +50% ATK DMG]` : '';
        const netSign = attackRoll.netAcc >= 0 ? '+' : '';
        const absorbParts: string[] = [];
        if (damagePenetrated > 0) absorbParts.push(`${damagePenetrated} ${t.monster.name} DEF bypassed by PEN`);
        if (damageDefReduced > 0) absorbParts.push(`${damageDefReduced} absorbed by ${t.monster.name} ${isMagicalAttack ? 'MDEF' : 'DEF'}`);
        if (damageBlocked > 0) absorbParts.push(`${damageBlocked} blocked`);
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] ⚔️ Played ${card.name} on ${t.monster.name}: rolled 2d6 = [${attackRoll.die1}, ${attackRoll.die2}] = ${attackRoll.total} (${netSign}${attackRoll.netAcc} net ACC${accBonusNote} vs ${monsterEva} EVA -> needed ${attackRoll.neededRoll}+)${critText} -> 🎯 HIT! ${finalDmg} DMG${berzerkNote}${
            absorbParts.length > 0 ? ` (${absorbParts.join(', ')})` : ''
          } -> ${damageDealt} HP damage to ${t.monster.name}${t.hp <= 0 ? ' — Defeated!' : ''}.`
        );
        // Resolve on-defeat abilities before checking victory or awarding rewards.
        const resilient = t.monster.resilient;
        if (t.hp <= 0 && resilient) {
          const revival = roll1D6(nextRng);
          nextRng = revival.nextState;
          if (revival.roll === resilient.requiredRoll) {
            t.hp = Math.min(t.monster.maxHp, resilient.reviveHp);
            t.block = 0;
            logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${t.monster.name} — Resilient: rolled 1d6 = ${revival.roll}. Returns to life with ${t.hp} HP!`);
          } else {
            logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${t.monster.name} — Resilient: rolled 1d6 = ${revival.roll} (needs ${resilient.requiredRoll}). Remains defeated.`);
          }
        }
        const retaliationDamage = t.monster.retaliationDamageOnHeroAttack ?? 0;
        if (retaliationDamage > 0 && t.hp > 0) {
          const protection = Math.min(state.divineProtection ?? 0, retaliationDamage);
          const hpDamage = retaliationDamage - protection;
          nextHeroHp = Math.max(0, nextHeroHp - hpDamage);
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 🧪 ${t.monster.name} spits retaliatory acid: Hero loses ${hpDamage} HP (ignores DEF and Block${protection > 0 ? `; ${protection} reduced by Divine Protection` : ''}).`,
          );
          if (nextHeroHp <= 0) heroKilledBy = `${t.monster.name}'s Acid Retaliation`;
        }
      } else {
        if (attackRoll.isSnakeEyes) {
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] ⚔️ Played ${card.name} on ${t.monster.name}: rolled 2d6 = [1, 1] = 2 (🐍 SNAKE EYES! Total miss!) -> 💨 Missed ${t.monster.name}!`
          );
        } else {
          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] ⚔️ Played ${card.name} on ${t.monster.name}: rolled 2d6 = [${attackRoll.die1}, ${attackRoll.die2}] = ${attackRoll.total} (${netSign}${attackRoll.netAcc} net ACC${accBonusNote} vs ${monsterEva} EVA -> needed ${attackRoll.neededRoll}+) -> 💨 Missed ${t.monster.name}!`
          );
        }
      }

      lastAttackRoll = {
        attackerName: 'Hero',
        targetName: t.monster.name,
        actionName: card.name,
        die1: attackRoll.die1,
        die2: attackRoll.die2,
        total: attackRoll.total,
        netAcc: attackRoll.netAcc,
        neededRoll: attackRoll.neededRoll,
        isHit: attackRoll.isHit,
        isCrit: attackRoll.isCrit,
        isSnakeEyes: attackRoll.isSnakeEyes,
        damageDealt,
        damageBlocked,
        defenseType: card.damageScalingStat === 'int' ? 'MDEF' : 'DEF',
        damageDefReduced,
        damagePenetrated,
      };
    }
    }
  }

  if (effect.block > 0 || effect.evasionBonus > 0) {
    logEntries.push(
      `[${createTimestamp(state.logTimestamp)}] 🛡️ Played ${card.name}: gained +${effect.block} Block${
        effect.evasionBonus > 0 ? ` & +${effect.evasionBonus} EVA this round` : ''
      }.`
    );
  }

  const inPlay = [...(combat.inPlay ?? []), ...(card.staysInPlay ? [card] : [])];
  const apGained = card.id === 'adrenalin' ? selectedDiscards.length : (card.gainAp ?? 0);
  const flagDraws = apGained > 0 ? inPlay.filter((inPlayCard) => inPlayCard.drawOnApGain).length : 0;
  // Resolution order is strict: discard costs first, draw the card's printed
  // cards, resolve AP gain and Battle Flag triggers, then move the resolving
  // card from the Stack. The played card can never be redrawn by its own effect.
  const discardAfterCosts = [...combat.discardPile, ...selectedDiscards];
  const printedDraw = (card.drawCards ?? 0) > 0
    ? drawCombatCards(combat.drawPile, discardAfterCosts, card.drawCards ?? 0, nextRng)
    : { drawn: [], drawPile: combat.drawPile, discardPile: discardAfterCosts, nextState: nextRng };
  nextRng = printedDraw.nextState;
  if (printedDraw.drawn.length > 0) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🃏 ${card.name}: drew ${printedDraw.drawn.length} card${printedDraw.drawn.length === 1 ? '' : 's'}.`);
  }
  if (apGained > 0) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] ⚡ ${card.name}: regained +${apGained} AP.`);
  }
  const triggeredDraw = flagDraws > 0
    ? drawCombatCards(printedDraw.drawPile, printedDraw.discardPile, flagDraws, nextRng)
    : { drawn: [], drawPile: printedDraw.drawPile, discardPile: printedDraw.discardPile, nextState: nextRng };
  nextRng = triggeredDraw.nextState;
  if (flagDraws > 0) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🚩 Battle Flag: drew ${flagDraws} card${flagDraws === 1 ? '' : 's'} from AP gain.`);
  }
  if (card.staysInPlay) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🚩 ${card.name} enters play for this battle.`);
  }
  const resolvedDiscard = card.staysInPlay
    ? triggeredDraw.discardPile
    : [...triggeredDraw.discardPile, card];
  logEntries.push(`[${createTimestamp(state.logTimestamp)}] ✅ ${card.name} fully resolves${card.staysInPlay ? ' from the Stack into play' : ' and moves from the Stack to the action discard pile'}.`);

  const updatedCombat: ActiveCombatState = {
    ...combat,
    monsters,
    playerAp: combat.playerAp - card.apCost + apGained,
    playerBlock: combat.playerBlock + effect.block,
    playerEvasionMod: combat.playerEvasionMod + effect.evasionBonus,
    hand: combat.hand
      .filter((candidate, idx) => idx !== cardIndex && !selectedDiscardIds.includes(candidate.instanceId))
      .concat(printedDraw.drawn, triggeredDraw.drawn),
    drawPile: triggeredDraw.drawPile,
    discardPile: resolvedDiscard,
    stack: resolvingStack.slice(0, -1),
    inPlay,
    combatLog: [...combat.combatLog, ...logEntries],
    lastAttackRoll: lastAttackRoll ?? combat.lastAttackRoll,
    lastFleeRoll: undefined,
  };

  if (heroKilledBy) {
    return syncAudioState({
      ...state,
      rngState: nextRng,
      playerResources: { ...state.playerResources, hp: 0, gold: nextGold },
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: heroKilledBy },
      bannerMessage: `You were defeated by ${heroKilledBy} on Turn ${state.turn}.`,
    });
  }

  if (monsters.every((m) => m.hp <= 0)) {
    const defeated = monsters.map((m) => m.monster);
    const totalSp = defeated.reduce((sum, m) => sum + m.statPointReward, 0);
    const baseGold = defeated.reduce((sum, m) => sum + m.goldReward, 0);
    const hasLuckyCharm = Boolean(state.equippedGear.accessory?.luckyCharmGoldBonus);
    let luckyCharmGold = 0;
    if (hasLuckyCharm) {
      const luckyRoll = rollInt(nextRng, 1, 6);
      nextRng = luckyRoll.nextState;
      luckyCharmGold = Math.max(0, luckyRoll.roll - 1);
    }
    const luckBonusGold = Math.floor(effectiveStats.luk / 2);
    const totalGold = baseGold + luckBonusGold + luckyCharmGold;
    const luckyText = hasLuckyCharm ? ` (incl. +${luckyCharmGold} Gold from Goldstar)` : '';

    const stateAfterRewards: RunState = {
      ...state,
      rngState: nextRng,
      playerResources: {
        ...state.playerResources,
        hp: nextHeroHp,
        statPoints: state.playerResources.statPoints + totalSp,
        gold: nextGold + totalGold,
      },
      monsterDiscard: [...state.monsterDiscard, ...defeated.filter((m) => !m.isBoss)],
      bannerMessage: `Defeated ${defeated.map((m) => m.name).join(' + ')}! Earned +${totalSp} Stat Point${
        totalSp === 1 ? '' : 's'
      } and +${totalGold} Gold${luckyText}!`,
    };

    const victoryDetails = {
      statPointsEarned: totalSp,
      goldEarned: totalGold,
      baseGold,
      luckBonusGold,
      luckyCharmGold,
      hasLuckyCharm,
    };

    return onCombatVictory(stateAfterRewards, defeated, victoryDetails);
  }

  return {
    ...state,
    rngState: nextRng,
    playerResources: state.playerResources
      ? { ...state.playerResources, hp: nextHeroHp, gold: nextGold }
      : state.playerResources,
    activeHook: {
      type: 'COMBAT',
      combat: updatedCombat,
    },
  };
}

export function attemptCombatFlee(state: RunState): RunState {
  if (state.activeHook.type !== 'COMBAT' || !state.playerResources) {
    return state;
  }

  const combat = { ...state.activeHook.combat };
  if (combat.playerAp < FLEE_AP_COST) {
    return state;
  }
  // Stage Bosses cannot be escaped from.
  if (combat.monsters.some((m) => m.monster.isBoss)) {
    return state;
  }

  const effectiveStats = getEffectiveStatsFromState(state);
  const threshold = getFleeThreshold(effectiveStats);
  const { roll, nextState: nextRng } = roll1D6(state.rngState);

  const isSuccess = roll <= threshold;
  const time = createTimestamp(state.logTimestamp);

  if (isSuccess) {
    // Escaped battle! Encountered monsters go to the monster discard pile.
    const monstersToDiscard = combat.monsters.map((m) => m.monster);

    return syncAudioState({
      ...state,
      rngState: nextRng,
      monsterDiscard: [...state.monsterDiscard, ...monstersToDiscard],
      activeHook: { type: 'NONE' },
      bannerMessage: `🏃 Escaped from battle! Rolled 1d6 = ${roll} (needed ≤ ${threshold}). No rewards collected.`,
    });
  }

  // Escape failed! 2 AP consumed.
  const updatedCombat: ActiveCombatState = {
    ...combat,
    playerAp: combat.playerAp - FLEE_AP_COST,
    combatLog: [
      ...combat.combatLog,
      `[${time}] 🏃 Attempted to flee: rolled 1d6 = ${roll} (needed ≤ ${threshold}) -> Failed to escape!`,
    ],
    lastAttackRoll: undefined,
    lastFleeRoll: {
      roll,
      threshold,
      success: false,
    },
  };

  return {
    ...state,
    rngState: nextRng,
    activeHook: {
      type: 'COMBAT',
      combat: updatedCombat,
    },
  };
}

export function endPlayerCombatTurn(state: RunState): RunState {
  if (state.activeHook.type !== 'COMBAT' || !state.playerResources) {
    return state;
  }

  const combat = { ...state.activeHook.combat };
  let rngState = state.rngState;
  const logEntries: string[] = [];

  let playerHp = state.playerResources.hp;
  const statusEffects = [...state.statusEffects];
  // Poison already active at End Turn ticks before enemies act. Newly applied poison
  // therefore first ticks on the hero's next End Turn, and never stacks.
  if (statusEffects.includes('poison')) {
    playerHp = Math.max(0, playerHp - 1);
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] Poison deals 1 HP damage to Hero at End Turn.`);
    if (playerHp === 0) {
      return syncAudioState({
        ...state,
        playerResources: { ...state.playerResources, hp: 0 },
        activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: 'Poison' },
        bannerMessage: 'You were defeated by Poison.',
      });
    }
  }
  let playerBlock = combat.playerBlock;
  let killedBy: string | null = null;
  let lastMonsterAttackRoll: CombatAttackRollSummary | undefined = undefined;

  let nextRoundAccMod = 0;
  let nextRoundVulnerableMod = 0;
  let nextRoundEvaMod = 0;

  // Track multi-turn Hero EVA debuffs (e.g. from Ghoul Growl)
  let currentEvaDebuffTurns = combat.playerEvaDebuffTurns ?? 0;
  if (currentEvaDebuffTurns > 0) {
    currentEvaDebuffTurns -= 1;
    if (currentEvaDebuffTurns > 0) {
      nextRoundEvaMod -= 1;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🐺 Hero's EVA remains reduced by 1 from Growl (${currentEvaDebuffTurns} turn${
          currentEvaDebuffTurns > 1 ? 's' : ''
        } remaining).`
      );
    } else {
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] ✨ Growl debuff has worn off. Hero's EVA restored.`);
    }
  }

  const monsters: CombatMonster[] = combat.monsters.map((m) => ({ ...m }));

  // Existing hexes affect this enemy phase, then lose one full hero-turn duration.
  const activeHexes = (combat.heroStatDebuffs ?? []).map(effect => ({ ...effect }));
  let nextHexes = activeHexes.map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
    .filter(effect => effect.turnsRemaining > 0);

  const monsterDeck = [...state.monsterDeck];
  const monsterDiscard = [...state.monsterDiscard];
  // Snapshot: revived creatures enter now but first act next round.
  for (const cm of [...monsters]) {
    if (cm.hp <= 0) continue;
    // Skittish expires at the hero End Turn, independently of Sprint.
    cm.evaBonus = Math.max(0, (cm.evaBonus ?? 0) - (cm.skittishEvaBonus ?? 0));
    cm.skittishEvaBonus = 0;
    cm.evaBonusTurns = Math.max(0, (cm.evaBonusTurns ?? 0) - 1);
    cm.accBonusTurns = Math.max(0, (cm.accBonusTurns ?? 0) - 1);
    cm.attackBonusTurns = Math.max(0, (cm.attackBonusTurns ?? 0) - 1);
    cm.defBonusTurns = Math.max(0, (cm.defBonusTurns ?? 0) - 1);
    if (cm.attackBonusTurns === 0) cm.attackBonus = 0;
    if (cm.defBonusTurns === 0) cm.defBonus = 0;
    const activeNegativeEffectCount = activeHexes.filter((effect) => effect.turnsRemaining > 0).length
      + (state.statusEffects?.length ?? 0)
      + (currentEvaDebuffTurns > 0 ? 1 : 0);
    const intent = getMonsterIntent(cm, monsters, activeNegativeEffectCount);
    const name = cm.monster.name;

    cm.block = intent.block;
    if (intent.defBonus && intent.defBonus !== 0) {
      cm.defBonus = intent.defBonus;
      cm.defBonusTurns = intent.bonusDuration ?? 1;
      const direction = intent.defBonus > 0 ? `gains +${intent.defBonus}` : `loses ${Math.abs(intent.defBonus)}`;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🛡️ ${name} uses ${intent.label} and ${direction} DEF for ${intent.bonusDuration ?? 1} turn.`,
      );
    }
    let healedAmount = 0;
    if (intent.heal && intent.heal > 0 && cm.hp < cm.monster.maxHp) {
      healedAmount = Math.min(cm.monster.maxHp - cm.hp, intent.heal);
      cm.hp += healedAmount;
    }

    if (intent.heal && intent.heal > 0) {
      const blockPart = intent.block > 0 ? ` and gains +${intent.block} Block` : '';
      const healPart =
        healedAmount > 0
          ? `restores +${healedAmount} HP (${cm.hp}/${cm.monster.maxHp} HP)`
          : `is already at full health (${cm.hp}/${cm.monster.maxHp} HP)`;
      const healIcon = cm.monster.templateId === 'zombie' ? '🧟' : '💚';
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${healIcon} ${name} uses ${intent.label}: ${healPart}${blockPart}.`);
    } else if (intent.block > 0) {
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🛡️ ${name} uses ${intent.label} and gains +${intent.block} Block.`);
    }

    if (intent.reviveEvery && intent.reviveTemplateId) {
      cm.channelCount = (cm.channelCount ?? 0) + 1;
      if (cm.channelCount % intent.reviveEvery === 0) {
        const index = monsterDiscard.findIndex(m => m.templateId === intent.reviveTemplateId);
        if (index >= 0) {
          const [revived] = monsterDiscard.splice(index, 1);
          monsters.push({ monster: revived, hp: revived.maxHp, block: revived.startingBlock ?? 0, patternIndex: 0 });
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${name} uses ${intent.label}: returns ${revived.name} from the monster discard pile at full HP. It acts next round.`);
        } else {
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${name} uses ${intent.label}: no Zombie in the monster discard pile to revive.`);
        }
      }
    }

    if (intent.summonFromMonsterDeck) {
      const summonIndex = monsterDeck.findIndex(monster => monster.templateId === intent.summonFromMonsterDeck);
      if (summonIndex >= 0) {
        const [summoned] = monsterDeck.splice(summonIndex, 1);
        monsters.push({ monster: summoned, hp: summoned.maxHp, block: summoned.startingBlock ?? 0, patternIndex: 0 });
        logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name} uses ${intent.label}: found ${summoned.name} in the Monster Deck and put it into play. It acts next round.`);
      } else {
        const fallbackTemplate = intent.returnDiscardToMonsterDeckOnMiss;
        const fallbackIndex = fallbackTemplate
          ? monsterDiscard.findIndex(monster => monster.templateId === fallbackTemplate)
          : -1;
        if (fallbackIndex >= 0) {
          const [returned] = monsterDiscard.splice(fallbackIndex, 1);
          monsterDeck.unshift(returned);
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name}'s call falls on deaf ears. He screams, returning 1 ${returned.name} from the Monster Discard to the top of the Monster Deck.`);
        } else {
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name}'s call falls on deaf ears. He screams, but no Goblin answers from the Monster Discard.`);
        }
      }
    }

    // 1-turn EVA bonus from intent (e.g. Basilisk 'Stalk' grants +2 EVA for 1 turn)
    if (intent.evaBonus && intent.evaBonus > 0) {
      cm.evaBonus = intent.evaBonus;
      cm.evaBonusTurns = intent.bonusDuration ?? 1;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🌿 ${name} uses ${intent.label} and gains +${intent.evaBonus} EVA for ${intent.bonusDuration ?? 1} turn(s)!`
      );
    } else if (cm.evaBonusTurns === 0) {
      cm.evaBonus = 0;
    }

    // 1-turn ACC bonus from intent (e.g. Scavenger 'Lunging Bite' adds 1 ACC for 1 turn)
    if (intent.accBonus && intent.accBonus > 0) {
      cm.accBonus = intent.accBonus;
      cm.accBonusTurns = intent.bonusDuration ?? 1;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🐺 ${name} uses ${intent.label} and gains +${intent.accBonus} ACC for ${intent.bonusDuration ?? 1} turn(s)!`
      );
    } else if (cm.accBonusTurns === 0) {
      cm.accBonus = 0;
    }

    if (intent.randomBuff && intent.randomBuff.stats.length > 0) {
      const choice = rollInt(rngState, 0, intent.randomBuff.stats.length - 1);
      rngState = choice.nextState;
      const selectedStat = intent.randomBuff.stats[choice.roll];
      const internalDuration = intent.randomBuff.duration + 1;
      if (selectedStat === 'atk') {
        cm.attackBonus = intent.randomBuff.amount;
        cm.attackBonusTurns = internalDuration;
      } else {
        cm.accBonus = intent.randomBuff.amount;
        cm.accBonusTurns = internalDuration;
      }
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🎲 ${name} uses ${intent.label}: gains +${intent.randomBuff.amount} ${selectedStat.toUpperCase()} for its next turn.`,
      );
    }

    // Troll Healer: heals a random troll for 10 HP
    if (cm.monster.templateId === 'troll_healer' && cm.hp > 0) {
      const livingTrolls = monsters.filter(
        (m) =>
          m.hp > 0 &&
          (m.monster.creatureType?.toLowerCase().includes('troll') ||
            m.monster.name.toLowerCase().includes('troll') ||
            m.monster.templateId?.startsWith('troll'))
      );
      const damagedTrolls = livingTrolls.filter((m) => m.hp < m.monster.maxHp);
      if (damagedTrolls.length > 0) {
        const rollRes = rollInt(rngState, 0, damagedTrolls.length - 1);
        rngState = rollRes.nextState;
        const targetTroll = damagedTrolls[rollRes.roll];
        const healAmt = Math.min(10, targetTroll.monster.maxHp - targetTroll.hp);
        targetTroll.hp += healAmt;
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 🌿 ${name} casts Troll Mending: restored +${healAmt} HP to ${targetTroll.monster.name} (${targetTroll.hp}/${targetTroll.monster.maxHp} HP).`
        );
      } else if (livingTrolls.length > 0) {
        const rollRes = rollInt(rngState, 0, livingTrolls.length - 1);
        rngState = rollRes.nextState;
        const targetTroll = livingTrolls[rollRes.roll];
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 🌿 ${name} casts Troll Mending on ${targetTroll.monster.name}, but wounds are already fully healed (${targetTroll.hp}/${targetTroll.monster.maxHp} HP).`
        );
      }
    }

    // Troll Hexer: Troll Hex applies one random, independently stacking 5-turn debuff.
    if (cm.monster.templateId === 'troll_hexer' && intent.label === 'Troll Hex' && cm.hp > 0 && killedBy === null) {
      const hexRoll = rollInt(rngState, 1, 3);
      rngState = hexRoll.nextState;
      const effectBase = {
        sourceId: `${cm.monster.id}:troll-hex:${combat.combatTurn}:${activeHexes.length}`,
        turnsRemaining: 5,
      };
      let effect;
      if (hexRoll.roll === 1) {
        effect = { ...effectBase, label: 'Hex of Enfeeblement', stats: { acc: 1 } };
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 🔮 ${name} casts Hex of Enfeeblement: Hero loses 1 ACC for 5 turns. The curse stacks.`
        );
      } else if (hexRoll.roll === 2) {
        effect = { ...effectBase, label: 'Hex of Vulnerability', stats: {}, damageTaken: 1 };
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 🔮 ${name} casts Hex of Vulnerability: Hero takes +1 damage for 5 turns. The curse stacks.`
        );
      } else {
        effect = { ...effectBase, label: 'Hex of Clumsiness', stats: { eva: 1 } };
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 🔮 ${name} casts Hex of Clumsiness: Hero loses 1 EVA for 5 turns. The curse stacks.`
        );
      }
      activeHexes.push(effect);
      nextHexes.push(effect);
    }

    // Hero EVA debuff from intent (e.g. Ghoul 'Growl' reduces hero EVA by 1 for 2 turns)
    if (intent.heroEvaDebuff && intent.heroEvaDebuff > 0 && cm.hp > 0 && killedBy === null) {
      const debuffVal = intent.heroEvaDebuff;
      const duration = intent.heroEvaDebuffDuration ?? 2;
      currentEvaDebuffTurns = duration;
      nextRoundEvaMod -= debuffVal;
      combat.playerEvasionMod -= debuffVal;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🐺 ${name} uses ${intent.label}: unleashes a terrifying growl that reduces Hero's EVA by ${debuffVal} for ${duration} turns!`
      );
    }

    if (intent.heroStatDebuff && !intent.heroStatDebuffOnHit && killedBy === null) {
      const applied = applyIntentHeroStatDebuff(activeHexes, nextHexes, cm.monster.id, intent);
      if (applied) {
        nextHexes = applied.nextEffects;
        const changes = Object.entries(applied.effect.stats).map(([stat, amount]) => `-${amount} ${stat.toUpperCase()}`).join(', ');
        logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${name} uses ${intent.label}: Hero gets ${changes} for ${applied.effect.turnsRemaining} turn(s).`);
      }
    }

    if (
      !intent.heroStatDebuff &&
      !intent.poisonOnHit &&
      intent.damage === 0 &&
      intent.block === 0 &&
      (!intent.heal || intent.heal === 0) &&
      (!intent.evaBonus || intent.evaBonus === 0) &&
      (!intent.accBonus || intent.accBonus === 0) &&
      (!intent.defBonus || intent.defBonus === 0) &&
      (!intent.heroEvaDebuff || intent.heroEvaDebuff === 0) &&
      !intent.randomBuff &&
      !intent.summonFromMonsterDeck &&
      cm.monster.templateId !== 'troll_healer' &&
      cm.monster.templateId !== 'troll_hexer'
    ) {
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] ⏳ ${name} did nothing.`);
    }

    if ((intent.damage > 0 || intent.poisonOnHit) && killedBy === null) {
      const hitCount = Math.max(1, intent.hitCount ?? 1);
      let onHitDebuffApplied = false;
      if (hitCount > 1) {
        logEntries.push(`[${createTimestamp(state.logTimestamp)}] ⚔️ ${name} uses ${intent.label}: resolving ${hitCount} separate attacks.`);
      }
      for (let hitIndex = 0; hitIndex < hitCount && killedBy === null; hitIndex++) {
      const monsterAcc = (cm.monster.acc ?? 1) + (cm.accBonus ?? 0);
      const effectiveStats = getEffectiveStatsFromState(state);
      const gearCombat = computeCombatGearBonuses(state.equippedGear);
      const defenseType = intent.damageType === 'magical' ? 'MDEF' : 'DEF';
      const hexMods = getHeroStatDebuffMods({ heroStatDebuffs: activeHexes });
      const heroDef = intent.damageType === 'magical'
        ? Math.max(0, getPlayerMdef(effectiveStats, gearCombat.mdef) + hexMods.mdef)
        : Math.max(0, getPlayerDef(effectiveStats, gearCombat.def) + hexMods.def - (intent.ignoreDef ?? 0));
      const playerEva = getPlayerEva(effectiveStats, combat.playerEvasionMod + hexMods.eva, gearCombat.eva);
      const attackRoll = evaluateAttackRoll(rngState, monsterAcc, playerEva);
      rngState = attackRoll.nextState;

      let damageDealt = 0;
      let damageBlocked = 0;
      let defReduction = 0;
      let protReduction = 0;

      if (!attackRoll.isHit) {
        if (attackRoll.isSnakeEyes) {
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 🛡️ ${name} uses ${intent.label} (${intent.damage} DMG): rolled 2d6 = [1, 1] = 2 (🐍 SNAKE EYES! Total miss!) -> 💨 DODGED!`
          );
        } else {
          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 🛡️ ${name} uses ${intent.label} (${intent.damage} DMG): rolled 2d6 = [${attackRoll.die1}, ${attackRoll.die2}] = ${attackRoll.total} (${netSign}${attackRoll.netAcc} net ACC vs ${playerEva} EVA -> needed ${attackRoll.neededRoll}+) -> 💨 DODGED!`
          );
        }
      } else {
        if (intent.poisonOnHit && !statusEffects.includes('poison')) {
          statusEffects.push('poison');
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${name} uses ${intent.label}: Hero is poisoned (1 HP damage after each End Turn; does not stack).`);
        }
        if (intent.heroStatDebuffOnHit && intent.heroStatDebuff && !onHitDebuffApplied) {
          const applied = applyIntentHeroStatDebuff(activeHexes, nextHexes, cm.monster.id, intent);
          if (applied) {
            nextHexes = applied.nextEffects;
            onHitDebuffApplied = true;
            const changes = Object.entries(applied.effect.stats).map(([stat, amount]) => `-${amount} ${stat.toUpperCase()}`).join(', ');
            logEntries.push(`[${createTimestamp(state.logTimestamp)}] 🕸️ ${name}'s ${intent.label} hits: Hero gets ${changes} for ${applied.effect.turnsRemaining} turn(s).`);
          }
        }
        const protection = state.divineProtection ?? 0;
        const vulnerable = (combat.playerVulnerableMod ?? 0) + getHeroDamageTakenDebuff({ heroStatDebuffs: activeHexes });
        const rawDmg = intent.damage === 0 ? 0 : attackRoll.isCrit
          ? Math.floor(intent.damage * 1.5)
          : intent.damage;
        const baseDmg = intent.damage > 0 ? rawDmg + vulnerable : 0;
        const critNote = attackRoll.isCrit ? ' [BOXCARS CRIT! +50% DMG]' : '';
        const vulnNote = vulnerable > 0 ? ` [+${vulnerable} Hex Vuln]` : '';
        defReduction = Math.min(heroDef, baseDmg);
        const defReduced = Math.max(0, baseDmg - heroDef);
        protReduction = Math.min(protection, defReduced);
        const reducedDamage = Math.max(0, defReduced - protection);
        damageBlocked = Math.min(playerBlock, reducedDamage);
        damageDealt = reducedDamage - damageBlocked;
        playerBlock -= damageBlocked;
        const actualHpDamage = Math.min(playerHp, damageDealt);
        playerHp = Math.max(0, playerHp - damageDealt);
        const defNote = (heroDef > 0 ? ` [${heroDef} ${defenseType}]` : '') + (intent.ignoreDef ? ` [ignores up to ${intent.ignoreDef} DEF]` : '');
        const protNote = protection > 0 ? ` [${protection} Divine Prot]` : '';
        const netSign = attackRoll.netAcc >= 0 ? '+' : '';
        const defAbsorbText = defReduction > 0 ? `${defReduction} absorbed by Hero ${defenseType}, ` : '';
        const protAbsorbText = protReduction > 0 ? `${protReduction} reduced by Divine Prot, ` : '';
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] ⚔️ ${name} uses ${intent.label} (${intent.damage} DMG${vulnNote}${defNote}${protNote}): rolled 2d6 = [${attackRoll.die1}, ${attackRoll.die2}] = ${attackRoll.total} (${netSign}${attackRoll.netAcc} net ACC vs ${playerEva} EVA -> needed ${attackRoll.neededRoll}+)${critNote} -> 🩸 HIT! (${defAbsorbText}${protAbsorbText}${damageBlocked} blocked, ${damageDealt} HP damage).`
        );
        if (playerHp <= 0) killedBy = name;

        // Zombie Lifesteal: heals HP equal to unblocked damage dealt to hero
        const isLifesteal =
          cm.monster.templateId === 'zombie' ||
          cm.monster.abilities.some((a) => a.toLowerCase().includes('lifesteal'));
        if ((isLifesteal || intent.drainFraction) && damageDealt > 0 && cm.hp < cm.monster.maxHp) {
          const healAmount = Math.min(cm.monster.maxHp - cm.hp, Math.floor((intent.drainFraction ? actualHpDamage : damageDealt) * (intent.drainFraction ?? 1)));
          cm.hp += healAmount;
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 🩸 ${name} drains life and restores +${healAmount} HP! (${cm.hp}/${cm.monster.maxHp} HP)`
          );
        }
      }

      lastMonsterAttackRoll = {
        attackerName: name,
        targetName: 'Hero',
        actionName: intent.label,
        die1: attackRoll.die1,
        die2: attackRoll.die2,
        total: attackRoll.total,
        netAcc: attackRoll.netAcc,
        neededRoll: attackRoll.neededRoll,
        isHit: attackRoll.isHit,
        isCrit: attackRoll.isCrit,
        isSnakeEyes: attackRoll.isSnakeEyes,
        damageDealt,
        damageBlocked,
        defenseType,
        damageDefReduced: defReduction,
        damageProtReduced: protReduction,
      };
      }
    }
    if (cm.monster.endTurnRegen && cm.hp > 0) {
      const restored = Math.min(cm.monster.endTurnRegen, cm.monster.maxHp - cm.hp);
      cm.hp += restored;
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] ${name} regenerates ${restored} HP at end of turn (${cm.hp}/${cm.monster.maxHp} HP).`);
    }
    cm.patternIndex += 1;
  }

  if (killedBy !== null) {
    return syncAudioState({
      ...state,
      rngState,
      monsterDeck,
      monsterDiscard,
      statusEffects,
      playerResources: { ...state.playerResources, hp: 0 },
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: killedBy },
      bannerMessage: `You were defeated by ${killedBy} on Turn ${state.turn}.`,
    });
  }

  // Discard remaining hand and draw 5 for next turn
  const nextDraw = drawCombatCards(
    combat.drawPile,
    [...combat.discardPile, ...combat.hand],
    PLAYER_HAND_SIZE,
    rngState
  );

  // Wizard: [Conserve] carries over unused AP to the next battle turn
  const effectiveStats = getEffectiveStatsFromState(state);
  const maxAp = getPlayerAct(effectiveStats);
  const unusedAp = combat.playerAp;
  const carryoverAp = state.playerClass === 'wizard' ? unusedAp : 0;
  if (carryoverAp > 0) {
    logEntries.push(`[${createTimestamp(state.logTimestamp)}] ✨ [Conserve] Carried over ${carryoverAp} unused AP to your next battle turn!`);
  }

  const nextCombat: ActiveCombatState = {
    ...combat,
    monsters,
    combatTurn: combat.combatTurn + 1,
    playerAp: maxAp + carryoverAp,
    playerMaxAp: maxAp,
    playerBlock: 0,
    playerEvasionMod: nextRoundEvaMod,
    playerEvaDebuffTurns: currentEvaDebuffTurns,
    playerAccMod: nextRoundAccMod,
    playerVulnerableMod: nextRoundVulnerableMod,
    heroStatDebuffs: nextHexes,
    drawPile: nextDraw.drawPile,
    hand: nextDraw.drawn,
    discardPile: nextDraw.discardPile,
    combatLog: [...combat.combatLog, ...logEntries],
    lastAttackRoll: lastMonsterAttackRoll ?? combat.lastAttackRoll,
    lastFleeRoll: undefined,
  };

  return syncAudioState({
    ...state,
    rngState: nextDraw.nextState,
    monsterDeck,
    monsterDiscard,
    statusEffects,
    playerResources: { ...state.playerResources, hp: playerHp },
    activeHook: { type: 'COMBAT', combat: nextCombat },
  });
}
