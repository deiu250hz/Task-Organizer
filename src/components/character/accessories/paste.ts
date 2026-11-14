import { GRID_SIZE, type Grid } from "../species/types";

/**
 * Places a small grid on an empty 32x32 canvas with its top-left corner at (x, y). Pixels that fall
 * outside the canvas are dropped, so an anchor near an edge can never throw. '.' stays transparent.
 */
export function paste(small: Grid, x: number, y: number): Grid {
  const rows: string[] = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const source = small[row - y];
    let line = "";
    for (let col = 0; col < GRID_SIZE; col += 1) {
      line += source?.[col - x] ?? ".";
    }
    rows.push(line);
  }
  return rows;
}
