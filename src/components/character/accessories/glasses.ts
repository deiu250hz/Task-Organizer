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

// A blank 32 x 32 canvas and a bounds-checked pixel writer, shared by the two drawings below.
function canvas(): { rows: () => Grid; put: (x: number, y: number, key: string) => void } {
  const cells = Array.from({ length: GRID_SIZE }, () => Array<string>(GRID_SIZE).fill("."));
  return {
    rows: () => cells.map((row) => row.join("")),
    put: (x, y, key) => {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) cells[y][x] = key;
    },
  };
}

/**
 * Dark sunglasses: the lenses are filled, so they COVER the eyes (the happy and sad faces are hidden
 * while they are worn). Same footprint as the round glasses: a 4 x 5 lens per eye, a bridge between
 * them and a pixel of arm on each outer side. A blue glint sits in each lens's top-left corner.
 */
export function drawSunglasses(eyes: Anchors["eyes"]): Grid {
  const { rows, put } = canvas();
  for (const x0 of [eyes.leftX, eyes.rightX]) {
    for (let x = x0 - 1; x <= x0 + 2; x += 1) put(x, eyes.y - 1, "K"); // top bar
    for (let y = eyes.y; y <= eyes.y + 2; y += 1) {
      put(x0 - 1, y, "K");
      put(x0 + 2, y, "K");
      put(x0, y, "N"); // the lens
      put(x0 + 1, y, "N");
    }
    put(x0, eyes.y + 3, "K"); // the bottom edge is narrower, which rounds the lens
    put(x0 + 1, eyes.y + 3, "K");
    put(x0, eyes.y, "B"); // glint
  }
  for (let x = eyes.leftX + 3; x < eyes.rightX - 1; x += 1) put(x, eyes.y, "K"); // bridge
  put(eyes.leftX - 2, eyes.y, "K"); // arms
  put(eyes.rightX + 3, eyes.y, "K");
  return rows();
}

/** A gold monocle around the eye on the right of the picture, with a short chain. The eye shows through. */
export function drawMonocle(eyes: Anchors["eyes"]): Grid {
  const { rows, put } = canvas();
  const x0 = eyes.rightX;
  for (let x = x0 - 1; x <= x0 + 2; x += 1) {
    put(x, eyes.y - 1, "Y");
    put(x, eyes.y + 3, "Y");
  }
  for (let y = eyes.y; y <= eyes.y + 2; y += 1) {
    put(x0 - 1, y, "Y");
    put(x0 + 2, y, "Y");
  }
  put(x0 + 3, eyes.y + 4, "Y"); // the chain
  put(x0 + 3, eyes.y + 5, "Z");
  put(x0 + 2, eyes.y + 6, "Y");
  return rows();
}

export const SUNGLASSES_ICON: Grid = ["KKKK..KKKK", "KNNK..KNNK", "KNNKKKKNNK", "KNNK..KNNK", ".KK....KK."];

export const MONOCLE_ICON: Grid = [".....YYYY.", ".....Y..Y.", ".....Y..Y.", ".....Y..Y.", ".....YYYY.", "......Z..."];
