import { syncAudioState } from '../core/audio';
import type { ActiveHook, ClassId, RunState } from '../core/types';
import { CLASS_CATALOG } from '../data/classes';

export const SAVE_STORAGE_KEY = 'paths-we-choose:saves:v1';
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_SLOT_IDS = [1, 2, 3, 4, 5] as const;
export const AUTOSAVE_SLOT_ID = 1 as const;
export const MANUAL_SAVE_SLOT_IDS = [2, 3, 4, 5] as const;

export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];
export type ManualSaveSlotId = (typeof MANUAL_SAVE_SLOT_IDS)[number];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveSlotSummary {
  classId: ClassId | null;
  className: string;
  currentMission: number;
  turn: number;
  hp: number;
  maxHp: number;
  gold: number;
  sp: number;
  hookType: ActiveHook['type'];
}

export interface SaveSlotRecord {
  slotId: SaveSlotId;
  version: number;
  isAutosave: boolean;
  label: string;
  savedAt: number;
  summary: SaveSlotSummary;
  state: RunState;
}

type SaveStorePayload = Partial<Record<string, SaveSlotRecord>>;

export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted contexts.
  }
  return null;
}

function isValidRunState(candidate: unknown): candidate is RunState {
  if (!candidate || typeof candidate !== 'object') return false;
  const s = candidate as Partial<RunState>;
  return (
    s.screen === 'play_area'
    && typeof s.turn === 'number'
    && typeof s.seed === 'string'
    && Boolean(s.board && typeof s.board === 'object')
    && Array.isArray(s.playerMasterDeck)
    && Boolean(s.activeHook && typeof s.activeHook === 'object' && 'type' in s.activeHook)
  );
}

function migrateSaveRecord(raw: unknown): SaveSlotRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Partial<SaveSlotRecord>;
  if (typeof rec.slotId !== 'number' || !SAVE_SLOT_IDS.includes(rec.slotId as SaveSlotId)) {
    return null;
  }
  if (rec.version !== SAVE_SCHEMA_VERSION) {
    return null;
  }
  if (!isValidRunState(rec.state)) {
    return null;
  }
  const clonedState = structuredClone(rec.state);
  return {
    slotId: rec.slotId as SaveSlotId,
    version: SAVE_SCHEMA_VERSION,
    isAutosave: rec.slotId === AUTOSAVE_SLOT_ID,
    label: typeof rec.label === 'string' && rec.label.trim()
      ? rec.label
      : rec.slotId === AUTOSAVE_SLOT_ID
        ? 'Autosave'
        : `Save Slot ${rec.slotId}`,
    savedAt: typeof rec.savedAt === 'number' ? rec.savedAt : 0,
    summary: buildSaveSummary(clonedState),
    state: clonedState,
  };
}

function readAllSlots(storage: StorageLike | null): SaveStorePayload {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: SaveStorePayload = {};
    for (const slotId of SAVE_SLOT_IDS) {
      const migrated = migrateSaveRecord(parsed[String(slotId)]);
      if (migrated) result[String(slotId)] = migrated;
    }
    return result;
  } catch {
    return {};
  }
}

function writeAllSlots(storage: StorageLike | null, payload: SaveStorePayload): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function buildSaveSummary(state: RunState): SaveSlotSummary {
  const classDef = state.playerClass ? CLASS_CATALOG[state.playerClass] : null;
  return {
    classId: state.playerClass,
    className: classDef?.name ?? 'Adventurer',
    currentMission: state.currentMission ?? 1,
    turn: state.turn,
    hp: state.playerResources?.hp ?? 0,
    maxHp: state.playerResources?.maxHp ?? 0,
    gold: state.playerResources?.gold ?? 0,
    sp: state.playerResources?.statPoints ?? 0,
    hookType: state.activeHook.type,
  };
}

export function listSaveSlots(
  storage: StorageLike | null = getBrowserStorage()
): (SaveSlotRecord | null)[] {
  const all = readAllSlots(storage);
  return SAVE_SLOT_IDS.map((slotId) => all[String(slotId)] ?? null);
}

export function getSaveSlot(
  slotId: SaveSlotId,
  storage: StorageLike | null = getBrowserStorage()
): SaveSlotRecord | null {
  const all = readAllSlots(storage);
  return all[String(slotId)] ?? null;
}

export function hasAnySavedRun(storage: StorageLike | null = getBrowserStorage()): boolean {
  return listSaveSlots(storage).some((slot) => slot !== null);
}

export function hasResumableAutosave(storage: StorageLike | null = getBrowserStorage()): boolean {
  const auto = getSaveSlot(AUTOSAVE_SLOT_ID, storage);
  return Boolean(auto && auto.state.activeHook.type !== 'ON_GAME_OVER');
}

function writeSlot(
  slotId: SaveSlotId,
  state: RunState,
  storage: StorageLike | null,
  savedAt: number
): SaveSlotRecord | null {
  if (state.screen !== 'play_area') return null;
  const cloned = structuredClone(state);
  const record: SaveSlotRecord = {
    slotId,
    version: SAVE_SCHEMA_VERSION,
    isAutosave: slotId === AUTOSAVE_SLOT_ID,
    label: slotId === AUTOSAVE_SLOT_ID ? 'Autosave' : `Save Slot ${slotId}`,
    savedAt,
    summary: buildSaveSummary(cloned),
    state: cloned,
  };
  const all = readAllSlots(storage);
  all[String(slotId)] = record;
  return writeAllSlots(storage, all) ? record : null;
}

/** Automatically persists every play-area action/event to Slot 1 (Autosave). */
export function autosaveRun(
  state: RunState,
  storage: StorageLike | null = getBrowserStorage(),
  now: number = Date.now()
): SaveSlotRecord | null {
  if (state.screen !== 'play_area') return null;
  return writeSlot(AUTOSAVE_SLOT_ID, state, storage, now);
}

/** Saves the current active run to one of the 4 manual save slots (Slots 2–5). */
export function saveManualSlot(
  slotId: ManualSaveSlotId,
  state: RunState,
  storage: StorageLike | null = getBrowserStorage(),
  now: number = Date.now()
): SaveSlotRecord | null {
  if (!MANUAL_SAVE_SLOT_IDS.includes(slotId)) return null;
  if (state.screen !== 'play_area' || state.activeHook.type === 'ON_GAME_OVER') return null;
  return writeSlot(slotId, state, storage, now);
}

/** Loads a saved run and syncs it into Autosave so refreshing continues the loaded timeline. */
export function loadSaveSlot(
  slotId: SaveSlotId,
  storage: StorageLike | null = getBrowserStorage(),
  now: number = Date.now()
): RunState | null {
  const record = getSaveSlot(slotId, storage);
  if (!record) return null;
  const restored = syncAudioState(structuredClone(record.state));
  if (slotId !== AUTOSAVE_SLOT_ID) {
    writeSlot(AUTOSAVE_SLOT_ID, restored, storage, now);
  }
  return restored;
}

export function deleteSaveSlot(
  slotId: SaveSlotId,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  const all = readAllSlots(storage);
  if (!all[String(slotId)]) return false;
  delete all[String(slotId)];
  return writeAllSlots(storage, all);
}
