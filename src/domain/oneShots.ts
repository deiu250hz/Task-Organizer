import { stageForLevel } from "./levels";
import type { OneShot, Stage } from "./types";

export interface OneShotSpec {
  kind: OneShot;
  /** Only for "evolve": the stage the pet becomes. */
  toStage?: Stage;
}

/**
 * The animations that play after a task is completed, in the order they must play
 * (PLAN.md section 6): celebrate, then levelUp, then evolve. Jumping several levels at once
 * still plays one levelUp, and one evolve straight to the new stage.
 */
export function oneShotsFor(prevLevel: number, nextLevel: number): OneShotSpec[] {
  const shots: OneShotSpec[] = [{ kind: "celebrate" }];
  if (nextLevel > prevLevel) {
    shots.push({ kind: "levelUp" });
    const toStage = stageForLevel(nextLevel);
    if (toStage > stageForLevel(prevLevel)) shots.push({ kind: "evolve", toStage });
  }
  return shots;
}
