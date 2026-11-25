import { audioManager } from '../audio/audioManager';
import { syncAudioState } from '../core/audio';
import { firstLivingEnemyIndex } from '../core/combat';
import { playCard } from '../core/engine';
import { computeCombatGearBonuses, getEffectiveStatsFromState, getPlayerAcc } from '../core/stats';
import type { ActiveCombatState, CombatAttackRollSummary, CombatEnemy, RunState } from '../core/types';
import { autosaveRun } from '../state/saveStorage';
import type { Store } from '../state/store';
import { publicAsset } from '../ui/publicAsset';
import { updateEnemyCarouselDom, type UiState } from '../ui/render';

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

  function applyEnemyDefeatToDom(targetIdx: number, maxHp: number): void {
    const enemyUnit = root.querySelector<HTMLElement>(
      `.combat-enemy-unit[data-id="${targetIdx}"]`
    );
    if (!enemyUnit) return;

    enemyUnit.classList.remove('is-selected-unit', 'selected');
    enemyUnit.classList.add('is-dead-unit', 'is-defeat-animating');

    const card = enemyUnit.querySelector<HTMLElement>('.tcg-enemy');
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

    const badgeTop = enemyUnit.querySelector<HTMLElement>('.combat-target-badge-top');
    if (badgeTop) {
      badgeTop.className = 'combat-target-spacer';
      badgeTop.textContent = '';
    }

    const dock = enemyUnit.querySelector<HTMLElement>('.enemy-combat-dock');
    if (dock) {
      dock.classList.add('is-dead');
      const intentVal = dock.querySelector<HTMLElement>('.dock-intent-val');
      if (intentVal) {
        intentVal.innerHTML = '<span class="intent-dead">Defeated</span>';
      }
      const hpFill = dock.querySelector<HTMLElement>('.enemy-hp-bar .hp-fill');
      if (hpFill) {
        hpFill.style.width = '0%';
      }
      const hpText = dock.querySelector<HTMLElement>('.enemy-hp-bar .hp-text');
      if (hpText) {
        hpText.textContent = `0 / ${maxHp} HP`;
      }
    }
  }

  function applyEnemySurvivingHpToDom(
    targetIdx: number,
    currentHp: number,
    maxHp: number,
    block = 0
  ): void {
    const enemyUnit = root.querySelector<HTMLElement>(
      `.combat-enemy-unit[data-id="${targetIdx}"]`
    );
    if (!enemyUnit) return;

    const pct = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
    const dock = enemyUnit.querySelector<HTMLElement>('.enemy-combat-dock');
    if (dock) {
      const hpFill = dock.querySelector<HTMLElement>('.enemy-hp-bar .hp-fill');
      if (hpFill) {
        hpFill.style.width = `${pct}%`;
      }
      const hpText = dock.querySelector<HTMLElement>('.enemy-hp-bar .hp-text');
      if (hpText) {
        hpText.innerHTML = `${currentHp} / ${maxHp} HP${block > 0 ? ` (+${block} &#128737;)` : ''}`;
      }
    }

    const card = enemyUnit.querySelector<HTMLElement>('.tcg-enemy');
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

  function triggerEnemyDamageEffects(targetIdx: number, damage: number, blocked: number): void {
    const enemyUnit = root.querySelector<HTMLElement>(
      `.combat-enemy-unit[data-id="${targetIdx}"]`
    );
    if (!enemyUnit) return;

    enemyUnit.querySelectorAll('.combat-floating-damage').forEach((el) => el.remove());
    enemyUnit.classList.remove('is-damage-shaking');
    void enemyUnit.offsetWidth;
    enemyUnit.classList.add('is-damage-shaking');

    const floatEl = document.createElement('div');
    floatEl.className =
      'combat-floating-damage' + (damage === 0 && blocked > 0 ? ' is-blocked' : '');
    floatEl.textContent = damage > 0 ? `-${damage}` : '🛡️ BLOCKED';
    enemyUnit.appendChild(floatEl);

    setTimeout(() => {
      enemyUnit.classList.remove('is-damage-shaking');
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

  function triggerHeroDamageEffects(damage: number, blocked: number): void {
    const targets = root.querySelectorAll<HTMLElement>('.hero-sidebar-vitals-card, .player-line');
    if (targets.length === 0) return;
    audioManager.playSlashSound();
    targets.forEach((targetEl) => {
      targetEl.querySelectorAll('.combat-floating-damage').forEach((el) => {
        if (!el.classList.contains('is-shield') && !el.classList.contains('is-ability')) {
          el.remove();
        }
      });
      targetEl.classList.remove('is-damage-shaking');
      void targetEl.offsetWidth;
      targetEl.classList.add('is-damage-shaking');

      const floatEl = document.createElement('div');
      floatEl.className =
        'combat-floating-damage' + (damage === 0 && blocked > 0 ? ' is-blocked' : '');
      floatEl.textContent = damage > 0 ? `-${damage}` : '🛡️ BLOCKED';
      targetEl.appendChild(floatEl);

      setTimeout(() => {
        targetEl.classList.remove('is-damage-shaking');
        floatEl.remove();
      }, 1100);
    });
  }

  function applyHeroHpToDom(currentHp: number, maxHp: number, block = 0): void {
    const pct = Math.max(0, Math.min(100, Math.round((currentHp / Math.max(1, maxHp)) * 100)));
    root.querySelectorAll<HTMLElement>('.hero-sidebar-vitals-card').forEach((card) => {
      const hpFill = card.querySelector<HTMLElement>('.hero-sidebar-hp-fill');
      if (hpFill) {
        hpFill.style.width = `${pct}%`;
      }
      const hpText = card.querySelector<HTMLElement>('.hero-sidebar-hp-text');
      if (hpText) {
        const blockText = block > 0 ? ` (+${block} &#128737;)` : '';
        hpText.innerHTML = `<b>${currentHp}</b> / ${maxHp} HP${blockText}`;
      }
      const track = card.querySelector<HTMLElement>('.hero-sidebar-hp-track');
      if (track) {
        track.setAttribute('aria-valuenow', String(currentHp));
      }
    });
  }

  function triggerEnemyAbilityEffect(
    targetIdx: number,
    variant: 'harden' | 'skittish' | 'heal' | 'undying',
    iconPath: string | null,
    label: string,
    delayMs = 0
  ): void {
    const spawn = () => {
      const enemyUnit = root.querySelector<HTMLElement>(
        `.combat-enemy-unit[data-id="${targetIdx}"]`
      );
      if (!enemyUnit) return;

      enemyUnit
        .querySelectorAll(`.combat-floating-damage.is-ability-${variant}`)
        .forEach((el) => el.remove());

      const floatEl = document.createElement('div');
      floatEl.classList.add('combat-floating-damage', 'is-ability', `is-ability-${variant}`);
      const iconHtml = iconPath
        ? `<img src="${publicAsset(iconPath)}" alt="" class="floating-ability-icon" />`
        : `<span class="floating-ability-emoji" aria-hidden="true">🎲</span>`;
      floatEl.innerHTML = `${iconHtml}<span>${label}</span>`;
      enemyUnit.appendChild(floatEl);

      setTimeout(() => {
        floatEl.remove();
      }, 1350);
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
    enemyDelayMs = 0
  ): number {
    if (prevState.activeHook?.type !== 'COMBAT') {
      return 0;
    }
    const nextCombat =
      nextState.activeHook?.type === 'COMBAT'
        ? nextState.activeHook.combat
        : nextState.activeHook?.type === 'VICTORY'
        ? nextState.activeHook.victory.finalCombatState
        : undefined;
    if (!nextCombat) {
      return 0;
    }

    if (nextState.activeHook?.type === 'COMBAT') {
      const heroHeal =
        (nextState.playerResources?.hp ?? 0) - (prevState.playerResources?.hp ?? 0);
      if (heroHeal > 0) {
        triggerHeroHealEffects(heroHeal);
      }
    }

    const prevEnemies = prevState.activeHook.combat.enemies;
    const nextEnemies = nextCombat.enemies;
    const newLogs = nextCombat.combatLog.slice(prevState.activeHook.combat.combatLog.length);
    let extraReviveDelayMs = 0;

    nextEnemies.forEach((mAfter, idx) => {
      const mBefore = prevEnemies[idx];
      if (!mBefore) return;

      const tokensConsumed =
        (mBefore.undyingTokensRemaining ?? 0) - (mAfter.undyingTokensRemaining ?? 0);
      const undyingLogs = newLogs.filter((entry) =>
        entry.includes(`${mAfter.enemy.name} — Undying:`)
      );
      const resilientLogs = newLogs.filter((entry) =>
        entry.includes(`${mAfter.enemy.name} — Resilient:`)
      );

      if (tokensConsumed > 0 || undyingLogs.length > 0) {
        if (undyingLogs.length > 0) {
          undyingLogs.forEach((entry, attemptIdx) => {
            const rollMatch = entry.match(/rolled 1d6 = (\d+)/);
            const rollVal = rollMatch ? rollMatch[1] : '?';
            const revived = entry.includes('Revives');
            const label = revived
              ? `Undying 1d6=${rollVal}: Revived!`
              : `Undying 1d6=${rollVal}: Failed`;
            triggerEnemyAbilityEffect(
              idx,
              'undying',
              null,
              label,
              enemyDelayMs + attemptIdx * 600
            );
          });
          extraReviveDelayMs = Math.max(extraReviveDelayMs, undyingLogs.length * 600 + 350);
        } else {
          const revived = mAfter.hp > 0;
          triggerEnemyAbilityEffect(
            idx,
            'undying',
            null,
            revived ? 'Undying: Revived!' : 'Undying: Failed',
            enemyDelayMs
          );
          extraReviveDelayMs = Math.max(extraReviveDelayMs, 650);
        }
      } else if (resilientLogs.length > 0) {
        const entry = resilientLogs[0];
        const rollMatch = entry.match(/rolled 1d6 = (\d+)/);
        const rollVal = rollMatch ? rollMatch[1] : '?';
        const revived = entry.includes('Returns to life');
        triggerEnemyAbilityEffect(
          idx,
          'undying',
          null,
          revived ? `Resilient 1d6=${rollVal}: Revived!` : `Resilient 1d6=${rollVal}: Failed`,
          enemyDelayMs
        );
        extraReviveDelayMs = Math.max(extraReviveDelayMs, 650);
      }

      if (mAfter.hp <= 0) return;

      const hardenGain = (mAfter.hardenDefBonus ?? 0) - (mBefore.hardenDefBonus ?? 0);
      if (hardenGain > 0) {
        triggerEnemyAbilityEffect(idx, 'harden', '/icons/def.png', `Hardened +${hardenGain}`, enemyDelayMs);
      }

      const skittishGain = (mAfter.skittishEvaBonus ?? 0) - (mBefore.skittishEvaBonus ?? 0);
      if (skittishGain > 0) {
        triggerEnemyAbilityEffect(idx, 'skittish', '/icons/eva.png', `Skittish +${skittishGain}`, enemyDelayMs);
      }

      const healGain = mAfter.hp - mBefore.hp;
      if (healGain > 0 && mBefore.hp > 0 && tokensConsumed === 0 && resilientLogs.length === 0) {
        const isRegen =
          Boolean(mAfter.enemy.regenOnStart || mAfter.enemy.endTurnRegen) &&
          (healGain === mAfter.enemy.regenOnStart || healGain === mAfter.enemy.endTurnRegen);
        triggerEnemyAbilityEffect(
          idx,
          'heal',
          '/icons/vit.png',
          `${isRegen ? 'Regen' : 'Heal'} +${healGain}`,
          enemyDelayMs
        );
      }
    });

    return extraReviveDelayMs;
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

    const prevSnapshot = prevState as RunState | null;
    const nextSnapshot = evaluatedNext as RunState | null;
    if (nextSnapshot && rolls.length === 0 && prevSnapshot) {
      triggerAbilityTriggersFromDiff(prevSnapshot, nextSnapshot, 0);
      const hpLost =
        (prevSnapshot.playerResources?.hp ?? 0) - (nextSnapshot.playerResources?.hp ?? 0);
      if (hpLost > 0 && prevSnapshot.activeHook?.type === 'COMBAT') {
        triggerHeroDamageEffects(hpLost, 0);
      }
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

    const enemyHitRolls = actionRolls.filter(
      (r) => r.attackerName !== 'Hero' && r.isHit && (r.damageDealt > 0 || r.damageBlocked > 0)
    );
    const enemyDamage = enemyHitRolls.reduce((sum, r) => sum + r.damageDealt, 0);
    const enemyBlocked = enemyHitRolls.reduce((sum, r) => sum + r.damageBlocked, 0);

    if (affectedTargets.length === 0) {
      const prevForDiff = store.get();
      if (enemyHitRolls.length > 0 && prevForDiff.activeHook?.type === 'COMBAT') {
        combatAnimating = true;
        render();
        triggerHeroDamageEffects(enemyDamage, enemyBlocked);
        const nextHp = nextStateToSet.playerResources?.hp ?? 0;
        const maxHp =
          nextStateToSet.playerResources?.maxHp ?? prevForDiff.playerResources?.maxHp ?? 10;
        const nextBlock =
          nextStateToSet.activeHook?.type === 'COMBAT' ? nextStateToSet.activeHook.combat.playerBlock : 0;

        setTimeout(() => {
          applyHeroHpToDom(nextHp, maxHp, nextBlock);
          store.set(nextStateToSet);
          setTimeout(() => {
            combatAnimating = false;
            render();
            triggerAbilityTriggersFromDiff(prevForDiff, nextStateToSet, 0);
          }, 400);
        }, 520);
        return;
      }
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
      enemies: finalCombatState.enemies.map((m: CombatEnemy, idx: number) => {
        const before = combatBefore.enemies[idx];
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

    if (finalCombatState.enemies[ui.targetIndex]?.hp <= 0) {
      const livingNext = firstLivingEnemyIndex(finalCombatState);
      if (livingNext >= 0) {
        ui.targetIndex = livingNext;
      }
    }

    render();

    audioManager.playSlashSound();
    for (const target of affectedTargets) {
      triggerEnemyDamageEffects(target.targetIndex, target.damage, target.blocked);
    }
    const extraReviveDelayMs = triggerAbilityTriggersFromDiff(s, nextStateToSet, 220);

    setTimeout(() => {
      let anyDied = false;

      for (const target of affectedTargets) {
        const idx = target.targetIndex;
        const mAfter = finalCombatState.enemies[idx];
        const mBefore = combatBefore.enemies[idx];
        if (!mAfter) continue;
        const maxHp = mAfter.enemy.maxHp ?? mBefore?.enemy.maxHp ?? 10;
        const isDead = mAfter.hp <= 0;

        if (!isDead) {
          applyEnemySurvivingHpToDom(idx, mAfter.hp, maxHp, mAfter.block ?? 0);
        } else {
          anyDied = true;
          applyEnemyDefeatToDom(idx, maxHp);
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
        enemies: finalCombatState.enemies.map((m: CombatEnemy, idx: number) =>
          affectedIndices.has(idx) && finalCombatState.enemies[idx].hp <= 0
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
          const livingNext = firstLivingEnemyIndex(finalCombatState);
          if (livingNext >= 0) {
            ui.targetIndex = livingNext;
          }
          store.set(nextStateToSet);
          const stats = getEffectiveStatsFromState(nextStateToSet);
          const combatGear = computeCombatGearBonuses(nextStateToSet.equippedGear);
          const playerAcc = getPlayerAcc(stats, combatGear.acc);
          const updated = updateEnemyCarouselDom(
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
    }, 520 + extraReviveDelayMs);
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
