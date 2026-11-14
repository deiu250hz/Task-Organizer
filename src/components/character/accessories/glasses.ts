import type { Anchors } from "../anchors";
import { GRID_SIZE, type Grid } from "../species/types";

/**
 * Round glasses. Drawn once: each lens is a 4x5 frame around one 2x3 eye, so the eye shows through
 * the middle, and a bridge joins the two lenses. The gap between the eyes differs by stage (2 px at
 * stage 1, 4 px later), so the bridge is as wide as whatever gap the anchors describe.
 */
export function drawGlasses(eyes: Anchors["eyes"]): Grid {
  const canvas = Array.from({ length: GRID_SIZE }, () => Array<string>(GRID_SIZE).fill("."));
  const put = (x: number, y: number) => {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) canvas[y][x] = "G";
  };
  for (const eyeX of [eyes.leftX, eyes.rightX]) {
    for (let x = eyeX - 1; x <= eyeX + 2; x += 1) {
      put(x, eyes.y - 1); // top of the frame
      put(x, eyes.y + 3); // bottom of the frame
    }
    for (let y = eyes.y; y <= eyes.y + 2; y += 1) {
      put(eyeX - 1, y); // left side
      put(eyeX + 2, y); // right side
    }
  }
  // Bridge: the pixels between the two lenses, on the middle row of the eyes.
  for (let x = eyes.leftX + 3; x < eyes.rightX - 1; x += 1) put(x, eyes.y + 1);
  return canvas.map((row) => row.join(""));
}

/** The shop icon: the same glasses, cropped to their own size. */
export const GLASSES_ICON: Grid = [
  "GGGG..GGGG",
  "G..G..G..G",
  "G..GGGG..G",
  "G..G..G..G",
  "GGGG..GGGG",
];
