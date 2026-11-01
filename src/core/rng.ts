export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function nextRng(state: number): { value: number; nextState: number } {
  let t = (state + 0x6d2b79f5) | 0;
  const nextState = t >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

export function rollInt(
  state: number,
  minInclusive: number,
  maxInclusive: number
): { roll: number; nextState: number } {
  const { value, nextState } = nextRng(state);
  const span = maxInclusive - minInclusive + 1;
  const roll = minInclusive + Math.floor(value * span);
  return { roll, nextState };
}

export function roll1D6(state: number): { roll: number; nextState: number } {
  return rollInt(state, 1, 6);
}

export function roll2D6(state: number): {
  die1: number;
  die2: number;
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
  nextState: number;
} {
  const r1 = rollInt(state, 1, 6);
  const r2 = rollInt(r1.nextState, 1, 6);
  const total = r1.roll + r2.roll;
  return {
    die1: r1.roll,
    die2: r2.roll,
    total,
    isSnakeEyes: r1.roll === 1 && r2.roll === 1,
    isBoxcars: r1.roll === 6 && r2.roll === 6,
    nextState: r2.nextState,
  };
}

export function rollD20(state: number): { roll: number; nextState: number } {
  return rollInt(state, 1, 20);
}

export function shuffleArray<T>(
  items: readonly T[],
  rngState: number
): { shuffled: T[]; nextState: number } {
  const arr = [...items];
  let current = rngState;
  for (let i = arr.length - 1; i > 0; i--) {
    const { roll: j, nextState } = rollInt(current, 0, i);
    current = nextState;
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return { shuffled: arr, nextState: current };
}
