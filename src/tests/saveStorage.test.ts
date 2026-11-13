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
});
