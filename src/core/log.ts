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

  // Extract [HH:MM:SS] if present at the start
  const timeMatch = text.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/s);
  if (timeMatch) {
    timestamp = timeMatch[1];
    text = timeMatch[2].trim();
  }

  // Determine actor type and display label
  let actorType: LogActorType = 'enemy';
  let actorLabel = 'Enemy';

  if (
    text.includes('Played ') ||
    text.includes('enters the Stack') ||
    text.includes('fully resolves') ||
    /:\s*(?:discarded|drew|regained)\b/i.test(text) ||
    text.includes('Battle Flag:') ||
    text.includes('[Steal]') ||
    text.includes('[Conserve]') ||
    text.includes('Used ') ||
    /^(?:⚔️|🛡️|💰|✨|🧪)?\s*(?:You|Hero)\b/i.test(text)
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
    text.includes('Turn ') ||
    text.includes('Chose path') ||
    text.includes('Explored ') ||
    text.includes('Dealt ')
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
  } else {
    actorType = 'enemy';
    const creatureMatch = text.match(
      /^[^\w\s]*\s*([A-Za-z0-9 '\-]+?)(?:\s+uses\b|\s+gathers\b|\s+did nothing|\s+drains life|'s\b)/i
    );
    if (creatureMatch && creatureMatch[1].trim()) {
      actorLabel = creatureMatch[1].trim();
    } else {
      actorLabel = 'Enemy';
    }
  }

  return {
    timestamp,
    actorType,
    actorLabel,
    text,
  };
}
