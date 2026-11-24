import { createTimestamp } from '../log';
import { shuffleArray } from '../rng';
import { ActiveCombatState, CombatCardDef, MonsterCard } from '../types';
import { PLAYER_HAND_SIZE, PLAYER_MAX_AP } from './constants';

export interface DrawStepEvent {
  card: CombatCardDef;
  triggeredBy?: string;
}

export function formatDrawEventsToLog(
  events: DrawStepEvent[],
  sourceName: string,
  logTimestamp?: string
): string[] {
  const entries: string[] = [];
  const ts = createTimestamp(logTimestamp);
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.triggeredBy) {
      entries.push(`[${ts}] 📑 ${ev.triggeredBy}'s On-Draw trigger enters the Stack.`);
      entries.push(`[${ts}] 🃏 ${ev.triggeredBy}: drew ${ev.card.name}.`);
      // Check if next event is a chained trigger from this same card; otherwise close this trigger's Stack frame
      const nextIsChained = events[i + 1]?.triggeredBy === ev.card.name;
      if (!nextIsChained) {
        entries.push(`[${ts}] ✅ ${ev.triggeredBy}'s On-Draw trigger fully resolves and moves out of the Stack.`);
      }
    } else {
      entries.push(`[${ts}] 🃏 ${sourceName}: drew ${ev.card.name}.`);
    }
  }
  return entries;
}

export function drawCombatCards(
  drawPile: CombatCardDef[],
  discardPile: CombatCardDef[],
  count: number,
  rngState: number
): {
  drawn: CombatCardDef[];
  events: DrawStepEvent[];
  drawPile: CombatCardDef[];
  discardPile: CombatCardDef[];
  nextState: number;
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  let currentRng = rngState;
  const drawn: CombatCardDef[] = [];
  const events: DrawStepEvent[] = [];

  // LIFO stack of individual "Draw a card" entries so multi-card draws resolve 1-by-1
  const pendingStack: Array<{ triggeredBy?: string }> = [];
  for (let i = 0; i < count; i++) {
    pendingStack.push({});
  }

  while (pendingStack.length > 0) {
    const step = pendingStack.pop()!;
    if (currentDraw.length === 0) {
      if (currentDiscard.length === 0) break;
      const reshuffled = shuffleArray(currentDiscard, currentRng);
      currentDraw = reshuffled.shuffled;
      currentDiscard = [];
      currentRng = reshuffled.nextState;
    }
    const card = currentDraw[0];
    drawn.push(card);
    events.push({ card, triggeredBy: step.triggeredBy });
    currentDraw = currentDraw.slice(1);
    if (card.drawOnEnterHand && card.drawOnEnterHand > 0) {
      for (let t = 0; t < card.drawOnEnterHand; t++) {
        pendingStack.push({ triggeredBy: card.name });
      }
    }
  }

  return {
    drawn,
    events,
    drawPile: currentDraw,
    discardPile: currentDiscard,
    nextState: currentRng,
  };
}

export function createCombatSession(
  monsters: MonsterCard[],
  masterDeck: CombatCardDef[],
  rngState: number,
  playerMaxAp = PLAYER_MAX_AP,
  logTimestamp = '00:00:00'
): { combat: ActiveCombatState; nextState: number } {
  const shuffledDeck = shuffleArray(masterDeck, rngState);
  const initialDraw = drawCombatCards(
    shuffledDeck.shuffled,
    [],
    PLAYER_HAND_SIZE,
    shuffledDeck.nextState
  );

  const combat: ActiveCombatState = {
    monsters: monsters.map((monster) => ({
      monster,
      hp: monster.maxHp,
      block: monster.startingBlock ?? 0,
      patternIndex: 0,
      undyingTokensRemaining: monster.undyingTokens,
    })),
    combatTurn: 1,
    playerAp: playerMaxAp,
    playerMaxAp: playerMaxAp,
    playerBlock: 0,
    playerEvasionMod: 0,
    stack: [],
    inPlay: [],
    drawPile: initialDraw.drawPile,
    hand: initialDraw.drawn,
    discardPile: initialDraw.discardPile,
    combatLog: [
      `[${createTimestamp(logTimestamp)}] Encountered ${monsters
        .map((m) => `${m.name} (Lvl ${m.level}, ${m.maxHp} HP)`)
        .join(' + ')}!`,
    ],
  };

  return { combat, nextState: initialDraw.nextState };
}
