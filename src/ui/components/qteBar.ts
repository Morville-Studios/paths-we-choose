import { QteBarOptions } from '../types';

/**
 * Renders the 3d6 MACG-3D6™ Success Check Bar.
 * - 16 discrete slots from 3 to 18 (each 6.25% wide).
 * - Median rolls 10 and 11 form the center Sure Hit Rolls (25% minimum success roll).
 * - Net ACC expands the emerald hit zone outward.
 * - When rolled, places the raster image token piece (qte-token.png) pointing at the rolled slot.
 */
export function renderQteHitCheckBarHtml(opts: QteBarOptions): string {
  const minHit = Math.max(3, Math.min(18, opts.minHitRoll));
  const maxHit = Math.max(minHit, Math.min(18, opts.maxHitRoll));
  const slotPct = 100 / 16;

  const hitLeftPct = (minHit - 3) * slotPct;
  const hitWidthPct = (maxHit - minHit + 1) * slotPct;
  const hitRightLeftPct = hitLeftPct + hitWidthPct;

  const diabolicSlotWidthPct = slotPct;
  const diabolicRightLeftPct = 100 - slotPct;

  const missLeftWidthPct = Math.max(0, hitLeftPct - diabolicSlotWidthPct);
  const missRightWidthPct = Math.max(0, diabolicRightLeftPct - hitRightLeftPct);

  const sureHitLeftPct = (10 - 3) * slotPct;
  const sureHitWidthPct = 2 * slotPct;

  let tokenHtml = '';
  if (opts.rolledTotal !== undefined) {
    const clampedRoll = Math.max(3, Math.min(18, opts.rolledTotal));
    const tokenLeftPct = (clampedRoll - 3 + 0.5) * slotPct;
    const isDiabolic = clampedRoll === 3 || clampedRoll === 18;
    const hitClass = isDiabolic ? 'token-diabolic' : opts.isHit ? 'token-hit' : 'token-miss';
    tokenHtml = `
      <div class="qte-token-anchor" style="left: ${tokenLeftPct}%;">
        <div class="qte-token-wrapper ${hitClass}" title="Rolled ${opts.rolledTotal}${isDiabolic ? ' (Diabolic Miss!)' : ''}">
          <img class="qte-token-img" src="/icons/qte-token.png" alt="Rolled ${opts.rolledTotal}" />
          <span class="qte-token-label">${opts.rolledTotal}</span>
        </div>
      </div>
    `;
  }

  const isCompact = opts.compact ?? false;

  return `
    <div class="qte-bar-container ${isCompact ? 'is-compact' : ''}">
      <div class="qte-bar-header">
        <span class="qte-range-label">🎯 Hit Range: <b>${minHit} – ${maxHit}</b> <span class="qte-rolls-tag">Rolls</span></span>
        ${opts.hitPercent !== undefined ? `<span class="qte-odds-badge"><b>${opts.hitPercent}%</b> chance</span>` : ''}
      </div>
      <div class="qte-bar-track-wrap">
        <div class="qte-bar-track">
          <div class="qte-zone diabolic left" style="left: 0%; width: ${diabolicSlotWidthPct}%;" title="Diabolic Roll 3: Always Misses"></div>
          ${missLeftWidthPct > 0 ? `<div class="qte-zone miss left" style="left: ${diabolicSlotWidthPct}%; width: ${missLeftWidthPct}%;"></div>` : ''}
          <div class="qte-zone hit" style="left: ${hitLeftPct}%; width: ${hitWidthPct}%;"></div>
          <div class="qte-zone sure-hit" style="left: ${sureHitLeftPct}%; width: ${sureHitWidthPct}%;" title="Sure Hit Rolls (10 &amp; 11): 25.0% Baseline">
            <div class="qte-center-notch" title="Median: 10 - 11"></div>
          </div>
          ${missRightWidthPct > 0 ? `<div class="qte-zone miss right" style="left: ${hitRightLeftPct}%; width: ${missRightWidthPct}%;"></div>` : ''}
          <div class="qte-zone diabolic right" style="left: ${diabolicRightLeftPct}%; width: ${diabolicSlotWidthPct}%;" title="Diabolic Roll 18: Always Misses"></div>
        </div>
        ${tokenHtml}
      </div>
      <div class="qte-ruler ${tokenHtml ? 'has-token' : ''}">
        <span class="qte-ruler-mark mark-diabolic mark-min" title="Diabolic Roll 3: Always Misses">3</span>
        ${minHit < 10 ? `<span class="qte-ruler-mark mark-hit-bound mark-hit-min" style="left: ${hitLeftPct}%;"><b>${minHit}</b></span>` : ''}
        <span class="qte-ruler-mark mark-sure-hit" style="left: 50%;" title="Sure Hit Rolls: 10 &amp; 11 (25.0% Baseline)"><b>10-11</b></span>
        ${maxHit > 11 ? `<span class="qte-ruler-mark mark-hit-bound mark-hit-max" style="left: ${hitRightLeftPct}%;"><b>${maxHit}</b></span>` : ''}
        <span class="qte-ruler-mark mark-diabolic mark-max" title="Diabolic Roll 18: Always Misses">18</span>
      </div>
    </div>
  `;
}
