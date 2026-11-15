import type { Anchors } from "../anchors";
import type { Grid } from "../species/types";
import { paste } from "./paste";

// Hats are at most 4 rows tall: the stage 4 monkey has only 4 rows above its eyes, and a taller hat
// would be cut off at the top of the picture. Each one is drawn once and placed by the hat anchor.

/** A knit cap: a white pom-pom on top, red wool, a blue folded band. 12 wide. */
export const KNIT_BEANIE: Grid = ["....QQQQ....", "..RRRRRRRR..", ".RRRRRRRRRR.", "BBBBBBBBBBBB"];

/** A small striped party hat with a gold tip. 8 wide. */
export const PARTY_HAT: Grid = ["...YY...", "..MMMM..", ".MQMMQM.", "MMQMMQMM"];

/** A gold crown with a red and a blue gem on its band. 11 wide. */
export const GOLD_CROWN: Grid = ["Y....Y....Y", "YY..YYY..YY", "YYYYYYYYYYY", "YRYYYBYYYRY"];

/** Centred on the anchor's column (the middle column for an odd width), the bottom row on the anchor's row. */
export function drawHat(icon: Grid, hat: Anchors["hat"]): Grid {
  return paste(icon, hat.x - Math.floor(icon[0].length / 2), hat.bottomY - icon.length + 1);
}
