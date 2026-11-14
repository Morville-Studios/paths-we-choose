import { GLOSSARY_TOOLTIP_TEMPLATES } from '../../data/glossary';

export function escapeTooltipAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders an MTG-style keyword vocabulary token with hover/focus tooltip metadata.
 */
export function kwTokenHtml(label: string, tooltip: string, extraClass = ''): string {
  const safeTooltip = escapeTooltipAttr(tooltip);
  const cls = extraClass ? `kw-token ${extraClass}` : 'kw-token';
  return `<span class="${cls}" tabindex="0" data-kw-tooltip="${safeTooltip}">${label}</span>`;
}

/**
 * Enhances recognized ability keywords on creature cards with interactive glossary tooltips.
 */
export function formatMonsterAbilitiesHtml(abilities: string[]): string {
  return abilities
    .map((ability) => {
      if (/^Lifesteal\b/i.test(ability)) {
        return kwTokenHtml('Lifesteal (100%)', GLOSSARY_TOOLTIP_TEMPLATES.lifesteal(100));
      }
      if (/^Undying\b/i.test(ability)) {
        const m = ability.match(/\((\d+)\)/);
        const tokens = Number(m?.[1] ?? 3);
        return kwTokenHtml(`Undying (${tokens})`, GLOSSARY_TOOLTIP_TEMPLATES.undying(tokens));
      }
      if (/^Skittish\b/i.test(ability)) {
        const m = ability.match(/\((\d+)\)/);
        const amt = Number(m?.[1] ?? 1);
        return kwTokenHtml(`Skittish (${amt})`, GLOSSARY_TOOLTIP_TEMPLATES.skittish(amt));
      }
      if (/^Harden\b/i.test(ability)) {
        const m = ability.match(/\((\d+)\)/);
        const amt = Number(m?.[1] ?? 1);
        return kwTokenHtml(`Harden (${amt})`, GLOSSARY_TOOLTIP_TEMPLATES.harden(amt));
      }
      if (/^Regen\s*\(/i.test(ability)) {
        const m = ability.match(/\((\d+)\)/);
        const amt = Number(m?.[1] ?? 1);
        return kwTokenHtml(`Regen (${amt})`, GLOSSARY_TOOLTIP_TEMPLATES.regen(amt));
      }
      if (/^Regen(\d+):/i.test(ability)) {
        const m = ability.match(/^Regen(\d+):/i);
        const amt = Number(m?.[1] ?? 1);
        return kwTokenHtml(`Regen (${amt})`, GLOSSARY_TOOLTIP_TEMPLATES.regen(amt));
      }
      if (/^Thorn\b/i.test(ability)) {
        const m = ability.match(/\((\d+)\)/);
        const amt = Number(m?.[1] ?? 1);
        return kwTokenHtml(`Thorn (${amt})`, GLOSSARY_TOOLTIP_TEMPLATES.thorn(amt));
      }
      if (/^Channel\b/i.test(ability)) {
        const m = ability.match(/\((\d+)(?:\s*,\s*(\d+))?\)/);
        const amt = Number(m?.[1] ?? 1);
        const dur = m?.[2] ? Number(m[2]) : undefined;
        const label = dur ? `Channel (${amt}, ${dur})` : `Channel (${amt})`;
        return kwTokenHtml(label, GLOSSARY_TOOLTIP_TEMPLATES.channel(amt, dur));
      }
      if (/^Bloodlust\b/i.test(ability)) {
        return kwTokenHtml('Bloodlust', GLOSSARY_TOOLTIP_TEMPLATES.bloodlust());
      }
      if (/^Acid Retaliation:/i.test(ability)) {
        return kwTokenHtml('Thorn (1)', GLOSSARY_TOOLTIP_TEMPLATES.thorn(1));
      }
      return ability;
    })
    .join(' &middot; ');
}
