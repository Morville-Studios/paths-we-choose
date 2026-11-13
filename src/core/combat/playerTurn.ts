import { syncAudioState } from '../audio';
import { appendGameLog, createTimestamp } from '../log';
import { roll1D6, rollInt } from '../rng';
import {
  computeCombatGearBonuses,
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  getPlayerAcc,
} from '../stats';
import {
  ActiveCombatState,
  CombatAttackRollSummary,
  CombatMonster,
  MonsterCard,
  RunState,
} from '../types';
import { computeCardEffect } from './cards';
import { getHeroStatDebuffMods } from './debuffs';
import { firstLivingMonsterIndex, getMonsterEffectiveDef } from './monsters';
import { evaluateAttackRoll } from './rolls';
import { drawCombatCards } from './session';

export type CombatVictoryCallback = (
  updatedState: RunState,
  defeated: MonsterCard[],
  victoryDetails: {
    statPointsEarned: number;
    goldEarned: number;
    baseGold: number;
    luckyCharmGold: number;
    hasLuckyCharm?: boolean;
    lastAttackRolls?: CombatAttackRollSummary[];
    finalCombatState?: ActiveCombatState;
  }
) => RunState;

export function playCombatCardFromHand(
  state: RunState,
  cardInstanceId: string,
  targetIndex: number,
  onCombatVictory: CombatVictoryCallback,
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
    state.divineProtection ?? 0,
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
  const heroAttackRolls: CombatAttackRollSummary[] = [];
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
        const attackRoll = evaluateAttackRoll(nextRng, playerAcc, monsterEva);
        nextRng = attackRoll.nextState;

        // Rogue: [Steal] passive triggers on ANY pair or triples in 3d6, gaining Gold equal to the matching die face
        if (state.playerClass === 'rogue' && attackRoll.isPair && attackRoll.matchingDie) {
          const stolenGold = attackRoll.matchingDie;
          nextGold += stolenGold;
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 💰 [Steal] Rolled matching dice [${attackRoll.die1}, ${attackRoll.die2}, ${attackRoll.die3}]! Snatched +${stolenGold} Gold (Total: ${nextGold} Gold).`
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
          const finalDmg = effect.damage;
          const isMagicalAttack = card.damageScalingStat === 'int';
          const naturalMonsterDef = Math.max(0, isMagicalAttack
            ? (t.monster.mdef ?? 0)
            : getMonsterEffectiveDef(t, monsters));
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

          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          const absorbParts: string[] = [];
          if (damagePenetrated > 0) absorbParts.push(`${damagePenetrated} ${t.monster.name} DEF bypassed by PEN`);
          if (damageDefReduced > 0) absorbParts.push(`${damageDefReduced} absorbed by ${t.monster.name} ${isMagicalAttack ? 'MDEF' : 'DEF'}`);
          if (damageBlocked > 0) absorbParts.push(`${damageBlocked} blocked`);
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] ⚔️ Played ${card.name} on ${t.monster.name}: rolled 3d6 = [${attackRoll.die1}, ${attackRoll.die2}, ${attackRoll.die3}] = ${attackRoll.total} (Hit Range: [${attackRoll.minHitRoll}–${attackRoll.maxHitRoll}], Net ACC ${netSign}${attackRoll.netAcc}${accBonusNote}) -> 🎯 HIT! ${finalDmg} DMG${berzerkNote}${
              absorbParts.length > 0 ? ` (${absorbParts.join(', ')})` : ''
            } -> ${damageDealt} HP damage to ${t.monster.name}${t.hp <= 0 ? ' — Defeated!' : ''}.`
          );
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
            const hpDamage = retaliationDamage;
            nextHeroHp = Math.max(0, nextHeroHp - hpDamage);
            logEntries.push(
              `[${createTimestamp(state.logTimestamp)}] 🧪 ${t.monster.name} spits retaliatory acid: Hero loses ${hpDamage} HP (ignores DEF and Block).`,
            );
            if (nextHeroHp <= 0) heroKilledBy = `${t.monster.name}'s Acid Retaliation`;
          }
        } else {
          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          const diabolicNote = attackRoll.isDiabolic ? ' [😈 DIABOLIC ROLL! Automatic Miss]' : '';
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] ⚔️ Played ${card.name} on ${t.monster.name}: rolled 3d6 = [${attackRoll.die1}, ${attackRoll.die2}, ${attackRoll.die3}] = ${attackRoll.total} (Hit Range: [${attackRoll.minHitRoll}–${attackRoll.maxHitRoll}], Net ACC ${netSign}${attackRoll.netAcc}${accBonusNote})${diabolicNote} -> 💨 Missed ${t.monster.name} (rolled ${attackRoll.total}${attackRoll.isDiabolic ? ' - Diabolic miss!' : ' outside range'})!`
          );
        }

        lastAttackRoll = {
          attackerName: 'Hero',
          targetName: t.monster.name,
          targetIndex: target,
          actionName: card.name,
          die1: attackRoll.die1,
          die2: attackRoll.die2,
          die3: attackRoll.die3,
          total: attackRoll.total,
          netAcc: attackRoll.netAcc,
          minHitRoll: attackRoll.minHitRoll,
          maxHitRoll: attackRoll.maxHitRoll,
          isHit: attackRoll.isHit,
          isDiabolic: attackRoll.isDiabolic,
          isTriples: false,
          damageDealt,
          damageBlocked,
          defenseType: card.damageScalingStat === 'int' ? 'MDEF' : 'DEF',
          damageDefReduced,
          damagePenetrated,
        };
        heroAttackRolls.push(lastAttackRoll);
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
    lastAttackRoll: lastAttackRoll,
    lastAttackRolls: heroAttackRolls,
    lastFleeRoll: undefined,
  };

  if (heroKilledBy) {
    return syncAudioState({
      ...state,
      rngState: nextRng,
      playerResources: { ...state.playerResources, hp: 0, gold: nextGold },
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: heroKilledBy },
      gameLog: appendGameLog(state, logEntries),
      bannerMessage: `You were defeated by ${heroKilledBy} on Turn ${state.turn}.`,
    });
  }

  const defeatedSummons: MonsterCard[] = [];
  const remainingMonsters: CombatMonster[] = [];
  for (const cm of monsters) {
    if (cm.hp <= 0 && cm.isSummon) {
      defeatedSummons.push(cm.monster);
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 💀 Summoned ${cm.monster.name} was defeated and returned immediately to the Monster Discard pile (awards no SP or Gold).`
      );
    } else {
      remainingMonsters.push(cm);
    }
  }
  monsters.length = 0;
  monsters.push(...remainingMonsters);

  const nextDiscard = [...state.monsterDiscard, ...defeatedSummons];

  if (monsters.every((m) => m.hp <= 0)) {
    const defeated = monsters.map((m) => m.monster);
    const rewardMonsters = monsters.filter((m) => !m.isSummon).map((m) => m.monster);
    const totalSp = rewardMonsters.reduce((sum, m) => sum + m.statPointReward, 0);
    const baseGold = rewardMonsters.reduce((sum, m) => sum + m.goldReward, 0);
    const hasLuckyCharm = Boolean(state.equippedGear.accessory?.luckyCharmGoldBonus);
    let luckyCharmGold = 0;
    if (hasLuckyCharm) {
      const luckyRoll = rollInt(nextRng, 1, 6);
      nextRng = luckyRoll.nextState;
      luckyCharmGold = Math.max(0, luckyRoll.roll - 1);
    }
    const totalGold = baseGold + luckyCharmGold;
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
      monsterDiscard: [...nextDiscard, ...defeated.filter((m) => !m.isBoss && !defeatedSummons.some(s => s.id === m.id))],
      gameLog: appendGameLog(state, logEntries),
      bannerMessage: `Defeated ${defeated.map((m) => m.name).join(' + ')}! Earned +${totalSp} Stat Point${
        totalSp === 1 ? '' : 's'
      } and +${totalGold} Gold${luckyText}!`,
    };

    const victoryDetails = {
      statPointsEarned: totalSp,
      goldEarned: totalGold,
      baseGold,
      luckyCharmGold,
      hasLuckyCharm,
      lastAttackRolls: heroAttackRolls,
      finalCombatState: updatedCombat,
    };

    return onCombatVictory(stateAfterRewards, defeated, victoryDetails);
  }

  return {
    ...state,
    rngState: nextRng,
    monsterDiscard: nextDiscard,
    playerResources: state.playerResources
      ? { ...state.playerResources, hp: nextHeroHp, gold: nextGold }
      : state.playerResources,
    activeHook: {
      type: 'COMBAT',
      combat: updatedCombat,
    },
    gameLog: appendGameLog(state, logEntries),
  };
}
