import { audioManager } from '../audio/audioManager';
import { syncAudioState } from '../core/audio';
import { firstLivingMonsterIndex } from '../core/combat';
import { playCard } from '../core/engine';
import { computeCombatGearBonuses, getEffectiveStatsFromState, getPlayerAcc } from '../core/stats';
import type { ActiveCombatState, CombatAttackRollSummary, CombatMonster, RunState } from '../core/types';
import { autosaveRun } from '../state/saveStorage';
import type { Store } from '../state/store';
import { publicAsset } from '../ui/publicAsset';
import { updateMonsterCarouselDom, type UiState } from '../ui/render';

export interface CombatAnimatorDeps {
  root: HTMLElement;
  store: Store;
  ui: UiState;
  render: () => void;
}

export interface CombatAnimator {
  isAnimating: () => boolean;
  isTransitioningVictory: () => boolean;
  clearDiceAnimation: () => void;
  startDiceAnimation: () => void;
  settleActiveDiceRoll: () => void;
  applyNextDiceRoll: () => void;
  executeConfirmPlayCard: () => void;
  runTransitionWithDiceRolls: (transition: (s: RunState) => RunState) => CombatAttackRollSummary[];
}

function extractLastAttackRolls(state: RunState): CombatAttackRollSummary[] {
  if (state.activeHook.type === 'COMBAT') {
    return state.activeHook.combat.lastAttackRolls ?? [];
  }
  if (state.activeHook.type === 'VICTORY') {
    return state.activeHook.victory.lastAttackRolls ?? [];
  }
  const hookWithRolls = state.activeHook as { lastAttackRolls?: CombatAttackRollSummary[] };
  return hookWithRolls.lastAttackRolls ?? [];
}

