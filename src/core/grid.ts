import { GridCoord } from './types';

export function toGridKey(col: number, row: number): string {
  const normalizedCol = Object.is(col, -0) ? 0 : col;
  return `${normalizedCol.toFixed(1)},${row}`;
}

export function coordToKey(coord: GridCoord): string {
  return toGridKey(coord.col, coord.row);
}

/**
 * Returns the 2 forward choice coordinates in Row R + 1 directly above (col, row).
 */
export function getForwardChoiceCoords(coord: GridCoord): [GridCoord, GridCoord] {
  const nextRow = coord.row + 1;
  return [
    { col: coord.col - 0.5, row: nextRow },
    { col: coord.col + 0.5, row: nextRow },
  ];
}

/**
 * Returns the 3 lookahead pyramid coordinates in Row R + 2 above (col, row):
 * Leftmost (col - 1.0), Shared Middle (col), Rightmost (col + 1.0).
 */
export function getLookaheadCoords(coord: GridCoord): [GridCoord, GridCoord, GridCoord] {
  const lookRow = coord.row + 2;
  return [
    { col: coord.col - 1.0, row: lookRow },
    { col: coord.col, row: lookRow },
    { col: coord.col + 1.0, row: lookRow },
  ];
}

export function isSameCoord(a: GridCoord, b: GridCoord): boolean {
  return Math.abs(a.col - b.col) < 1e-6 && a.row === b.row;
}
