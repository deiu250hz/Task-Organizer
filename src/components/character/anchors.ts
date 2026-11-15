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
  /**
   * Where a hat sits: `x` is the column of its centre, `bottomY` the row of its lowest pixel. That row is
   * always two rows above the eyes (the glasses frame starts one row above them), so hats and glasses
   * never touch. A hat is at most 4 rows tall, because the stage 4 monkey has only 4 rows above its eyes.
   */
  hat: { x: number; bottomY: number };
}

export const ANCHORS: Record<Species, Record<Stage, Anchors>> = {
  monkey: {
    1: { eyes: { y: 12, leftX: 12, rightX: 18 }, held: { x: 10, y: 22 }, hat: { x: 16, bottomY: 10 } },
    2: { eyes: { y: 10, leftX: 12, rightX: 18 }, held: { x: 10, y: 21 }, hat: { x: 16, bottomY: 8 } },
    3: { eyes: { y: 7, leftX: 11, rightX: 19 }, held: { x: 10, y: 18 }, hat: { x: 16, bottomY: 5 } },
    4: { eyes: { y: 5, leftX: 11, rightX: 19 }, held: { x: 10, y: 16 }, hat: { x: 16, bottomY: 3 } },
  },
  cat: {
    1: { eyes: { y: 15, leftX: 12, rightX: 18 }, held: { x: 10, y: 23 }, hat: { x: 16, bottomY: 13 } },
    2: { eyes: { y: 13, leftX: 11, rightX: 19 }, held: { x: 10, y: 22 }, hat: { x: 16, bottomY: 11 } },
    3: { eyes: { y: 11, leftX: 11, rightX: 19 }, held: { x: 10, y: 21 }, hat: { x: 16, bottomY: 9 } },
    4: { eyes: { y: 9, leftX: 11, rightX: 19 }, held: { x: 10, y: 20 }, hat: { x: 16, bottomY: 7 } },
  },
};
