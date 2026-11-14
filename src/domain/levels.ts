import { LEVEL_XP_BASE, LEVEL_XP_EXPONENT, STAGE_MIN_LEVELS } from "./config";
import type { Stage } from "./types";

/** XP needed to go from `level` to `level + 1`. Levels below 1 (or NaN) count as level 1. */
export function xpForLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return Math.round(LEVEL_XP_BASE * safeLevel ** LEVEL_XP_EXPONENT);
}

/**
 * Turns total XP into a level, the XP earned inside it, and the XP that level needs.
 * Never throws: NaN and negative XP count as 0, fractions are floored, and the input is
 * capped at the largest safe integer so the loop always ends. The cumulative cost grows
 * like level^2.5, so even that cap needs only a few hundred thousand iterations.
 */
export function levelFromXp(totalXp: number): { level: number; intoLevel: number; needed: number } {
  let remaining = Number.isNaN(totalXp)
    ? 0
    : Math.min(Math.max(Math.floor(totalXp), 0), Number.MAX_SAFE_INTEGER);
  let level = 1;
  let needed = xpForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpForLevel(level);
  }
  return { level, intoLevel: remaining, needed };
}

/** Evolution stage 1..4 for a level, from the thresholds in config. */
export function stageForLevel(level: number): Stage {
  const [, stage2, stage3, stage4] = STAGE_MIN_LEVELS;
  if (level >= stage4) return 4;
  if (level >= stage3) return 3;
  if (level >= stage2) return 2;
  return 1;
}
