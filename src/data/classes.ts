import classesData from '../../data/classes.json';
import { CharacterClassDef, CharacterStats, ClassId } from '../core/types';

export const STARTING_BASE_STATS: CharacterStats = classesData.startingBaseStats as CharacterStats;

export const CLASS_CATALOG: Record<ClassId, CharacterClassDef> = Object.fromEntries(
  classesData.classes
    .filter((entry) => entry.type === 'class')
    .map(({ type: _type, ...cls }) => [cls.id, cls as CharacterClassDef])
) as Record<ClassId, CharacterClassDef>;
