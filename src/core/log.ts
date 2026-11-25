export type LogActorType = 'hero' | 'enemy' | 'system' | 'village' | 'shrine' | 'map';

export interface ParsedGameLogEntry {
  timestamp: string;
  actorType: LogActorType;
  actorLabel: string;
  text: string;
}

export function createTimestamp(timestamp = '00:00:00'): string {
  return timestamp;
}

export function appendGameLog(
  state: { gameLog?: string[] },
  entries: string | string[]
): string[] {
  const current = state.gameLog ?? [];
  const list = Array.isArray(entries) ? entries : [entries];
  return [...current, ...list];
}

export function parseGameLogEntry(entry: string): ParsedGameLogEntry {
  let timestamp = '';
  let text = entry.trim();

  // Extract [YYYY-MM-DD HH:MM:SS.mmm] or [HH:MM:SS] if present at the start
  const timeMatch = text.match(/^\[((?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)\]\s*(.*)$/s);
  if (timeMatch) {
    timestamp = timeMatch[1];
    text = timeMatch[2].trim();
  }

  // Determine actor type and display label
  let actorType: LogActorType = 'system';
  let actorLabel = 'System';

  const isEnemyAbilityStack =
    /^(?:📑|✅)?\s*(?:.+?'s\s+(?:Harden|Skittish)\s+enters the Stack|(?:Harden|Skittish)\s+fully resolves)/i.test(text);

  const enemyMatch = text.match(
    /^[^\w\s]*\s*([A-Za-z0-9 '\-]+?)(?:\s+(?:uses|attacks|gains|loses|restores|returns|summoned|unleashes|inflicts|hits|gathers|did nothing|drains life|is already)\b|:|'s\b|\s+—\s+)/i
  );

  if (
    !isEnemyAbilityStack &&
    (text.includes('Played ') ||
      text.includes('enters the Stack') ||
      text.includes('fully resolves') ||
      text.includes('was placed in the action combat discard pile') ||
      /:\s*(?:discarded|drew|regained)\b/i.test(text) ||
      text.includes('Battle Flag:') ||
      text.includes('[Steal]') ||
      text.includes('[Conserve]') ||
      text.includes('Used ') ||
      text.includes('Equipped ') ||
      text.includes('Unequipped ') ||
      /^(?:⚔️|🛡️|💰|✨|🧪)?\s*(?:You|Hero)\b/i.test(text))
  ) {
    actorType = 'hero';
    actorLabel = 'You';
  } else if (
    text.includes('🏡') ||
    text.includes('🛏️') ||
    text.includes('🛒') ||
    text.includes('💰 Sold') ||
    text.includes('Rested at') ||
    text.includes('Bought ') ||
    text.includes('Learned skill') ||
    text.includes('Purged ') ||
    text.includes('Banished ') ||
    text.includes('Departed from ') ||
    text.includes('Arrived at ')
  ) {
    actorType = 'village';
    actorLabel = 'Village';
  } else if (
    text.includes('✦') ||
    text.includes('Shrine') ||
    text.includes('divine boon') ||
    text.includes('⬆️')
  ) {
    actorType = 'shrine';
    actorLabel = 'Shrine';
  } else if (
    text.includes('🗺️') ||
    text.includes('🎴') ||
    text.includes('🧭') ||
    text.includes('🍃') ||
    text.includes('🧳') ||
    text.includes('🌿') ||
    text.includes('🗝️') ||
    text.includes('🪤') ||
    text.includes('💎') ||
    text.includes('Turn ') ||
    text.includes('Chose path') ||
    text.includes('Explored ') ||
    text.includes('Dealt ') ||
    text.includes('Wandered into') ||
    text.includes('Path Card') ||
    text.includes('Magical Chest') ||
    text.includes('Trapped Chest') ||
    text.includes('Gold Stash') ||
    text.includes('Spring Trap') ||
    text.includes('Enemy Camp') ||
    text.includes('Sneak Check') ||
    text.includes('Treasure Discovery') ||
    text.includes('Wandering Merchant') ||
    text.includes('Sanctuary')
  ) {
    actorType = 'map';
    actorLabel = 'Map';
  } else if (
    text.includes('🏆') ||
    text.includes('Encountered') ||
    text.includes('Victory!') ||
    text.includes('Escaped') ||
    /^(?:[🗺️🌲🌿✦⚔️]?\s*)?Encountered\b/i.test(text)
  ) {
    actorType = 'system';
    actorLabel = /Encountered\b/i.test(text) ? 'Encounter' : 'System';
  } else if (isEnemyAbilityStack || (enemyMatch && enemyMatch[1].trim())) {
    actorType = 'enemy';
    actorLabel = enemyMatch && enemyMatch[1].trim() ? enemyMatch[1].trim() : 'Enemy';
  } else {
    actorType = 'system';
    actorLabel = 'System';
  }

  return {
    timestamp,
    actorType,
    actorLabel,
    text,
  };
}
