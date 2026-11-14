import type { OneShot } from "../../domain/types";

/**
 * How long each one-shot animation runs, in milliseconds. Character hands this to the CSS
 * (as --shot-ms), so the keyframes in index.css and the safety timeout share one number.
 */
export const ONE_SHOT_MS: Record<OneShot, number> = {
  celebrate: 900,
  levelUp: 1200,
  evolve: 2000,
  equip: 600,
};

/** If the browser never reports that an animation ended (hidden window), move on after this extra wait. */
export const ONE_SHOT_GRACE_MS = 600;
