import { getHeroStatDebuffMods } from '../../core/combat';
import { getEncounterTargetLevel } from '../../core/deck';
import {
  computeCombatGearBonuses,
  computeGearBonuses,
  getBaseStatUpgradeCost,
  getDerivedCombatStats,
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  getPlayerAcc,
  getPlayerAtk,
  getPlayerDef,
} from '../../core/stats';
import {
  DerivedCombatStats,
  InspectedCardInfo,
  RunState,
  StatKey,
} from '../../core/types';
import { getMonsterMainTerrain, getMonsterSupplyCount, MONSTER_TERRAIN_LEVELS } from '../../data/monsters';
import { PATH_CARD_CATALOG } from '../../data/paths';
import { getActionCardEffect, renderActionCardHtml } from '../actionCard';
import { getAdventureRasterArtPath } from '../cardArt';
import { getResourceIcon, getSlotIcon, getStatIcon } from '../icons';
import { getTerrainPresentation } from '../terrainPresentation';
import { UiState } from '../types';
import {
  fullCreatureCardHtml,
  getAdventureCardName,
  heroHexIntentHtml,
  renderCombatLogEntries,
  renderTcgItemCard,
  renderTcgPathCard,
} from '../render';
export function cardInspectModal(inspected: InspectedCardInfo, state: RunState): string {
  const stats = getEffectiveStatsFromState(state);

  let cardHtml = '';
  let detailHtml = '';
  let title = 'Card Details';

  if (inspected.kind === 'action') {
    const card = inspected.card;
    const combatGear = computeCombatGearBonuses(state.equippedGear);
    const eff = getActionCardEffect(card, stats, state);

    title = `${card.name} — Card Details`;

    // Card-specific formula breakdowns and live digital values.
    const scalingRows: string[] = [];
    if (card.damageScalingStat) {
      const s = card.damageScalingStat.toUpperCase();
      const statLabel = card.damageScalingStat === 'atk' || card.damageScalingStat === 'def' ? s : `Effective ${s}`;
      const div = card.damageScalingDivisor ?? 2;
      const multiplier = card.damageScalingMultiplier ?? 1;
      const sVal = card.damageScalingStat === 'atk'
        ? getPlayerAtk(stats, combatGear.atk)
          + getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp)
        : card.damageScalingStat === 'def'
        ? getPlayerDef(stats, combatGear.def)
        : stats[card.damageScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const liveAccModifier = state.activeHook.type === 'COMBAT'
        ? (state.activeHook.combat.playerAccMod ?? 0) + getHeroStatDebuffMods(state.activeHook.combat).acc
        : 0;
      const accValue = card.damageAddsAccuracy
        ? getPlayerAcc(stats, combatGear.acc) + liveAccModifier
        : 0;
      const additional = eff.damage - card.baseDamage - bonus - accValue;
      const additionalText = additional ? ` + ${additional} (DEX, gear and passive bonuses)` : '';
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      const formulaTerms = [
        card.baseDamage > 0 ? `${card.baseDamage} Base DMG` : '',
        `${multiplier === 1 ? '' : `${multiplier} × `}${formulaStat}`,
        card.damageAddsAccuracy ? 'ACC' : '',
      ].filter(Boolean).join(' + ');
      const calculationTerms = [
        card.baseDamage > 0 ? `${card.baseDamage}` : '',
        `${multiplier === 1 ? '' : `${multiplier} × `}${calculationStat}`,
        card.damageAddsAccuracy ? `${accValue} ACC` : '',
      ].filter(Boolean).join(' + ');
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">${card.id === 'melee_atk' ? 'Normal Damage Formula' : 'Damage Formula'}</span>
          <span class="formula-math">${formulaTerms}${additionalText}</span>
          <span class="formula-calc">Hero Calculation: ${calculationTerms}${additionalText} = <b>${eff.damage} DMG</b></span>
        </div>
      `);
    } else if (card.baseDamage > 0) {
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Damage</span>
          <span class="formula-math">Static: <b>${card.baseDamage} DMG</b> (No attribute scaling)</span>
        </div>
      `);
    }

    if (card.blockScalingStat && card.baseBlock > 0) {
      const s = card.blockScalingStat.toUpperCase();
      const statLabel = card.blockScalingStat === 'atk' || card.blockScalingStat === 'def' ? s : `Effective ${s}`;
      const div = card.blockScalingDivisor ?? 2;
      const multiplier = card.blockScalingMultiplier ?? 1;
      const sVal = card.blockScalingStat === 'def'
        ? getPlayerDef(stats, combatGear.def)
        : card.blockScalingStat === 'atk'
        ? getPlayerAtk(stats, combatGear.atk)
        : stats[card.blockScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Block Formula</span>
          <span class="formula-math">${card.baseBlock} Base Block + ${multiplier === 1 ? '' : `${multiplier} × `}${formulaStat}</span>
          <span class="formula-calc">Hero Calculation: ${card.baseBlock} + ${multiplier === 1 ? '' : `${multiplier} × `}${calculationStat} = ${card.baseBlock} + ${bonus} = <b>${eff.block} Block</b></span>
        </div>
      `);
    } else if (card.baseBlock > 0) {
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Block</span>
          <span class="formula-math">Static: <b>${card.baseBlock} Block</b> (No attribute scaling)</span>
        </div>
      `);
    }

    if (card.evasionScalingStat) {
      const mult = card.evasionMultiplier ?? 1;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Combat Evasion Bonus</span>
          <span class="formula-math">+${mult} to hero EVA against 3d6 attacks this turn</span>
          <span class="formula-calc">Hero Calculation: +${eff.evasionBonus} EVA to contract the enemy 3d6 hit range</span>
        </div>
      `);
    }

    if (card.accBonus) {
      const heroAcc = getPlayerAcc(stats, combatGear.acc);
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Attack Accuracy Bonus</span>
          <span class="formula-math">${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC on attack rolls</span>
          <span class="formula-calc">Hero Calculation: ${heroAcc} Hero ACC ${card.accBonus > 0 ? '+' : ''}${card.accBonus} Card ACC = <b>${heroAcc + card.accBonus} Total ACC</b></span>
        </div>
      `);
    }

    cardHtml = renderActionCardHtml(card, stats, {
      state,
      viewOnly: true,
      className: 'tcg-inspect-card',
      artWindowClassName: 'full-inspect-art',
    });

    const cardRuleItems = [
      card.staysInPlay
        ? '<li><b>Enchantment:</b> Stays in play for the rest of this battle unless an effect destroys it.</li>'
        : '',
      card.drawOnApGain
        ? '<li><b>Rally Trigger:</b> While this is in play, whenever another card effect grants AP, draw one card. Playing Battle Flag does not regain AP.</li>'
        : '',
      card.blockScalingStat || card.baseBlock > 0
        ? '<li><b>Block:</b> Absorbs incoming damage before HP and expires at the end of the turn.</li>'
        : '',
      card.evasionScalingStat
        ? '<li><b>Evasion:</b> Its temporary EVA applies against incoming monster attack rolls for this turn.</li>'
        : '',
      card.accBonus
        ? `<li><b>Accuracy:</b> Applies ${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC to this card's attack rolls.</li>`
        : '',
    ].filter(Boolean).join('');

    detailHtml = `
    <div class="inspect-detail-content">
      ${scalingRows.length > 0 ? `<div class="inspect-section">
        <h3>⚔️ Effect &amp; Live Calculation</h3>
        <div class="inspect-formulas">
          ${scalingRows.join('')}
        </div>
      </div>` : ''}

      <div class="inspect-section">
        <h3>📜 Lore &amp; Flavor Text</h3>
        <blockquote class="inspect-quote">
          &ldquo;${card.flavorText ?? 'A standard martial action honed in the grasslands realm.'}&rdquo;
        </blockquote>
      </div>

      ${cardRuleItems ? `<div class="inspect-section">
        <h3>🎲 Card-Specific Rules</h3>
        <ul class="inspect-bullet-list">${cardRuleItems}</ul>
      </div>` : ''}
    </div>`;
  } else if (inspected.kind === 'monster') {
    const m = inspected.monster;
    title = `${m.name} (Monster Card Reference)`;
    const attackBonus = inspected.attackBonus ?? 0;

    // Pattern steps
    const patternHtml = m.pattern.map((step, i) => {
      const effDmg = step.damage > 0 ? step.damage + attackBonus : 0;
      const isBuffed = step.damage > 0 && attackBonus > 0;
      return `
      <div class="inspect-pattern-step ${isBuffed ? 'is-buffed-step' : ''}">
        <span class="pattern-turn">T${i + 1}:</span>
        ${step.poisonOnHit ? '<span>Poison on hit</span>' : ''}
        ${step.ignoreDef ? `<span>Ignore ${step.ignoreDef} DEF</span>` : ''}
        <span class="pattern-intent-desc">
          ${
            effDmg > 0
              ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}"><b>${effDmg}</b> ${step.damageType === 'magical' ? 'MATK' : 'DMG'}${(step.hitCount ?? 1) > 1 ? ` ×${step.hitCount}` : ''}${
                  isBuffed ? ` <small class="muted">(Base ${step.damage} + ${attackBonus} Boon)</small>` : ''
                }</span>`
              : ''
          }${
            step.heal && step.heal > 0
              ? (effDmg > 0 ? ' &middot; ' : '') + '+' + step.heal + ' HP'
              : ''
          }${
            step.block > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) ? ' &middot; ' : '') + '+' + step.block + ' Block'
              : ''
          }${
            step.evaBonus && step.evaBonus > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 ? ' &middot; ' : '') + '+' + step.evaBonus + ' EVA'
              : ''
          }${
            step.accBonus && step.accBonus > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 || (step.evaBonus && step.evaBonus > 0) ? ' &middot; ' : '') + '+' + step.accBonus + ' ACC'
              : ''
          }${
            step.defBonus && step.defBonus !== 0
              ? (effDmg > 0 || (step.heal ?? 0) > 0 || step.block > 0 ? ' &middot; ' : '') + `${step.defBonus > 0 ? '+' : ''}${step.defBonus} DEF (${step.bonusDuration ?? 1} turn)`
              : ''
          }${
            step.randomBuff
              ? (effDmg > 0 || step.block > 0 ? ' &middot; ' : '') + `Random +${step.randomBuff.amount} ${step.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')} (${step.randomBuff.duration} turn)`
              : ''
          }${
            step.damagePerHeroDebuff
              ? ` &middot; +${step.damagePerHeroDebuff} MATK per active Hero debuff`
              : ''
          }${
            step.heroStatDebuff ? `${effDmg > 0 ? ' &middot; ' : ''}${heroHexIntentHtml(step)}${step.heroStatDebuffOnHit ? ' on hit' : ''}` : step.heroEvaDebuff && step.heroEvaDebuff > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 || (step.evaBonus && step.evaBonus > 0) || (step.accBonus && step.accBonus > 0) ? ' &middot; ' : '') + '-' + step.heroEvaDebuff + ' Hero EVA (' + (step.heroEvaDebuffDuration ?? 2) + ' turns)'
              : ''
          }${
            !step.heroStatDebuff && !step.poisonOnHit && !step.randomBuff && !step.defBonus && effDmg === 0 && step.block === 0 && (!step.heal || step.heal === 0) && (!step.evaBonus || step.evaBonus === 0) && (!step.accBonus || step.accBonus === 0) && (!step.heroEvaDebuff || step.heroEvaDebuff === 0) ? 'Idle' : ''
          }
        </span>
      </div>`;
    }).join('');

    cardHtml = fullCreatureCardHtml({
      monster: m,
      attackBonus,
      className: 'tcg-inspect-card',
      artWindowClassName: 'full-inspect-art',
    });

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>👹 Encounter &amp; Spawn Profile</h3>
        <p><b>Level:</b> ${m.level} &middot; <b>Max HP:</b> ${m.maxHp} &middot; <b>ACC:</b> ${m.acc ?? 1} &middot; <b>EVA:</b> ${m.eva ?? 0}</p>
        ${m.isBoss
          ? '<p><b>Card Pool:</b> Separate scenario Boss card</p>'
          : `<p><b>Physical copies:</b> ${getMonsterSupplyCount(m)}</p>`}
        <p><b>Main Terrain:</b> ${getMonsterMainTerrain(m)} (Terrain Level ${MONSTER_TERRAIN_LEVELS[getMonsterMainTerrain(m)]})</p>
        <p><b>Spawn Terrains:</b> ${(m.spawnTerrains ?? []).map(terrain => terrain === 'grasslands' ? 'Grasslands 🌿' : terrain === 'forest' ? 'Forests 🌲' : terrain === 'swamp' ? 'Swamps 🪷' : terrain === 'cave' ? 'Caves 🪨' : terrain === 'underground' ? 'Underground ⛏️' : terrain === 'underworld' ? 'Underworld 🔥' : terrain).join(', ')}</p>
        <p><b>Rewards upon Defeat:</b> <span class="reward-chip sp">${getResourceIcon('sp', 'chip-icon')} +${m.statPointReward} Stat Points</span> <span class="reward-chip gold">${getResourceIcon('gold', 'chip-icon')} +${m.goldReward} Gold</span></p>
      </div>

      <div class="inspect-section inspect-boons-section">
        <h3>✨ Active Boons &amp; Combat Enhancements</h3>
        ${
          inspected.activeBoons && inspected.activeBoons.length > 0
            ? inspected.activeBoons
                .map(
                  (b) => `
              <div class="inspect-boon-card active">
                <div class="boon-card-header">
                  <span class="boon-card-icon">🔥</span>
                  <span class="boon-card-title">${b.name}</span>
                  <span class="boon-card-pill is-buffed-flashing">${b.value}</span>
                </div>
                <p class="boon-card-desc">${b.description}</p>
              </div>`
                )
                .join('')
            : '<p class="muted">No temporary combat boons currently active on this creature.</p>'
        }
      </div>

      <div class="inspect-section">
        <h3>🔄 Cycling AI Attack Pattern</h3>
        <p class="muted">The monster cycles through these moves in order every combat round:</p>
        <div class="inspect-patterns">
          ${patternHtml}
        </div>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Flavor Text</h3>
        <blockquote class="inspect-quote">
          &ldquo;${m.flavorText ?? 'A creature dwelling in the tall plains.'}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 3d6 QTE Combat Rules</h3>
        <ul class="inspect-bullet-list">
          <li><b>Attack Roll:</b> Rolls <code>3x 1d6</code> (3d6) evaluated on the <b>MACG-3D6™ Success Check Bar</b> (range 3–18). Center Sure Hit Rolls: rolls <b>10 &amp; 11</b> provide a guaranteed minimum <b>25.0%</b> base hit chance.</li>
          <li><b>Net Accuracy &amp; Dodge:</b> <code>Net ACC = Attacker ACC (${m.acc ?? 1}) - Target EVA</code>. Each +1 net ACC expands the hit range outward from the median by 1 on each side (e.g. +1 net ACC expands hit range from 10–11 to 9–12, 48.1% hit chance).</li>
          <li><b>Diabolic Rolls (3 &amp; 18):</b> Rolls of 3 and 18 are Diabolic rolls that always guarantee a chance to miss regardless of ACC. No critical hit multipliers exist.</li>
          <li><b>Inscribed Stat Points:</b> Defeating this monster awards <b>+${m.statPointReward} SP</b>. SP is converted into permanent Base Stats exclusively at Sacred Shrines.</li>
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'adventure') {
    const card = inspected.card;
    const cardName = getAdventureCardName(card);
    title = `${cardName} (Land Card Reference)`;
    const rasterArt = getAdventureRasterArtPath(card);
    const terrain = getTerrainPresentation(card.terrain);
    const encounterTargetLevel = getEncounterTargetLevel(card.level);
    const typeLine = card.terrain === 'start'
      ? 'Land — Starting Crossroads'
      : `Land — ${cardName}`;

    cardHtml = `
    <div class="tcg-card tcg-adventure ${terrain.templateClass} tcg-inspect-card">
      <div class="tcg-inner-frame">
        <header class="tcg-header tcg-land-header">
          <div class="tcg-title-left">
            <span class="tcg-name">${cardName}</span>
          </div>
          <div class="tcg-header-right">
            ${card.level > 0 ? `<span class="adv-level-badge">Lvl ${card.level}</span>` : ''}
            <span class="tcg-spawn-badge ${terrain.badgeClass}">${terrain.icon}</span>
          </div>
        </header>

        <div class="tcg-art-window adv-art-window full-inspect-art">
          <img src="${rasterArt}" alt="${cardName}" class="tcg-art-raster adventure-raster" />
        </div>

        <div class="tcg-art-spacer adv-art-spacer"></div>

        <div class="tcg-textbox">
          <p class="adv-inspect-summary">
            ${
              card.hasHostile
                ? `<b>Encounter Zone (Level ${card.level}):</b> Draws monsters from the Monster Deck matching ${terrain.pluralLabel} ${terrain.icon} until total monster level &ge; ${encounterTargetLevel}.`
                : card.hasVillage
                ? `<b>Village Haven:</b> Sanctuary offering Rest (Inn), Shop (Weapons, Armor, Accessories), and Card Training (Drafting / Removal).`
                : card.hasShrine
                ? `<b>Sacred Altar:</b> Spend Stat Points to permanently upgrade Base Stats (cost: <code>baseStat &times; 10 SP</code>), and pray for 1 map-temporary divine boon.`
                : card.terrain === 'start'
                ? `<b>Starting Crossroads:</b> Your expedition begins here before stepping onto the adventure board.`
                : `<b>Undiscovered Terrain (Level ${card.level}):</b> Draws a card from the Paths Deck, triggering sidequests, ambushes, or hidden caches.`
            }
          </p>
          ${card.flavorText ? `<p class="tcg-flavor-text">${card.flavorText}</p>` : ''}
        </div>
      </div>
    </div>`;

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>🗺️ ${cardName} &middot; Tabletop Land Rules</h3>
        <p><b>Card Classification:</b> ${typeLine}</p>
        <p><b>Collector Number:</b> ${card.cardNumber ?? 'ADV · #001'}</p>
        <p><b>Terrain Region:</b> ${terrain.label} ${terrain.icon}</p>
        <p><b>Encounter &amp; Amenity Rules:</b> ${
          card.hasHostile
            ? `Stepping onto this card initiates an encounter. Monsters are drawn from the Monster Deck matching <code>spawnTerrains.includes('${card.terrain}')</code> until total creature level &ge; ${encounterTargetLevel}.`
            : card.hasVillage
            ? `Safe resting haven. Resting restores 2 HP per 1 Gold (up to full HP). Shop stocks ${5 + card.level} items from the Treasure Deck (Levels ${Math.max(1, card.level - 1)}–${card.level}) with live stat delta previews. Training offers 3 skills from the New Skills Deck or destroys a card to the Void.`
            : card.hasShrine
            ? `Sacred sanctuary. Automatically grants 1 eligible divine boon on arrival (1 active blessing at a time). Converts Stat Points into permanent Base Stats up to Base ${card.level + 1} at cost (B &times; 10) SP.${card.level >= 2 ? ' Also supports upgrading owned skills from the Void.' : ''}`
            : card.terrain === 'start'
            ? 'Starting tile where your expedition begins.'
            : `Stepping onto this card draws the top card from the Paths Deck, triggering a terrain-leveled sidequest or challenge (such as an Enemy Camp ambush, stealth check, or treasure discovery) scaled to Level ${card.level}.`
        }</p>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Field Notes</h3>
        <blockquote class="inspect-quote">
          &ldquo;${card.flavorText ?? 'An untamed expanse of the realm where wanderers make their choice.'}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Tabletop Adventure Board Architecture</h3>
        <ul class="inspect-bullet-list">
          <li><b>Vision Cone:</b> Revealed in a 3-row inverted pyramid cone (Row 1: 2 choices, Row 2: 3 lookahead cards).</li>
          <li><b>9-Card Lagging Conservation:</b> Moving to row R sweeps only Row R-1 to discard, keeping up to 9 cards on the board across Rows R, R+1, and R+2.</li>
          <li><b>Physical Print Format:</b> Official standard 5:7 aspect ratio (2.5&quot; &times; 3.5&quot;) with raster art and full tabletop mechanics.</li>
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'path') {
    const card = inspected.card;
    const cat = PATH_CARD_CATALOG.find((c) => c.templateId === card.templateId);
    const copies = inspected.copies ?? cat?.copies ?? 5;
    const flavor =
      cat?.flavorText ??
      'You wander into an enemy camp and spot hostiles ahead. Pass an AGI Sneak Check to slip past unnoticed, then roll DEX Treasure Discovery for loot.';
    title = `${card.name} (Path Card Reference)`;
    cardHtml = renderTcgPathCard(card, { extraClasses: 'tcg-inspect-card' });

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>🧭 ${card.name} &middot; Tabletop Path Rules</h3>
        <p><b>Card Classification:</b> Path — Challenge</p>
        <p><b>Collector Number:</b> ${card.cardNumber}</p>
        <p><b>Physical copies:</b> ${copies} in Paths Deck</p>
        ${
          card.templateId === 'merchant'
            ? `<p><b>Wandering Offer:</b> Draws the top 2 cards from the Treasure Deck and offers them for sale at <b>double your Charisma DISC</b> (rounded up, minimum 1 Gold).</p>
               <p><b>Choice:</b> Purchase any offered item if your Gold allows, or decline and leave (unbought items are discarded to the Treasure Discard Pile).</p>`
            : card.templateId === 'sanctuary'
            ? `<p><b>Free Rest Area:</b> Fully restores the hero&apos;s HP to Max HP at no Gold cost.</p>`
            : card.templateId === 'ambush'
            ? `<p><b>Sudden Ambush:</b> Immediately starts a combat Encounter matching this terrain and level, with <b>the creatures taking their turn first</b> before the player.</p>`
            : card.templateId === 'magical_chest'
            ? `<p><b>Checks:</b> Force Open (<code>STR &minus; (3 + 2&times;Lvl)</code>), Lockpick (<code>DEX &minus; (3 + 2&times;Lvl)</code>), Remove Seal (<code>INT &minus; (1 + 2&times;Lvl)</code>), or Abandon safely.</p>
               <p><b>Outcome:</b> Success grants the top Treasure card. Failure detonates the chest, destroying the item inside and dealing <b>3 damage</b>.</p>`
            : card.templateId === 'trapped_chest'
            ? `<p><b>Checks:</b> Force Open (<code>STR &minus; (3 + 2&times;Lvl)</code>), Lockpick (<code>DEX &minus; (1 + 2&times;Lvl)</code>), or Abandon safely.</p>
               <p><b>Outcome:</b> Success grants the top Treasure card. Failure detonates the chest, destroying the item inside and dealing <b>3 damage</b>.</p>`
            : card.templateId === 'gold_stash'
            ? `<p><b>1d6 Gold Roll:</b> Roll 1–3 for <b>+10 Gold</b>, 4–5 for <b>+20 Gold</b>, or 6 for <b>+30 Gold</b>.</p>`
            : card.templateId === 'spring_trap'
            ? `<p><b>Dodge Check:</b> <code>AGI &minus; (1 + 2&times;Lvl)</code> on the <b>MACG-3D6&trade; Success Check Bar</b>. Succeed to avoid harm; fail to suffer <b>4 direct damage</b>.</p>`
            : `<p><b>Sneak Check:</b> <code>AGI &minus; (Terrain Lvl &times; 2)</code> on the <b>MACG-3D6&trade; Success Check Bar</b>. On failure, treat the terrain as an Encounter (fleeing forfeits Treasure Discovery).</p>
               <p><b>Treasure Discovery:</b> After sneaking past or winning, roll <code>DEX &minus; (Terrain Lvl &times; 2)</code>. On success, draw from the Treasure Deck until an item with <code>Lvl &le; Terrain Lvl</code> is found (higher-level cards are discarded).</p>`
        }
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Field Notes</h3>
        <blockquote class="inspect-quote">
          &ldquo;${flavor}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 MIDS&trade; &amp; MACG-3D6&trade; Path Architecture</h3>
        <ul class="inspect-bullet-list">
          <li><b>Undiscovered Trigger:</b> Stepping onto an Undiscovered Terrain always draws the top card from the Paths Deck.</li>
          <li><b>Morville Infinite Deck System&trade; (MIDS&trade;):</b> Resolved Path cards enter the Paths Discard Pile and reshuffle automatically when the Paths Deck runs empty.</li>
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'item') {
    const item = inspected.item;
    title = `${item.name} (Physical TCG Item Reference)`;
    const slotIcon =
      item.category === 'weapon'
        ? getSlotIcon('weapon', 'badge-icon')
        : item.category === 'armor'
        ? getSlotIcon('armor', 'badge-icon')
        : item.category === 'accessory'
        ? getSlotIcon('accessory', 'badge-icon')
        : '🧪';
    const isEquip = item.category !== 'consumable';
    const typeLine = isEquip
      ? `Equipment — ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`
      : 'Item — Consumable';

    cardHtml = renderTcgItemCard(item, 'tcg-inspect-card');

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>${slotIcon} ${item.name} &middot; Equipment Profile</h3>
        <p><b>Classification:</b> ${typeLine} &middot; <b>Level:</b> ${item.level ?? 1}</p>
        <p><b>Base Buy Price:</b> ${item.buyPrice} Gold &middot; <b>Resell Value:</b> ${item.sellPrice} Gold</p>
      </div>

      <div class="inspect-section">
        <h3>⚔️ Tabletop Stat Mechanics</h3>
        <p class="muted">Live character calculations &amp; physical rules:</p>
        <ul class="inspect-bullet-list">
          ${item.gearBonus?.atk ? `<li><b>Physical ATK (+${item.gearBonus.atk}):</b> Adds +${item.gearBonus.atk} damage to all physical attacks. (Hero ATK = &lfloor;STR / 2&rfloor; + Weapon ATK).</li>` : ''}
          ${item.gearBonus?.acc ? `<li><b>Accuracy (+${item.gearBonus.acc} ACC):</b> Adds +${item.gearBonus.acc} to hero attack rolls.</li>` : ''}
          ${item.gearBonus?.def ? `<li><b>Physical DEF (+${item.gearBonus.def}):</b> Reduces incoming physical damage by ${item.gearBonus.def} per hit. (Hero DEF = &lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF).</li>` : ''}
          ${item.gearBonus?.matk ? `<li><b>Magical ATK &amp; DEF (+${item.gearBonus.matk} MATK, +${item.gearBonus.mdef} MDEF):</b> Boosts spell scaling and magic defense. (Hero MATK = &lfloor;INT / 2&rfloor; + Weapon, Hero MDEF = &lfloor;INT / 5&rfloor; + Armor MDEF).</li>` : ''}
          ${item.gearBonus?.eva ? `<li><b>Evasion (+${item.gearBonus.eva}):</b> Adds +${item.gearBonus.eva} EVA to evade incoming 3d6 attack rolls.</li>` : ''}
          ${item.gearBonus?.pen ? `<li><b>Penetration (+${item.gearBonus.pen} PEN):</b> Physical hero attacks ignore up to ${item.gearBonus.pen} of an enemy's natural DEF before temporary Block applies. Magical attacks still use MDEF and do not gain PEN.</li>` : ''}
          ${item.statBonus?.str ? `<li><b>Strength (+${item.statBonus.str} STR):</b> Increases Effective STR by ${item.statBonus.str}, granting +${item.statBonus.str * 2} Max HP and boosting melee scaling.</li>` : ''}
          ${item.statBonus?.vit ? `<li><b>Vitality (+${item.statBonus.vit} VIT):</b> Increases Effective VIT by ${item.statBonus.vit}, granting +${item.statBonus.vit * 2} Max HP and physical defense scaling.</li>` : ''}
          ${item.statBonus?.dex ? `<li><b>Dexterity (+${item.statBonus.dex} DEX):</b> Increases Effective DEX by ${item.statBonus.dex}, boosting accuracy and physical attack scaling.</li>` : ''}
          ${item.statBonus?.int ? `<li><b>Intellect (+${item.statBonus.int} INT):</b> Increases Effective INT by ${item.statBonus.int}, boosting spell damage, MATK, and MDEF.</li>` : ''}
          ${item.statBonus?.agi ? `<li><b>Agility (+${item.statBonus.agi} AGI):</b> Increases Effective AGI by ${item.statBonus.agi}, boosting baseline Evasion.</li>` : ''}
          ${item.healAmount ? `<li><b>Consumable Elixir:</b> Restores ${item.healAmount} HP immediately when used from backpack.</li>` : ''}
          ${item.luckyCharmGoldBonus ? `<li><b>Fortune Blessing:</b> Produces an extra <code>1d6 - 1</code> Gold (0–5 Gold) after every victorious combat encounter!</li>` : ''}
        </ul>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Field Notes</h3>
        <blockquote class="inspect-quote">
          &ldquo;${item.flavorText ?? item.description}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Tabletop Gear Architecture</h3>
        <ul class="inspect-bullet-list">
          <li><b>Equipment Slots:</b> 1 item equipped per slot (Weapon, Armor, Accessory). Equipping a new item automatically moves the replaced gear to your backpack.</li>
          <li><b>Shop Reselling:</b> Replaced gear stored in your backpack can be sold at any Village Shop for 50% gold value.</li>
          <li><b>Physical Print Format:</b> Official standard 5:7 aspect ratio (2.5&quot; &times; 3.5&quot;) collectible item card.</li>
        </ul>
      </div>
    </div>`;
  }

  return `
  <div class="modal-backdrop inspection-backdrop card-inspect-backdrop" data-action="close-inspect-backdrop">
    <div class="modal card-inspect-modal">
      <div class="inspect-header">
        <div>
          <h2>${title}</h2>
          <p class="muted">Card effect, live calculations, and reference details.</p>
        </div>
        <button class="btn mini" data-action="close-inspect" aria-label="Close card inspect">&times; Close</button>
      </div>

      <div class="inspect-body">
        ${cardHtml ? `<div class="inspect-card-wrap">${cardHtml}</div>` : ''}
        ${detailHtml}
      </div>

      <div class="inspect-footer">
        <button class="btn primary" data-action="close-inspect">Back to Game</button>
      </div>
    </div>
  </div>`;
}

const STAT_DESCRIPTIONS: Record<
  StatKey,
  {
    name: string;
    role: string;
    derivedRules: (effVal: number, derived: DerivedCombatStats) => string[];
  }
> = {
  str: {
    name: 'Strength',
    role: 'Physical muscle power, weapon force and martial toughness',
    derivedRules: (eff, derived) => [
      `<b>Physical Attack (ATK):</b> Grants <code>&lfloor;STR / 2&rfloor; + &lfloor;DEX / 3&rfloor; + Weapon ATK</code>. Adds flat bonus damage to normal physical attack cards (e.g. <i>Slash</i>). Current Physical ATK: <b>${derived.atk} ATK</b> (STR contributes <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code>).`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF</code>. STR, AGI, and VIT combine to deflect and minimize damage from physical hits. Current Physical DEF: <b>${derived.def} DEF</b>.`,
      `<b>Martial Scaling:</b> Amplifies physical action cards that scale directly with STR.`,
    ],
  },
  dex: {
    name: 'Dexterity',
    role: 'Precision, coordination, attack accuracy and martial finesse',
    derivedRules: (eff, derived) => [
      `<b>Combat Accuracy (ACC):</b> 1 point in DEX increases ACC by 1 (<code>DEX + Gear ACC</code>). Current: <b>${derived.acc} ACC</b>.`,
      `<b>Physical Attack Contribution:</b> Increases Physical ATK by <b>+1 for every 3 Effective DEX</b> (<code>&lfloor;DEX / 3&rfloor;</code>). Current DEX ATK bonus: <b>+${Math.floor(eff / 3)} ATK</b>.`,
      `<b>MACG-3D6™ Tabletop Attack Rolls:</b> Determines roll range against target Evasion (<code>Net ACC = Attacker ACC - Target EVA</code>; Baseline +0 Net ACC is Tier 4 <code>7–14</code>, 81.5%). Positive Net ACC expands up to Tier 7 (&ge; +3 Net ACC, <code>4–17</code>, 99.1%); lower Net ACC contracts toward Tier 1 (&le; -3 Net ACC, <code>10–11</code>, 25.0% Sure Hit Rolls).`,
    ],
  },
  agi: {
    name: 'Agility',
    role: 'Reflexes, evasion, footwork and physical defense',
    derivedRules: (_eff, derived) => [
      `<b>Combat Evasion (EVA):</b> 1 point in AGI increases EVA by 1 (<code>AGI + Gear EVA</code>). Current: <b>${derived.eva} EVA</b>.`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF</code>. AGI footwork and body tilting deflect incoming blows alongside STR and VIT. Current Physical DEF: <b>${derived.def} DEF</b>.`,
      `<b>MACG-3D6™ Monster Attack Dodge:</b> Each point of EVA directly reduces incoming monster Net ACC, shrinking their hit range toward Tier 1 (&le; -3 Net ACC, <code>10–11</code>, 25.0% Sure Hit Rolls).`,
    ],
  },
  int: {
    name: 'Intellect',
    role: 'Arcane acumen, spellcraft, magic resilience and battle action capacity',
    derivedRules: (eff, derived) => [
      `<b>Max Action Points (ACT):</b> Starts at <b>3 Base AP</b> and increases by <b>+1 ACT for every 5 Effective INT</b> (<code>3 + &lfloor;INT / 5&rfloor;</code>). Current: <b>${derived.act} Max AP</b> in battle (Base 3 + <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
      `<b>Magical Attack (MATK):</b> Grants <code>&lfloor;INT / 2&rfloor; + Weapon MATK</code>. Adds flat bonus damage to magical spell cards (e.g. <i>Fireball ATK</i>). Current MATK: <b>${derived.matk} MATK</b> (Base <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code> + Weapon).`,
      `<b>Magical Defense (MDEF):</b> Grants <code>&lfloor;INT / 5&rfloor; + Armor MDEF</code> (increases by 1 for every 5 INT). Current MDEF: <b>${derived.mdef} MDEF</b> (INT contributes <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
    ],
  },
  cha: {
    name: 'Charisma',
    role: 'Charm, bargaining power and social presence',
    derivedRules: (eff) => [
      `<b>Village Shop Discount (DISC):</b> Grants a <b>5% price discount</b> per Effective CHA on all goods purchased at Village Shops (minimum 1 Gold). Current discount: <b>-${eff * 5}% off all items</b>.`,
      `<b>Economic Compounding:</b> Allows heroes to acquire high-tier weapons, armor, accessories, and health potions at significantly lower gold costs.`,
      `<b>Future Encounters:</b> Will be utilized for peaceful path events, wandering merchant negotiations, and faction dialogue.`,
    ],
  },
  vit: {
    name: 'Vitality',
    role: 'Bodily constitution, life force and physical resilience',
    derivedRules: (eff, derived) => [
      `<b>Max Health (Max HP):</b> Increases Hero Max HP by <b>+2 HP</b> per Effective VIT (<code>Max HP = 10 + Effective VIT &times; 2</code>). Current: <b>${10 + eff * 2} Max HP</b>.`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF</code>. Fortitude combines with STR and AGI to deflect and minimize incoming physical damage. Current Physical DEF: <b>${derived.def} DEF</b>.`,
      `<b>Frontline Endurance:</b> Raising VIT immediately grants +2 current HP and +2 Max HP, keeping your hero alive through long dungeon delves.`,
    ],
  },
};

