import { createTimestamp } from '../log';
import { shuffleArray } from '../rng';
import { ActiveCombatState, CombatCardDef, MonsterCard } from '../types';
import { PLAYER_HAND_SIZE, PLAYER_MAX_AP } from './constants';

export function drawCombatCards(
  drawPile: CombatCardDef[],
  discardPile: CombatCardDef[],
  count: number,
  rngState: number
): {
  drawn: CombatCardDef[];
  drawPile: CombatCardDef[];
  discardPile: CombatCardDef[];
  nextState: number;
} {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  let currentRng = rngState;
  const drawn: CombatCardDef[] = [];

  for (let i = 0; i < count; i++) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length === 0) break;
      const reshuffled = shuffleArray(currentDiscard, currentRng);
      currentDraw = reshuffled.shuffled;
      currentDiscard = [];
      currentRng = reshuffled.nextState;
    }
    drawn.push(currentDraw[0]);
    currentDraw = currentDraw.slice(1);
  }

  return {
    drawn,
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
