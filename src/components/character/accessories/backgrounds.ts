import { GRID_SIZE, type Grid } from "../species/types";

// Backgrounds are full 32 x 32 scenes (no transparent pixel) drawn BEHIND the pet. Character renders
// them in their own layer outside the animated element, so the scenery stays still while the pet
// bobs and hops. They do not depend on the anchors: the same scene for every species and stage.

type Cells = string[][];

const blank = (): Cells => Array.from({ length: GRID_SIZE }, () => Array<string>(GRID_SIZE).fill("."));
const rowsOf = (cells: Cells): Grid => cells.map((row) => row.join(""));

function buildNightSky(): Grid {
  const c = blank();
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      // dark navy on top, a dithered band, then lighter navy; a dark strip of ground at the bottom
      c[y][x] = y < 14 ? "N" : y < 17 ? ((x + y) % 2 === 1 ? "N" : "W") : "W";
      if (y >= 28) c[y][x] = "H";
    }
  }
  // a crescent moon: a disc with a second disc cut out of it
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const disc = (x - 24.5) ** 2 + (y - 7.5) ** 2;
      const bite = (x - 26.5) ** 2 + (y - 6.5) ** 2;
      if (disc <= 4.2 ** 2 && bite > 3.5 ** 2) c[y][x] = "Z";
    }
  }
  const stars: [number, number, string][] = [
    [3, 3, "Q"], [8, 8, "Y"], [13, 2, "Q"], [18, 5, "Y"], [29, 14, "Q"], [5, 15, "Q"], [21, 13, "Y"], [11, 12, "Q"],
    [2, 10, "Y"], [16, 9, "Q"], [28, 3, "Q"], [8, 20, "Q"], [26, 21, "Y"], [3, 25, "Q"], [30, 26, "Q"],
  ];
  for (const [x, y, key] of stars) c[y][x] = key;
  return rowsOf(c);
}

function buildSunnyMeadow(): Grid {
  const c = blank();
  for (let y = 0; y < GRID_SIZE; y += 1) for (let x = 0; x < GRID_SIZE; x += 1) c[y][x] = y < 15 ? "J" : "I";
  // the sun and its rays
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) if ((x - 6.5) ** 2 + (y - 6.5) ** 2 <= 3.6 ** 2) c[y][x] = "Y";
  }
  for (const [x, y] of [[6, 1], [6, 12], [0, 6], [12, 6], [2, 2], [10, 2], [2, 10], [10, 10]]) c[y][x] = "Y";
  // two small clouds
  const cloud = (cx: number, cy: number) => {
    for (const [dx, dy] of [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) {
      c[cy + dy][cx + dx] = "Q";
    }
  };
  cloud(22, 6);
  cloud(15, 13);
  // two rolling hills, the far one darker
  for (let x = 0; x < GRID_SIZE; x += 1) {
    const far = Math.round(19 + 2 * Math.sin(x / 4));
    const near = Math.round(24 + 1.5 * Math.sin(x / 3 + 1));
    for (let y = far; y < GRID_SIZE; y += 1) c[y][x] = "D";
    for (let y = near; y < GRID_SIZE; y += 1) c[y][x] = "E";
  }
  const flowers: [number, number, string][] = [
    [3, 28, "R"], [9, 27, "Y"], [14, 30, "P"], [22, 28, "R"], [27, 27, "Y"], [30, 30, "P"], [19, 26, "Q"], [6, 30, "Q"],
  ];
  for (const [x, y, key] of flowers) c[y][x] = key;
  return rowsOf(c);
}

export const NIGHT_SKY: Grid = buildNightSky();
export const SUNNY_MEADOW: Grid = buildSunnyMeadow();

/** A 16 x 16 picture of a scene for the shop card: every second pixel of every second row. */
export function thumbnail(scene: Grid): Grid {
  const rows: string[] = [];
  for (let y = 0; y < scene.length; y += 2) {
    let row = "";
    for (let x = 0; x < scene[y].length; x += 2) row += scene[y][x];
    rows.push(row);
  }
  return rows;
}
