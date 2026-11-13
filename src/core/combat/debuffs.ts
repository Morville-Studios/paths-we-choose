import { ActiveCombatState, HeroStatDebuff, MonsterIntent } from '../types';

export function getHeroStatDebuffMods(combat: Pick<ActiveCombatState, 'heroStatDebuffs'>) {
  const mods = { acc: 0, eva: 0, def: 0, mdef: 0 };
  for (const effect of combat.heroStatDebuffs ?? []) {
    if (effect.turnsRemaining <= 0) continue;
    for (const stat of ['acc', 'eva', 'def', 'mdef'] as const) mods[stat] -= effect.stats[stat] ?? 0;
  }
  return mods;
}

export function getHeroDamageTakenDebuff(combat: Pick<ActiveCombatState, 'heroStatDebuffs'>): number {
  return (combat.heroStatDebuffs ?? []).reduce(
    (total, effect) => total + (effect.turnsRemaining > 0 ? effect.damageTaken ?? 0 : 0),
    0,
  );
}

export function applyIntentHeroStatDebuff(
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
