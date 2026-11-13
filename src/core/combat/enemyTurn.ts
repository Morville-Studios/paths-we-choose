import { syncAudioState } from '../audio';
import { appendGameLog, createTimestamp } from '../log';
import { rollInt, shuffleArray } from '../rng';
import {
  computeCombatGearBonuses,
  getEffectiveStatsFromState,
  getPlayerAct,
  getPlayerDef,
  getPlayerEva,
  getPlayerMdef,
} from '../stats';
import {
  ActiveCombatState,
  CombatAttackRollSummary,
  CombatMonster,
  RunState,
} from '../types';
import { PLAYER_HAND_SIZE } from './constants';
import { applyIntentHeroStatDebuff, getHeroDamageTakenDebuff, getHeroStatDebuffMods } from './debuffs';
import { getMonsterIntent } from './monsters';
import { evaluateAttackRoll } from './rolls';
import { drawCombatCards } from './session';

export function endPlayerCombatTurn(state: RunState): RunState {
  if (state.activeHook.type !== 'COMBAT' || !state.playerResources) {
    return state;
  }

  const combat = { ...state.activeHook.combat };
  let rngState = state.rngState;
  const logEntries: string[] = [];

  let playerHp = state.playerResources.hp;
  const statusEffects = [...state.statusEffects];
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
  const monsterAttackRolls: CombatAttackRollSummary[] = [];

  const nextRoundAccMod = 0;
  const nextRoundVulnerableMod = 0;
  let nextRoundEvaMod = 0;

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

  const activeHexes = (combat.heroStatDebuffs ?? []).map(effect => ({ ...effect }));
  let nextHexes = activeHexes.map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
    .filter(effect => effect.turnsRemaining > 0);

  const monsterDeck = [...state.monsterDeck];
  const monsterDiscard = [...state.monsterDiscard];

  for (const cm of [...monsters]) {
    if (cm.hp <= 0) continue;

    if (cm.monster.templateId === 'king_nezenheim') {
      let healedCount = 0;
      for (const target of monsters) {
        if (target.hp > 0 && target.monster.creatureType?.toLowerCase().includes('undead')) {
          const heal = Math.min(target.monster.maxHp - target.hp, 3);
          if (heal > 0) {
            target.hp += heal;
            healedCount++;
          }
        }
      }
      if (healedCount > 0) {
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 👑 ${cm.monster.name}'s Unholy Aura pulses with dark life, restoring 3 HP to all undead allies!`
        );
      }
    }

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
        monsters.push({
          monster: summoned,
          hp: summoned.maxHp,
          block: summoned.startingBlock ?? 0,
          patternIndex: 0,
          isSummon: true,
        });
        const shuffleRes = shuffleArray(monsterDeck, rngState);
        monsterDeck.length = 0;
        monsterDeck.push(...shuffleRes.shuffled);
        rngState = shuffleRes.nextState;
        logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name} uses ${intent.label}: summoned ${summoned.name} from the Monster Deck into play and shuffled the deck. It acts next round.`);
      } else {
        const fallbackTemplate = intent.returnDiscardToMonsterDeckOnMiss;
        const fallbackIndex = fallbackTemplate
          ? monsterDiscard.findIndex(monster => monster.templateId === fallbackTemplate)
          : -1;
        if (fallbackIndex >= 0) {
          const [returned] = monsterDiscard.splice(fallbackIndex, 1);
          monsterDeck.unshift(returned);
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name}'s call finds no ${fallbackTemplate} in the Monster Deck. Retrieved ${returned.name} from the Monster Discard (FIFO) and placed it on top of the Monster Deck.`);
        } else {
          logEntries.push(`[${createTimestamp(state.logTimestamp)}] 📯 ${name}'s call finds no Goblin in the Monster Deck or Discard.`);
        }
      }
    }

    if (intent.summonUndeadFromMonsterDeck) {
      const undeadIndices = monsterDeck
        .map((m, idx) => (m.creatureType?.toLowerCase().includes('undead') ? idx : -1))
        .filter(idx => idx >= 0);
      if (undeadIndices.length > 0) {
        const pickRes = rollInt(rngState, 0, undeadIndices.length - 1);
        rngState = pickRes.nextState;
        const targetIndex = undeadIndices[pickRes.roll];
        const [summoned] = monsterDeck.splice(targetIndex, 1);
        monsters.push({
          monster: summoned,
          hp: summoned.maxHp,
          block: summoned.startingBlock ?? 0,
          patternIndex: 0,
          isSummon: true,
        });
        const shuffleRes = shuffleArray(monsterDeck, rngState);
        monsterDeck.length = 0;
        monsterDeck.push(...shuffleRes.shuffled);
        rngState = shuffleRes.nextState;
        logEntries.push(
          `[${createTimestamp(state.logTimestamp)}] 👑 ${name} uses ${intent.label}: summoned ${summoned.name} (Undead) from the Monster Deck into play! It acts next round.`
        );
      } else {
        const fallbackIndex = intent.returnUndeadDiscardToMonsterDeckOnMiss
          ? monsterDiscard.findIndex(m => m.creatureType?.toLowerCase().includes('undead'))
          : -1;
        if (fallbackIndex >= 0) {
          const [returned] = monsterDiscard.splice(fallbackIndex, 1);
          monsterDeck.unshift(returned);
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 👑 ${name}'s summon finds no Undead in the Monster Deck. Retrieved ${returned.name} from the Monster Discard (FIFO) and placed it on top of the Monster Deck.`
          );
        } else {
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 👑 ${name}'s summon finds no Undead in the Monster Deck or Discard.`
          );
        }
      }
    }

    if (intent.evaBonus && intent.evaBonus > 0) {
      cm.evaBonus = intent.evaBonus;
      cm.evaBonusTurns = intent.bonusDuration ?? 1;
      logEntries.push(
        `[${createTimestamp(state.logTimestamp)}] 🌿 ${name} uses ${intent.label} and gains +${intent.evaBonus} EVA for ${intent.bonusDuration ?? 1} turn(s)!`
      );
    } else if (cm.evaBonusTurns === 0) {
      cm.evaBonus = 0;
    }

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
      !intent.summonUndeadFromMonsterDeck &&
      cm.monster.templateId !== 'troll_healer' &&
      cm.monster.templateId !== 'troll_hexer'
    ) {
      logEntries.push(`[${createTimestamp(state.logTimestamp)}] ⏳ ${name} did nothing.`);
    }

    if ((intent.damage > 0 || (intent.magicDamage ?? 0) > 0 || intent.poisonOnHit) && killedBy === null) {
      const hitCount = Math.max(1, intent.hitCount ?? 1);
      let onHitDebuffApplied = false;
      if (hitCount > 1) {
        logEntries.push(`[${createTimestamp(state.logTimestamp)}] ⚔️ ${name} uses ${intent.label}: resolving ${hitCount} separate attacks.`);
      }
      for (let hitIndex = 0; hitIndex < hitCount && killedBy === null; hitIndex++) {
        const monsterAcc = (cm.monster.acc ?? 1) + (cm.accBonus ?? 0) + (intent.accBonus ?? 0);
        const effectiveStats = getEffectiveStatsFromState(state);
        const gearCombat = computeCombatGearBonuses(state.equippedGear);
        const defenseType = intent.damageType === 'magical' ? 'MDEF' : 'DEF';
        const hexMods = getHeroStatDebuffMods({ heroStatDebuffs: activeHexes });
        const heroPhysicalDef = Math.max(0, getPlayerDef(effectiveStats, gearCombat.def, state.divineProtection ?? 0) + hexMods.def - (intent.ignoreDef ?? 0));
        const heroMagicalDef = Math.max(0, getPlayerMdef(effectiveStats, gearCombat.mdef, state.divineProtection ?? 0) + hexMods.mdef);
        const heroDef = intent.damageType === 'magical' ? heroMagicalDef : heroPhysicalDef;
        const playerEva = getPlayerEva(effectiveStats, combat.playerEvasionMod + hexMods.eva, gearCombat.eva);
        const attackRoll = evaluateAttackRoll(rngState, monsterAcc, playerEva);
        rngState = attackRoll.nextState;

        let damageDealt = 0;
        let damageBlocked = 0;
        let defReduction = 0;

        if (!attackRoll.isHit) {
          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          const diabolicNote = attackRoll.isDiabolic ? ' [😈 DIABOLIC ROLL! Automatic Miss]' : '';
          const dmgLabel = intent.magicDamage ? `${intent.damage} Physical + ${intent.magicDamage} Magic DMG` : `${intent.damage} DMG`;
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] 🛡️ ${name} uses ${intent.label} (${dmgLabel}): rolled 3d6 = [${attackRoll.die1}, ${attackRoll.die2}, ${attackRoll.die3}] = ${attackRoll.total} (Hit Range: [${attackRoll.minHitRoll}–${attackRoll.maxHitRoll}], Net ACC ${netSign}${attackRoll.netAcc} vs ${playerEva} EVA)${diabolicNote} -> 💨 DODGED!`
          );
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
          const vulnerable = (combat.playerVulnerableMod ?? 0) + getHeroDamageTakenDebuff({ heroStatDebuffs: activeHexes });
          const vulnNote = vulnerable > 0 ? ` [+${vulnerable} Hex Vuln]` : '';
          let defReduced = 0;
          let defAbsorbText = '';
          let dmgLabel = '';

          if (intent.magicDamage && intent.magicDamage > 0) {
            const rawPhys = intent.damage;
            const rawMag = intent.magicDamage;
            const physDmg = rawPhys > 0 ? rawPhys + vulnerable : 0;
            const magDmg = rawMag > 0 ? rawMag + vulnerable : 0;
            const physAbsorb = Math.min(heroPhysicalDef, physDmg);
            const magAbsorb = Math.min(heroMagicalDef, magDmg);
            const physAfter = Math.max(0, physDmg - heroPhysicalDef);
            const magAfter = Math.max(0, magDmg - heroMagicalDef);
            defReduced = physAfter + magAfter;
            const absorbs: string[] = [];
            if (physAbsorb > 0) absorbs.push(`${physAbsorb} absorbed by DEF`);
            if (magAbsorb > 0) absorbs.push(`${magAbsorb} absorbed by MDEF`);
            defAbsorbText = absorbs.length > 0 ? `${absorbs.join(', ')}, ` : '';
            dmgLabel = `${intent.damage} Physical + ${intent.magicDamage} Magic DMG`;
          } else {
            const rawDmg = intent.damage;
            const baseDmg = intent.damage > 0 ? rawDmg + vulnerable : 0;
            defReduction = Math.min(heroDef, baseDmg);
            defReduced = Math.max(0, baseDmg - heroDef);
            defAbsorbText = defReduction > 0 ? `${defReduction} absorbed by Hero ${defenseType}, ` : '';
            dmgLabel = `${intent.damage} DMG`;
          }

          damageBlocked = Math.min(playerBlock, defReduced);
          damageDealt = defReduced - damageBlocked;
          playerBlock -= damageBlocked;
          const actualHpDamage = Math.min(playerHp, damageDealt);
          playerHp = Math.max(0, playerHp - damageDealt);
          const defNote = intent.magicDamage
            ? ` [${heroPhysicalDef} DEF / ${heroMagicalDef} MDEF]`
            : ((heroDef > 0 ? ` [${heroDef} ${defenseType}]` : '') + (intent.ignoreDef ? ` [ignores up to ${intent.ignoreDef} DEF]` : ''));
          const netSign = attackRoll.netAcc >= 0 ? '+' : '';
          logEntries.push(
            `[${createTimestamp(state.logTimestamp)}] ⚔️ ${name} uses ${intent.label} (${dmgLabel}${vulnNote}${defNote}): rolled 3d6 = [${attackRoll.die1}, ${attackRoll.die2}, ${attackRoll.die3}] = ${attackRoll.total} (Hit Range: [${attackRoll.minHitRoll}–${attackRoll.maxHitRoll}], Net ACC ${netSign}${attackRoll.netAcc} vs ${playerEva} EVA) -> 🩸 HIT! (${defAbsorbText}${damageBlocked} blocked, ${damageDealt} HP damage).`
          );
          if (playerHp <= 0) killedBy = name;

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
          defenseType,
          damageDefReduced: defReduction,
          damageProtReduced: 0,
        };
        monsterAttackRolls.push(lastMonsterAttackRoll);
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
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: killedBy, lastAttackRolls: monsterAttackRolls },
      bannerMessage: `You were defeated by ${killedBy} on Turn ${state.turn}.`,
    });
  }

  const nextDraw = drawCombatCards(
    combat.drawPile,
    [...combat.discardPile, ...combat.hand],
    PLAYER_HAND_SIZE,
    rngState
  );

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
    lastAttackRoll: lastMonsterAttackRoll,
    lastAttackRolls: monsterAttackRolls,
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
    gameLog: appendGameLog(state, [...logEntries, `[${createTimestamp(state.logTimestamp)}] 🃏 Combat Turn ${nextCombat.combatTurn}: Drew ${nextDraw.drawn.length} Action cards.`]),
  });
}