/** Manages 3d6 dice-roll modals, combat damage VFX, and defeat transitions. */
export function createCombatAnimator({
  root,
  store,
  ui,
  render,
}: CombatAnimatorDeps): CombatAnimator {
  let victoryTransitioning = false;
  let combatAnimating = false;
  let activeActionRolls: CombatAttackRollSummary[] = [];
  let diceRollInterval: ReturnType<typeof setInterval> | null = null;
  let diceRollTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearDiceAnimation(): void {
    if (diceRollInterval !== null) {
      clearInterval(diceRollInterval);
      diceRollInterval = null;
    }
    if (diceRollTimeout !== null) {
      clearTimeout(diceRollTimeout);
      diceRollTimeout = null;
    }
  }

  function settleActiveDiceRoll(): void {
    clearDiceAnimation();
    if (!ui.pendingDiceRolls || ui.pendingDiceRolls.length === 0) return;
    const current = ui.pendingDiceRolls[0];
    if (!current.settled) {
      current.settled = true;
      render();
    }
  }

  function startDiceAnimation(): void {
    clearDiceAnimation();
    if (!ui.pendingDiceRolls || ui.pendingDiceRolls.length === 0) return;
    const current = ui.pendingDiceRolls[0];
    if (current.settled) return;

    diceRollInterval = setInterval(() => {
      const diceElems = root.querySelectorAll<HTMLElement>(
        '.dice-bounce-container.is-rolling .tabletop-die'
      );
      diceElems.forEach((el) => {
        el.textContent = '🎲 ' + (Math.floor(Math.random() * 6) + 1);
      });
      const totalElem = root.querySelector<HTMLElement>(
        '.dice-bounce-container.is-rolling .die-total-value'
      );
      if (totalElem) {
        totalElem.textContent = String(Math.floor(Math.random() * 16) + 3);
      }
    }, 45);

    diceRollTimeout = setTimeout(() => {
      settleActiveDiceRoll();
    }, 650);
  }

  function applyMonsterDefeatToDom(targetIdx: number, maxHp: number): void {
    const monsterUnit = root.querySelector<HTMLElement>(
      `.combat-monster-unit[data-id="${targetIdx}"]`
    );
    if (!monsterUnit) return;

    monsterUnit.classList.remove('is-selected-unit', 'selected');
    monsterUnit.classList.add('is-dead-unit', 'is-defeat-animating');

    const card = monsterUnit.querySelector<HTMLElement>('.tcg-creature');
    if (card) {
      card.classList.remove('is-targeted');
      card.classList.add('is-dead');
      if (!card.querySelector('.tcg-dead-banner')) {
        const banner = document.createElement('div');
        banner.className = 'tcg-dead-banner';
        banner.textContent = 'DEFEATED';
        card.appendChild(banner);
      }
      card.querySelector('.tcg-shield-overlay')?.remove();
    }

    const badgeTop = monsterUnit.querySelector<HTMLElement>('.combat-target-badge-top');
    if (badgeTop) {
      badgeTop.className = 'combat-target-spacer';
      badgeTop.textContent = '';
    }

    const dock = monsterUnit.querySelector<HTMLElement>('.creature-combat-dock');
    if (dock) {
      dock.classList.add('is-dead');
      const intentVal = dock.querySelector<HTMLElement>('.dock-intent-val');
      if (intentVal) {
        intentVal.innerHTML = '<span class="intent-dead">Defeated</span>';
      }
      const hpFill = dock.querySelector<HTMLElement>('.creature-hp-bar .hp-fill');
      if (hpFill) {
        hpFill.style.width = '0%';
      }
      const hpText = dock.querySelector<HTMLElement>('.creature-hp-bar .hp-text');
      if (hpText) {
        hpText.textContent = `0 / ${maxHp} HP`;
      }
    }
  }

  function applyMonsterSurvivingHpToDom(
    targetIdx: number,
    currentHp: number,
    maxHp: number,
    block = 0
  ): void {
    const monsterUnit = root.querySelector<HTMLElement>(
      `.combat-monster-unit[data-id="${targetIdx}"]`
    );
    if (!monsterUnit) return;

    const pct = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
    const dock = monsterUnit.querySelector<HTMLElement>('.creature-combat-dock');
    if (dock) {
      const hpFill = dock.querySelector<HTMLElement>('.creature-hp-bar .hp-fill');
      if (hpFill) {
        hpFill.style.width = `${pct}%`;
      }
      const hpText = dock.querySelector<HTMLElement>('.creature-hp-bar .hp-text');
      if (hpText) {
        hpText.innerHTML = `${currentHp} / ${maxHp} HP${block > 0 ? ` (+${block} &#128737;)` : ''}`;
      }
    }

    const card = monsterUnit.querySelector<HTMLElement>('.tcg-creature');
    if (card) {
      const shieldOverlay = card.querySelector<HTMLElement>('.tcg-shield-overlay');
      if (block > 0) {
        if (shieldOverlay) {
          shieldOverlay.innerHTML = `&#128737; ${block} Block`;
        } else {
          const newShield = document.createElement('div');
          newShield.className = 'tcg-shield-overlay';
          newShield.innerHTML = `&#128737; ${block} Block`;
          card.appendChild(newShield);
        }
      } else if (shieldOverlay) {
        shieldOverlay.remove();
      }
    }
  }

  function triggerMonsterDamageEffects(targetIdx: number, damage: number, blocked: number): void {
    const monsterUnit = root.querySelector<HTMLElement>(
      `.combat-monster-unit[data-id="${targetIdx}"]`
    );
    if (!monsterUnit) return;

    monsterUnit.querySelectorAll('.combat-floating-damage').forEach((el) => el.remove());
    monsterUnit.classList.remove('is-damage-shaking');
    void monsterUnit.offsetWidth;
    monsterUnit.classList.add('is-damage-shaking');

    const floatEl = document.createElement('div');
    floatEl.className =
      'combat-floating-damage' + (damage === 0 && blocked > 0 ? ' is-blocked' : '');
    floatEl.textContent = damage > 0 ? `-${damage}` : '🛡️ BLOCKED';
    monsterUnit.appendChild(floatEl);

    setTimeout(() => {
      monsterUnit.classList.remove('is-damage-shaking');
      floatEl.remove();
    }, 1100);
  }

  function triggerHeroShieldEffects(blockAmount: number): void {
    const targets = root.querySelectorAll<HTMLElement>('.hero-sidebar-vitals-card, .player-line');
    if (targets.length === 0) return;
    audioManager.playShieldSound();
    targets.forEach((targetEl) => {
      targetEl.querySelectorAll('.combat-floating-damage.is-shield').forEach((el) => el.remove());
      targetEl.classList.remove('is-shield-pulsing');
      void targetEl.offsetWidth;
      targetEl.classList.add('is-shield-pulsing');

      const floatEl = document.createElement('div');
      floatEl.classList.add('combat-floating-damage', 'is-shield');
      floatEl.innerHTML = `<img src="${publicAsset('/icons/def.png')}" alt="🛡️" class="floating-shield-icon" /> +${blockAmount}`;
      targetEl.appendChild(floatEl);

      setTimeout(() => {
        targetEl.classList.remove('is-shield-pulsing');
        floatEl.remove();
      }, 1100);
    });
  }

  function triggerMonsterAbilityEffect(
    targetIdx: number,
    variant: 'harden' | 'skittish' | 'heal',
    iconPath: string,
    label: string,
    delayMs = 0
  ): void {
    const spawn = () => {
      const monsterUnit = root.querySelector<HTMLElement>(
        `.combat-monster-unit[data-id="${targetIdx}"]`
      );
      if (!monsterUnit) return;

      monsterUnit
        .querySelectorAll(`.combat-floating-damage.is-ability-${variant}`)
        .forEach((el) => el.remove());

      const floatEl = document.createElement('div');
      floatEl.classList.add('combat-floating-damage', 'is-ability', `is-ability-${variant}`);
      floatEl.innerHTML = `<img src="${publicAsset(iconPath)}" alt="" class="floating-ability-icon" /><span>${label}</span>`;
      monsterUnit.appendChild(floatEl);

      setTimeout(() => {
        floatEl.remove();
      }, 1150);
    };

    if (delayMs > 0) {
      setTimeout(spawn, delayMs);
    } else {
      spawn();
    }
  }

  function triggerHeroHealEffects(healAmount: number): void {
    const targets = root.querySelectorAll<HTMLElement>('.hero-sidebar-vitals-card, .player-line');
    if (targets.length === 0) return;
    targets.forEach((targetEl) => {
      targetEl.querySelectorAll('.combat-floating-damage.is-ability-heal').forEach((el) => el.remove());

      const floatEl = document.createElement('div');
      floatEl.classList.add('combat-floating-damage', 'is-ability', 'is-ability-heal');
      floatEl.innerHTML = `<img src="${publicAsset('/icons/vit.png')}" alt="" class="floating-ability-icon" /><span>Heal +${healAmount}</span>`;
      targetEl.appendChild(floatEl);

      setTimeout(() => {
        floatEl.remove();
      }, 1150);
    });
  }

  function triggerAbilityTriggersFromDiff(
    prevState: RunState,
    nextState: RunState,
    monsterDelayMs = 0
  ): void {
    if (prevState.activeHook?.type !== 'COMBAT' || nextState.activeHook?.type !== 'COMBAT') {
      return;
    }

    const heroHeal =
      (nextState.playerResources?.hp ?? 0) - (prevState.playerResources?.hp ?? 0);
    if (heroHeal > 0) {
      triggerHeroHealEffects(heroHeal);
    }

    const prevMonsters = prevState.activeHook.combat.monsters;
    const nextMonsters = nextState.activeHook.combat.monsters;
    nextMonsters.forEach((mAfter, idx) => {
      const mBefore = prevMonsters[idx];
      if (!mBefore || mAfter.hp <= 0) return;

      const hardenGain = (mAfter.hardenDefBonus ?? 0) - (mBefore.hardenDefBonus ?? 0);
      if (hardenGain > 0) {
        triggerMonsterAbilityEffect(idx, 'harden', '/icons/def.png', `Hardened +${hardenGain}`, monsterDelayMs);
      }

      const skittishGain = (mAfter.skittishEvaBonus ?? 0) - (mBefore.skittishEvaBonus ?? 0);
      if (skittishGain > 0) {
        triggerMonsterAbilityEffect(idx, 'skittish', '/icons/eva.png', `Skittish +${skittishGain}`, monsterDelayMs);
      }

      const healGain = mAfter.hp - mBefore.hp;
      if (healGain > 0 && mBefore.hp > 0) {
        const isRegen =
          Boolean(mAfter.monster.regenOnStart || mAfter.monster.endTurnRegen) &&
          (healGain === mAfter.monster.regenOnStart || healGain === mAfter.monster.endTurnRegen);
        triggerMonsterAbilityEffect(
          idx,
          'heal',
          '/icons/vit.png',
          `${isRegen ? 'Regen' : 'Heal'} +${healGain}`,
          monsterDelayMs
        );
      }
    });
  }

  function runTransitionWithDiceRolls(
    transition: (s: RunState) => RunState
  ): CombatAttackRollSummary[] {
    let prevState: RunState | null = null;
    let evaluatedNext: RunState | null = null;
    let rolls: CombatAttackRollSummary[] = [];

    store.update((s: RunState) => {
      prevState = s;
      evaluatedNext = transition(s);
      rolls = extractLastAttackRolls(evaluatedNext);
      return rolls.length > 0 ? s : evaluatedNext;
    });

    if (evaluatedNext && rolls.length === 0 && prevState) {
      triggerAbilityTriggersFromDiff(prevState, evaluatedNext, 0);
    }

    if (evaluatedNext && rolls.length > 0) {
      const finalState: RunState = evaluatedNext;
      // Persist resolved outcome immediately so refreshing during dice animation cannot save-scum rolls.
      autosaveRun(finalState);
      activeActionRolls = [...rolls];
      ui.pendingDiceRolls = rolls.map((r: CombatAttackRollSummary, i: number) => ({
        roll: r,
        nextState: i === rolls.length - 1 ? finalState : undefined,
        settled: false,
      }));
      render();
      startDiceAnimation();
    }

    return rolls;
  }

  function executeConfirmPlayCard(): void {
    if (!ui.pendingCardPlay) return;
    const { cardInstanceId, targetIndex, discardedCardInstanceIds = [] } = ui.pendingCardPlay;
    ui.pendingCardPlay = null;

    const prevState = store.get();
    const prevBlock =
      prevState.activeHook?.type === 'COMBAT' ? prevState.activeHook.combat.playerBlock : 0;

    const rolls = runTransitionWithDiceRolls((s) =>
      playCard(s, cardInstanceId, targetIndex, discardedCardInstanceIds)
    );

    if (rolls.length === 0) {
      const currentState = store.get();
      const nextBlock =
        currentState.activeHook?.type === 'COMBAT' ? currentState.activeHook.combat.playerBlock : 0;
      const blockGained = Math.max(0, nextBlock - prevBlock);
      if (blockGained > 0) {
        triggerHeroShieldEffects(blockGained);
      }
    }
  }

  function applyNextDiceRoll(): void {
    if (victoryTransitioning || combatAnimating) return;
    clearDiceAnimation();
    if (!ui.pendingDiceRolls || ui.pendingDiceRolls.length === 0) return;
    const current = ui.pendingDiceRolls[0];
    if (!current.settled) {
      settleActiveDiceRoll();
      return;
    }
    ui.pendingDiceRolls.shift();
    const nextStateToSet = current.nextState;

    if (ui.pendingDiceRolls.length > 0) {
      ui.pendingDiceRolls[0].settled = false;
      render();
      startDiceAnimation();
      return;
    }

    ui.pendingDiceRolls = null;

    if (!nextStateToSet) {
      render();
      return;
    }

    const actionRolls = activeActionRolls.length > 0 ? activeActionRolls : [current.roll];
    activeActionRolls = [];

    const heroAttackRolls = actionRolls.filter((r) => r.attackerName === 'Hero');
    interface TargetDamageSummary {
      targetIndex: number;
      damage: number;
      blocked: number;
      isHit: boolean;
    }
    const targetSummaries = new Map<number, TargetDamageSummary>();
    for (const r of heroAttackRolls) {
      const idx = r.targetIndex ?? ui.targetIndex;
      const existing = targetSummaries.get(idx) ?? {
        targetIndex: idx,
        damage: 0,
        blocked: 0,
        isHit: false,
      };
      existing.damage += r.damageDealt;
      existing.blocked += r.damageBlocked;
      if (r.isHit) existing.isHit = true;
      targetSummaries.set(idx, existing);
    }

    const affectedTargets = Array.from(targetSummaries.values()).filter(
      (t) => t.isHit && (t.damage > 0 || t.blocked > 0)
    );

    if (affectedTargets.length === 0) {
      const prevForDiff = store.get();
      store.set(nextStateToSet);
      render();
      triggerAbilityTriggersFromDiff(prevForDiff, nextStateToSet, 0);
      return;
    }

    const s = store.get();
    const combatBefore = s.activeHook?.type === 'COMBAT' ? s.activeHook.combat : undefined;
    const isVictory = nextStateToSet.activeHook?.type === 'VICTORY';
    const finalCombatState =
      nextStateToSet.activeHook?.type === 'COMBAT'
        ? nextStateToSet.activeHook.combat
        : nextStateToSet.activeHook?.type === 'VICTORY'
          ? nextStateToSet.activeHook.victory.finalCombatState
          : undefined;

    if (!finalCombatState || !combatBefore) {
      store.set(nextStateToSet);
      render();
      return;
    }

    combatAnimating = true;
    const affectedIndices = new Set(affectedTargets.map((t) => t.targetIndex));

    const initialCombat: ActiveCombatState = {
      ...finalCombatState,
      monsters: finalCombatState.monsters.map((m: CombatMonster, idx: number) => {
        const before = combatBefore.monsters[idx];
        if (affectedIndices.has(idx) && before) {
          return {
            ...m,
            hp: Math.max(1, before.hp),
            block: before.block,
          };
        }
        return m;
      }),
    };

    const step1State: RunState = syncAudioState({
      ...nextStateToSet,
      activeHook: {
        type: 'COMBAT',
        combat: initialCombat,
      },
    });

    store.set(step1State);

    if (finalCombatState.monsters[ui.targetIndex]?.hp <= 0) {
      const livingNext = firstLivingMonsterIndex(finalCombatState);
      if (livingNext >= 0) {
        ui.targetIndex = livingNext;
      }
    }

    render();

    audioManager.playSlashSound();
    for (const target of affectedTargets) {
      triggerMonsterDamageEffects(target.targetIndex, target.damage, target.blocked);
    }
    triggerAbilityTriggersFromDiff(s, nextStateToSet, 180);

    setTimeout(() => {
      let anyDied = false;

      for (const target of affectedTargets) {
        const idx = target.targetIndex;
        const mAfter = finalCombatState.monsters[idx];
        const mBefore = combatBefore.monsters[idx];
        if (!mAfter) continue;
        const maxHp = mAfter.monster.maxHp ?? mBefore?.monster.maxHp ?? 10;
        const isDead = mAfter.hp <= 0;

        if (!isDead) {
          applyMonsterSurvivingHpToDom(idx, mAfter.hp, maxHp, mAfter.block ?? 0);
        } else {
          anyDied = true;
          applyMonsterDefeatToDom(idx, maxHp);
        }
      }

      if (!anyDied) {
        store.set(nextStateToSet);
        setTimeout(() => {
          combatAnimating = false;
          render();
        }, 400);
        return;
      }

      const dyingCombat: ActiveCombatState = {
        ...finalCombatState,
        monsters: finalCombatState.monsters.map((m: CombatMonster, idx: number) =>
          affectedIndices.has(idx) && finalCombatState.monsters[idx].hp <= 0
            ? { ...m, hp: 0, block: 0 }
            : m
        ),
      };
      const dyingState: RunState = syncAudioState({
        ...nextStateToSet,
        activeHook: {
          type: 'COMBAT',
          combat: dyingCombat,
        },
      });
      store.set(dyingState);

      setTimeout(() => {
        if (isVictory) {
          combatAnimating = false;
          victoryTransitioning = true;
          store.set(nextStateToSet);
          render();
          victoryTransitioning = false;
        } else {
          const livingNext = firstLivingMonsterIndex(finalCombatState);
          if (livingNext >= 0) {
            ui.targetIndex = livingNext;
          }
          store.set(nextStateToSet);
          const stats = getEffectiveStatsFromState(nextStateToSet);
          const combatGear = computeCombatGearBonuses(nextStateToSet.equippedGear);
          const playerAcc = getPlayerAcc(stats, combatGear.acc);
          const updated = updateMonsterCarouselDom(
            root,
            finalCombatState,
            ui.targetIndex,
            playerAcc
          );
          if (!updated) {
            render();
          }

          setTimeout(() => {
            combatAnimating = false;
            render();
          }, 350);
        }
      }, 750);
    }, 520);
  }

  return {
    isAnimating: () => combatAnimating,
    isTransitioningVictory: () => victoryTransitioning,
    clearDiceAnimation,
    startDiceAnimation,
    settleActiveDiceRoll,
    applyNextDiceRoll,
    executeConfirmPlayCard,
    runTransitionWithDiceRolls,
  };
}
