import type { ActiveHook, RunState } from '../../core/types';
import {
  AUTOSAVE_SLOT_ID,
  listSaveSlots,
  type SaveSlotId,
  type SaveSlotRecord,
} from '../../state/saveStorage';
import type { PendingSaveAction } from '../types';

function formatHookPhase(hookType: ActiveHook['type']): string {
  switch (hookType) {
    case 'COMBAT':
      return 'In Combat';
    case 'VILLAGE':
      return 'In Village';
    case 'SHRINE':
      return 'At Shrine';
    case 'EXPLORATION':
      return 'Exploring';
    case 'ENCOUNTER_CLEAR':
      return 'Encounter Clear';
    case 'VICTORY':
      return 'Victory';
    case 'BOSS_APPROACH':
      return 'Boss Approach';
    case 'ON_GAME_OVER':
      return 'Game Over';
    default:
      return 'On Map';
  }
}

function formatSavedTime(savedAt: number): string {
  if (!savedAt) return 'Unknown time';
  try {
    return new Date(savedAt).toLocaleString();
  } catch {
    return 'Saved';
  }
}

function renderSlotRow(
  slotId: SaveSlotId,
  record: SaveSlotRecord | null,
  canSaveCurrentRun: boolean
): string {
  const isAuto = slotId === AUTOSAVE_SLOT_ID;
  const slotTitle = isAuto ? 'Slot 1 · Autosave' : `Slot ${slotId} · Manual Save`;

  if (!record) {
    return `
      <div class="save-slot-card is-empty ${isAuto ? 'is-autosave' : ''}">
        <div class="save-slot-meta">
          <div class="save-slot-title-row">
            <strong>${slotTitle}</strong>
            <span class="save-slot-badge">${isAuto ? 'Auto' : 'Empty'}</span>
          </div>
          <p class="save-slot-empty-text">
            ${isAuto ? 'Automatically records every action and event during a run.' : 'No saved adventure in this slot.'}
          </p>
        </div>
        <div class="save-slot-actions">
          ${!isAuto && canSaveCurrentRun ? `<button class="btn primary mini" data-action="save-slot" data-id="${slotId}">Save Here</button>` : ''}
        </div>
      </div>`;
  }

  const { summary } = record;
  const phaseLabel = formatHookPhase(summary.hookType);
  const timeLabel = formatSavedTime(record.savedAt);

  return `
    <div class="save-slot-card ${isAuto ? 'is-autosave' : ''} ${summary.hookType === 'ON_GAME_OVER' ? 'is-gameover' : ''}">
      <div class="save-slot-meta">
        <div class="save-slot-title-row">
          <strong>${slotTitle}</strong>
          <span class="save-slot-badge ${isAuto ? 'is-auto' : ''}">${phaseLabel}</span>
        </div>
        <div class="save-slot-details">
          <span>${summary.className}</span>
          <span>Scenario ${summary.currentMission}</span>
          <span>Turn ${summary.turn}</span>
          <span>HP ${summary.hp}/${summary.maxHp}</span>
          <span>Gold ${summary.gold}</span>
          <span>SP ${summary.sp}</span>
        </div>
        <div class="save-slot-timestamp">${timeLabel}</div>
      </div>
      <div class="save-slot-actions">
        <button class="btn primary mini" data-action="load-slot" data-id="${slotId}">Load</button>
        ${!isAuto && canSaveCurrentRun ? `<button class="btn mini" data-action="save-slot" data-id="${slotId}">Overwrite</button>` : ''}
        <button class="btn danger mini" data-action="delete-slot" data-id="${slotId}">Delete</button>
      </div>
    </div>`;
}

function renderPendingConfirmBar(pending: PendingSaveAction): string {
  const isDelete = pending.kind === 'delete';
  const prompt = isDelete
    ? `Delete ${pending.slotId === AUTOSAVE_SLOT_ID ? 'Autosave' : `Save Slot ${pending.slotId}`}? This cannot be undone.`
    : `Overwrite Save Slot ${pending.slotId} with your current adventure?`;

  return `
    <div class="save-confirm-banner">
      <span>${prompt}</span>
      <div class="save-confirm-actions">
        <button class="btn ${isDelete ? 'danger' : 'primary'} mini" data-action="confirm-save-action">
          ${isDelete ? 'Confirm Delete' : 'Confirm Overwrite'}
        </button>
        <button class="btn mini" data-action="cancel-save-action">Cancel</button>
      </div>
    </div>`;
}

export function saveModalHtml(
  state: RunState,
  pendingSaveAction: PendingSaveAction | null = null
): string {
  const slots = listSaveSlots();
  const canSaveCurrentRun =
    state.screen === 'play_area' && state.activeHook.type !== 'ON_GAME_OVER';

  return `
  <div class="modal-backdrop" data-action="close-saves-backdrop">
    <div class="modal save-modal" role="dialog" aria-modal="true" aria-label="Save & Load Adventures">
      <div class="save-modal-header">
        <div>
          <h2>Save &amp; Load Adventures</h2>
          <p class="save-modal-subtitle">Every action is auto-saved to Slot 1. You can keep up to 4 manual saves (5 slots total).</p>
        </div>
        <button class="btn mini" data-action="close-saves" aria-label="Close Save Menu">Close</button>
      </div>

      ${pendingSaveAction ? renderPendingConfirmBar(pendingSaveAction) : ''}

      <div class="save-slots-list">
        ${slots.map((record, idx) => renderSlotRow((idx + 1) as SaveSlotId, record, canSaveCurrentRun)).join('')}
      </div>

      <div class="save-modal-system-bar">
        <span class="save-modal-subtitle">Stuck on an older version? Force-refresh to clear browser caches.</span>
        <button class="btn mini" data-action="force-update" title="Clear browser caches and reload the latest version">🔄 Force Update &amp; Clear Cache</button>
      </div>
    </div>
  </div>`;
}
