import type { Anchors } from "../anchors";
import type { Grid } from "../species/types";
import { paste } from "./paste";

// Held items share the laptop's slot: at most 12 pixels wide, top edge at the held anchor, just under
// the chin, so they never touch the face. The laptop itself is in laptop.ts.

/** A mug of coffee with a handle. 9 wide. */
export const COFFEE_CUP: Grid = [".FFFFFF..", ".FCCCCFF.", ".FFFFFF.F", ".FFFFFF.F", "..FFFFFF.", "...FFFF.."];

/** A clipboard with a ticked checklist, fitting for a task app. 8 wide. */
export const CLIPBOARD: Grid = [
  "..TTTT..",
  "CCTTTTCC",
  "CFFFFFFC",
  "CFEFKKFC",
  "CFFFFFFC",
  "CFEFKKFC",
  "CFFFFFFC",
  "CCCCCCCC",
];

/** A game pad with a d-pad and four coloured buttons. 12 wide. */
export const GAME_CONTROLLER: Grid = [
  ".XXXXXXXXXX.",
  "XSSKSSSSSYSX",
  "XSKKKSSSBSEX",
  "XSSKSSSSSRSX",
  "XSSXXXXXXSSX",
  ".XX......XX.",
];

/** Centred in the 12 pixel slot, top row on the anchor's row. */
export function drawHeld(icon: Grid, held: Anchors["held"]): Grid {
  return paste(icon, held.x + Math.floor((12 - icon[0].length) / 2), held.y);
}
