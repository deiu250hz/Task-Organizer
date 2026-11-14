import type { Difficulty, Reward } from "./types";

// Every tunable number of the game lives here (PLAN.md section 4). Tuning the game later
// means editing this file only. Pure: it imports types and nothing else.

/** Base reward per difficulty, before any streak bonus. */
export const REWARD_BASE: Record<Difficulty, Reward> = {
  1: { xp: 10, coins: 5 }, // easy
  2: { xp: 25, coins: 10 }, // medium
  3: { xp: 50, coins: 25 }, // hard
};

// Streak bonus on XP only (coins get none). Whole percents keep the maths in integers:
// 0.1 * 3 is 0.30000000000000004 in floating point, 10 * 3 is exactly 30.
export const STREAK_XP_BONUS_PERCENT_PER_DAY = 10;
export const STREAK_XP_BONUS_CAP_PERCENT = 50;

// XP needed to go from level n to n + 1 is round(LEVEL_XP_BASE * n ^ LEVEL_XP_EXPONENT).
export const LEVEL_XP_BASE = 100;
export const LEVEL_XP_EXPONENT = 1.5;

/** First level of each evolution stage: stage 1 from level 1, stage 2 from 5, stage 3 from 10, stage 4 from 25. */
export const STAGE_MIN_LEVELS = [1, 5, 10, 25] as const;

/** From this local hour on (22 = 10 pm), a pet that has done nothing today gets sleepy. */
export const SLEEPY_HOUR = 22;

/** How long the pet stays happy after a task is completed, in minutes. */
export const HAPPY_AFTER_COMPLETION_MINUTES = 60;