export function statInspectModal(stat: StatKey, state: RunState): string {
  const eff = getEffectiveStatsFromState(state);
  const gear = computeGearBonuses(state.equippedGear);
  const derived = getDerivedCombatStats(eff, state.equippedGear, 0, 0, state.divineProtection ?? 0);
  const sp = state.playerResources?.statPoints ?? 0;
  const base = state.playerBaseStats[stat];
  const classBonus = state.playerClassBonuses[stat];
  const blessing = state.playerBlessingBonuses?.[stat] ?? 0;
  const gearBonus = gear[stat] ?? 0;
  const cost = getBaseStatUpgradeCost(base);
  const info = STAT_DESCRIPTIONS[stat];
  const className = state.playerClass === 'wizard' ? 'Wizard' : state.playerClass === 'rogue' ? 'Rogue' : 'Fighter';

  return `
  <div class="modal-backdrop inspection-backdrop stat-inspect-backdrop" data-action="close-inspect-backdrop">
    <div class="modal stat-inspect-modal">
      <div class="inspect-header">
        <div class="stat-inspect-title-group">
          <span class="stat-inspect-badge-icon">${getStatIcon(stat, 'badge-icon')}</span>
          <div>
            <h2>${info.name} (${stat.toUpperCase()}) Attribute Profile</h2>
            <p class="muted">${info.role}</p>
          </div>
        </div>
        <button class="btn mini" data-action="close-inspect" aria-label="Close stat inspect">&times; Close</button>
      </div>

      <div class="inspect-body stat-inspect-body">
        <!-- 1. Full computation to get the final value -->
        <div class="inspect-section">
          <h3>📊 Effective Stat Value Breakdown</h3>
          <div class="stat-calc-box">
            <div class="stat-calc-header">
              <span class="calc-label">Effective ${stat.toUpperCase()} Value:</span>
              <span class="calc-hero-val">${getStatIcon(stat, 'stat-icon')} <b>${eff[stat]}</b></span>
            </div>
            <div class="stat-calc-formula">
              <code>Effective ${stat.toUpperCase()} = Innate (1) + Base (${base}) + Class Bonus (+${classBonus}) ${blessing > 0 ? `+ Blessing (+${blessing}) ` : ''}${gearBonus > 0 ? `+ Gear (+${gearBonus}) ` : ''}= ${eff[stat]}</code>
            </div>
            <div class="stat-calc-components">
              <div class="calc-row">
                <span class="comp-name">Innate Stat Baseline:</span>
                <span class="comp-val"><b>+1</b> <small class="muted">(innate baseline for all adventurers)</small></span>
              </div>
              <div class="calc-row">
                <span class="comp-name">Base Stat Level:</span>
                <span class="comp-val"><b>${base}</b> <small class="muted">(permanently upgraded with Stat Points at Shrines)</small></span>
              </div>
              <div class="calc-row">
                <span class="comp-name">${className} Class Archetype Bonus:</span>
                <span class="comp-val"><b>+${classBonus}</b> <small class="muted">(innate class archetype bonus)</small></span>
              </div>
              ${
                blessing > 0
                  ? `<div class="calc-row">
                <span class="comp-name">Shrine Altar Blessing:</span>
                <span class="comp-val"><b>+${blessing}</b> <small class="muted">(temporary boon for the current map)</small></span>
              </div>`
                  : ''
              }
              ${
                gearBonus > 0
                  ? `<div class="calc-row">
                <span class="comp-name">Equipped Gear Bonus:</span>
                <span class="comp-val"><b>+${gearBonus}</b> <small class="muted">(from equipped weapon, armor or accessory)</small></span>
              </div>`
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- 2. Derived bonus stat produced -->
        <div class="inspect-section">
          <h3>⚔️ Derived Bonuses &amp; Combat Scaling</h3>
          <ul class="inspect-bullet-list">
            ${info.derivedRules(eff[stat], derived).map((r) => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- 3. Next SP required to level -->
        <div class="inspect-section">
          <h3>⛩️ Base Stat Evolution &amp; Shrine Upgrade Cost</h3>
          <div class="stat-upgrade-cost-box">
            <div class="cost-row">
              <span class="cost-label">Current Base Level:</span>
              <span class="cost-val">Base <b>${base}</b></span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Next Level Target:</span>
              <span class="cost-val">Base <b>${base + 1}</b></span>
            </div>
            <div class="cost-row highlight-sp">
              <span class="cost-label">Next SP Required:</span>
              <span class="sp-cost-badge">${getResourceIcon('sp', 'chip-icon')} <b>${cost} Stat Points</b></span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Shrine Upgrade Formula:</span>
              <code class="formula-code">currentBase &times; 10 = ${base} &times; 10 = ${cost} SP</code>
            </div>
            <div class="cost-row">
              <span class="cost-label">Your Current Stat Points:</span>
              <span class="player-sp-val">${getResourceIcon('sp', 'chip-icon')} <b>${sp} SP</b> ${
                sp >= cost
                  ? '<span class="chip up">Ready to upgrade!</span>'
                  : `<span class="chip down">Need ${cost - sp} more SP</span>`
              }</span>
            </div>
          </div>
          <p class="muted shrine-upgrade-note">
            <i>Notice:</i> Base Stats cannot be leveled in the open field. Upgrades are performed exclusively at <b>Sacred Shrines</b> (<code>hasShrine: true</code>) or during the initial Turn 0 adventure preparation.
          </p>
        </div>
      </div>

      <div class="inspect-footer">
        <button class="btn primary" data-action="close-inspect">Back to Game</button>
      </div>
    </div>
  </div>`;
}

export function gameLogModal(state: RunState, _ui: UiState): string {
  const entries = state.gameLog ?? [];
  return `
  <div class="modal-backdrop game-log-backdrop" data-action="close-log-backdrop">
    <div class="modal game-log-modal" role="dialog" aria-modal="true" aria-labelledby="game-log-title">
      <header class="game-log-modal-header">
        <div class="game-log-title-group">
          <h2 id="game-log-title">📜 Adventure Chronicle</h2>
          <span class="game-log-counter">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <button class="btn mini secondary log-close-btn" data-action="close-log" title="Close (Esc)">✕</button>
      </header>
      <div class="game-log-modal-body">
        <ul class="game-log-full-list log">
          ${renderCombatLogEntries(entries)}
        </ul>
      </div>
      <footer class="game-log-modal-footer">
        <button class="btn primary" data-action="close-log">Return to Adventure</button>
      </footer>
    </div>
  </div>`;
}

