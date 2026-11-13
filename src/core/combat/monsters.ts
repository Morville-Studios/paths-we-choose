import { ActiveCombatState, CombatMonster, MonsterIntent } from '../types';

export function getMonsterEffectiveAtk(
  cm: CombatMonster,
  monstersInPlay: CombatMonster[] = []
): number {
  let atk = (cm.monster.atk ?? 0) + (cm.attackBonus ?? 0);
  if (cm.monster.templateId === 'goblin_chieftain') {
    const otherGoblins = monstersInPlay.filter(
      (c) =>
        c.hp > 0 &&
        c !== cm &&
        (c.monster.templateId === 'goblin' ||
          c.monster.creatureType?.toLowerCase().includes('goblin'))
    ).length;
    atk += otherGoblins;
  }
  return atk;
}

export function getMonsterEffectiveDef(
  cm: CombatMonster,
  monstersInPlay: CombatMonster[] = []
): number {
  let def = (cm.monster.def ?? 0) + (cm.defBonus ?? 0);
  if (cm.monster.templateId === 'goblin_chieftain') {
    const otherGoblins = monstersInPlay.filter(
      (c) =>
        c.hp > 0 &&
        c !== cm &&
        (c.monster.templateId === 'goblin' ||
          c.monster.creatureType?.toLowerCase().includes('goblin'))
    ).length;
    def += otherGoblins;
  }
  return def;
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
  const atk = getMonsterEffectiveAtk(cm, monstersInPlay);
  const creatureBonus = rawIntent.damagePerCreatureInPlay
    ? monstersInPlay.filter((candidate) =>
      candidate.hp > 0 && candidate.monster.templateId === rawIntent.damagePerCreatureInPlay!.templateId
    ).length * rawIntent.damagePerCreatureInPlay.amount
    : 0;
  const isMagical = rawIntent.damageType === 'magical';
  const atkBonus = isMagical ? 0 : atk;
  return {
    ...rawIntent,
    damage: rawIntent.damage > 0
      ? Math.max(0, rawIntent.damage + atkBonus + creatureBonus + (rawIntent.damagePerHeroDebuff ?? 0) * heroDebuffCount)
      : 0,
  };
}

export function firstLivingMonsterIndex(combat: ActiveCombatState): number {
  return combat.monsters.findIndex((m) => m.hp > 0);
}
