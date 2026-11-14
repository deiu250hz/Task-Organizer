import type { Stage } from "../../domain/types";
import type { Species } from "./species";

/**
 * Where accessories attach to a pet. Each accessory is drawn once; these numbers say where it goes
 * for each species and stage, because the head moves up and grows as the pet evolves.
 * The numbers come from the sprites themselves (the idle faces and bodies), so they must be
 * re-checked whenever a sprite changes. accessories.test.ts guards the important ones.
 */
export interface Anchors {
  /** The two eyes, each a 2 px wide, 3 px tall block. `y` is the top row; `leftX` / `rightX` the left column of each eye. */
  eyes: { y: number; leftX: number; rightX: number };
  /** Top-left corner of a held item. It sits just under the chin, in front of the chest. */
  held: { x: number; y: number };
}

export const ANCHORS: Record<Species, Record<Stage, Anchors>> = {
  monkey: {
    1: { eyes: { y: 12, leftX: 12, rightX: 18 }, held: { x: 10, y: 22 } },
    2: { eyes: { y: 10, leftX: 12, rightX: 18 }, held: { x: 10, y: 21 } },
    3: { eyes: { y: 7, leftX: 11, rightX: 19 }, held: { x: 10, y: 18 } },
    4: { eyes: { y: 5, leftX: 11, rightX: 19 }, held: { x: 10, y: 16 } },
  },
  cat: {
    1: { eyes: { y: 15, leftX: 12, rightX: 18 }, held: { x: 10, y: 23 } },
    2: { eyes: { y: 13, leftX: 11, rightX: 19 }, held: { x: 10, y: 22 } },
    3: { eyes: { y: 11, leftX: 11, rightX: 19 }, held: { x: 10, y: 21 } },
    4: { eyes: { y: 9, leftX: 11, rightX: 19 }, held: { x: 10, y: 20 } },
  },
};
