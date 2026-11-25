import { describe, expect, it } from 'vitest';
import { createInitialState, startAdventure } from '../core/engine';
import {
  AUTOSAVE_SLOT_ID,
  autosaveRun,
  deleteSaveSlot,
  getSaveSlot,
  hasAnySavedRun,
  hasResumableAutosave,
  listSaveSlots,
  loadSaveSlot,
  SAVE_SLOT_IDS,
  SAVE_STORAGE_KEY,
  saveManualSlot,
  type StorageLike,
} from '../state/saveStorage';

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe('saveStorage (5-slot persistence)', () => {
  it('exposes exactly 5 save slots with slot 1 reserved for autosave', () => {
    const storage = createMemoryStorage();
    expect(SAVE_SLOT_IDS).toEqual([1, 2, 3, 4, 5]);
    expect(AUTOSAVE_SLOT_ID).toBe(1);
    expect(listSaveSlots(storage)).toHaveLength(5);
    expect(listSaveSlots(storage).every((slot) => slot === null)).toBe(true);
    expect(hasAnySavedRun(storage)).toBe(false);
    expect(hasResumableAutosave(storage)).toBe(false);
  });

  it('ignores non-play_area screens for autosave and persists active runs including game over', () => {
    const storage = createMemoryStorage();
    const welcome = createInitialState('welcome-seed');
    expect(autosaveRun(welcome, storage, 1000)).toBeNull();
    expect(hasAnySavedRun(storage)).toBe(false);

    const run = startAdventure('fighter', 'run-seed-1');
    const saved = autosaveRun(run, storage, 2000);
    expect(saved).not.toBeNull();
    expect(saved?.slotId).toBe(1);
    expect(saved?.isAutosave).toBe(true);
    expect(saved?.summary.classId).toBe('fighter');
    expect(hasResumableAutosave(storage)).toBe(true);

    // Persisting ON_GAME_OVER prevents save-scumming death on refresh
    const gameOverRun = {
      ...run,
      activeHook: { type: 'ON_GAME_OVER' as const, turn: run.turn, defeatedBy: 'Goblin' },
    };
    const savedGameOver = autosaveRun(gameOverRun, storage, 3000);
    expect(savedGameOver?.summary.hookType).toBe('ON_GAME_OVER');
    expect(hasAnySavedRun(storage)).toBe(true);
    expect(hasResumableAutosave(storage)).toBe(false);
  });

  it('supports manual save, load, overwrite, and delete across slots 2..5', () => {
    const storage = createMemoryStorage();
    const run1 = startAdventure('wizard', 'seed-wiz');
    const run2 = startAdventure('rogue', 'seed-rog');

    autosaveRun(run1, storage, 100);
    const manual2 = saveManualSlot(2, run1, storage, 200);
    const manual5 = saveManualSlot(5, run2, storage, 300);

    expect(manual2?.slotId).toBe(2);
    expect(manual2?.isAutosave).toBe(false);
    expect(manual5?.slotId).toBe(5);

    // Cannot manually save a game-over run
    const gameOverRun = {
      ...run1,
      activeHook: { type: 'ON_GAME_OVER' as const, turn: run1.turn, defeatedBy: 'Goblin' },
    };
    expect(saveManualSlot(3, gameOverRun, storage, 400)).toBeNull();

    // Loading slot 5 restores rogue and syncs autosave to rogue while keeping slot 2 intact
    const loaded = loadSaveSlot(5, storage, 500);
    expect(loaded?.playerClass).toBe('rogue');
    expect(getSaveSlot(1, storage)?.summary.classId).toBe('rogue');
    expect(getSaveSlot(2, storage)?.summary.classId).toBe('wizard');

    // Deleting slot 2 leaves slots 1 and 5 intact
    expect(deleteSaveSlot(2, storage)).toBe(true);
    expect(getSaveSlot(2, storage)).toBeNull();
    expect(getSaveSlot(5, storage)?.summary.classId).toBe('rogue');
    expect(deleteSaveSlot(2, storage)).toBe(false);
  });

  it('handles corrupted or mismatched-version storage gracefully', () => {
    const storage = createMemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, '{invalid-json');
    expect(listSaveSlots(storage)).toEqual([null, null, null, null, null]);

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        '1': { slotId: 1, version: 999, state: {} },
        '2': { slotId: 2, version: 1, state: { screen: 'welcome' } },
      })
    );
    expect(listSaveSlots(storage)).toEqual([null, null, null, null, null]);
  });

  it('migrates the old payload and writes only the autosave key on later actions', () => {
    const storage = createMemoryStorage();
    const run = startAdventure('fighter', 'legacy-seed');
    const legacyRecord = autosaveRun(run, storage, 100)!;
    storage.removeItem(`${SAVE_STORAGE_KEY}:1`);
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ '1': legacyRecord }));

    const writes: string[] = [];
    const observedStorage: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => { writes.push(key); storage.setItem(key, value); },
      removeItem: (key) => storage.removeItem(key),
    };
    expect(getSaveSlot(1, observedStorage)?.savedAt).toBe(100);
    autosaveRun(run, observedStorage, 200);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    writes.length = 0;
    autosaveRun(run, observedStorage, 300);
    expect(writes).toEqual([`${SAVE_STORAGE_KEY}:1`]);
    expect(getSaveSlot(1, observedStorage)?.savedAt).toBe(300);
  });

  it('loads saved runs that still use former monster and creature field names', () => {
    const storage = createMemoryStorage();
    const run = startAdventure('fighter', 'old-card-names');
    const record = autosaveRun(run, storage, 100)!;
    const oldState = structuredClone(run) as unknown as Record<string, unknown>;
    for (const [oldKey, newKey] of [
      ['monsterDeck', 'enemyDeck'],
      ['monsterDiscard', 'enemyDiscard'],
      ['monsterVoid', 'enemyVoid'],
    ]) {
      oldState[oldKey] = oldState[newKey];
      delete oldState[newKey];
    }
    const oldDeck = oldState.monsterDeck as Array<Record<string, unknown>>;
    const firstCard = oldDeck[0];
    firstCard.creatureType = firstCard.enemyType;
    delete firstCard.enemyType;
    oldState.activeHook = {
      type: 'COMBAT',
      combat: {
        monsters: [{ monster: {
          ...firstCard,
          pattern: [{ label: 'Call', damage: 0, block: 0, summonFromMonsterDeck: 'goblin' }],
        }, hp: firstCard.maxHp, block: 0, patternIndex: 0 }],
        combatTurn: 1, playerAp: 3, playerMaxAp: 3,
        playerBlock: 0, playerEvasionMod: 0,
        drawPile: [], hand: [], discardPile: [], inPlay: [], combatLog: [],
      },
    };
    storage.setItem(`${SAVE_STORAGE_KEY}:1`, JSON.stringify({ ...record, state: oldState }));

    const migrated = getSaveSlot(1, storage);
    if (migrated?.state.activeHook.type !== 'COMBAT') throw new Error('Expected migrated combat');
    expect(migrated.state.activeHook.combat.enemies[0].enemy.pattern[0].summonFromEnemyDeck).toBe('goblin');
    const loaded = loadSaveSlot(1, storage);
    expect(loaded?.enemyDeck).toHaveLength(run.enemyDeck.length);
    expect(loaded?.enemyDeck[0].enemyType).toBe(run.enemyDeck[0].enemyType);
    expect((loaded as unknown as Record<string, unknown>).monsterDeck).toBeUndefined();
  });

  it('continues saving in the legacy format when migration exceeds storage quota', () => {
    const setup = createMemoryStorage();
    const run = startAdventure('fighter', 'quota-seed');
    const auto = autosaveRun(run, setup, 100)!;
    const manual = saveManualSlot(2, run, setup, 100)!;
    const legacy = JSON.stringify({ '1': auto, '2': manual });
    const data = new Map([[SAVE_STORAGE_KEY, legacy]]);
    const storage: StorageLike = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        const used = [...data].reduce((sum, [storedKey, storedValue]) =>
          sum + (storedKey === key ? 0 : storedValue.length), 0);
        if (used + value.length > legacy.length + 10) throw new Error('Quota exceeded');
        data.set(key, value);
      },
      removeItem: (key) => { data.delete(key); },
    };

    expect(autosaveRun(run, storage, 101)?.savedAt).toBe(101);
    expect(getSaveSlot(1, storage)?.savedAt).toBe(101);
    expect(getSaveSlot(2, storage)?.savedAt).toBe(100);
    expect(storage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();
    expect(deleteSaveSlot(2, storage)).toBe(true);
    expect(getSaveSlot(2, storage)).toBeNull();
  });
});
