import type { Equipped, Slot } from "../../../domain/types";
import type { Anchors } from "../anchors";
import type { Grid } from "../species/types";
import { drawGlasses, GLASSES_ICON } from "./glasses";
import { drawLaptop, LAPTOP_SPRITE } from "./laptop";

export { ACCESSORY_PALETTE } from "./palette";

export interface AccessoryArt {
  slot: Slot;
  /** A small grid for the shop card. */
  icon: Grid;
  /** The accessory as a full 32x32 layer, placed for one species and stage. */
  layer(anchors: Anchors): Grid;
}

/** Looked up by the `assetKey` stored in the items table. Adding an item is data here plus a migration row. */
export const ACCESSORIES: Readonly<Record<string, AccessoryArt>> = {
  glasses_round: { slot: "glasses", icon: GLASSES_ICON, layer: (anchors) => drawGlasses(anchors.eyes) },
  laptop: { slot: "held", icon: LAPTOP_SPRITE, layer: (anchors) => drawLaptop(anchors.held) },
};

// Back to front, as in CLAUDE.md: background, body, face, held, glasses, hat. Only the background
// goes behind the pet; the rest are drawn over it.
const FRONT_ORDER: readonly Slot[] = ["held", "glasses", "hat"];

export interface AccessoryLayers {
  /** Drawn before the body (the background). */
  behind: Grid[];
  /** Drawn after the face, in order: held, glasses, hat. */
  front: Grid[];
}

function layerFor(equipped: Equipped, slot: Slot, anchors: Anchors): Grid | null {
  const key = equipped[slot];
  if (key === null) return null;
  const art = ACCESSORIES[key];
  // An asset key this build does not know (a stale database), or one filed in the wrong slot, draws nothing.
  if (art === undefined || art.slot !== slot) return null;
  return art.layer(anchors);
}

/** The accessory layers for what is worn. Empty slots and unknown keys add nothing and never throw. */
export function accessoryLayers(equipped: Equipped, anchors: Anchors): AccessoryLayers {
  const background = layerFor(equipped, "background", anchors);
  const front: Grid[] = [];
  for (const slot of FRONT_ORDER) {
    const layer = layerFor(equipped, slot, anchors);
    if (layer !== null) front.push(layer);
  }
  return { behind: background === null ? [] : [background], front };
}
