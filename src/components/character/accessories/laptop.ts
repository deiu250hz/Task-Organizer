import type { Anchors } from "../anchors";
import type { Grid } from "../species/types";
import { paste } from "./paste";

/** A laptop seen from behind, the lid facing the viewer, 12 px wide and 7 px tall. */
export const LAPTOP_SPRITE: Grid = [
  "XXXXXXXXXXXX",
  "XUUUUUUUUUUX",
  "XUSSSSSSSSTX",
  "XUSSSVVSSSTX",
  "XUSSSVVSSSTX",
  "XSSSSSSSSSTX",
  "XXXXXXXXXXXX",
];

/** Held in front of the chest, its top-left corner at the held anchor. */
export function drawLaptop(held: Anchors["held"]): Grid {
  return paste(LAPTOP_SPRITE, held.x, held.y);
}
