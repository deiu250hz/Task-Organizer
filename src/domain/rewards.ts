import {
  REWARD_BASE,
  STREAK_XP_BONUS_CAP_PERCENT,
  STREAK_XP_BONUS_PERCENT_PER_DAY,
} from "./config";
import type { Difficulty, Reward } from "./types";

// XP gets +10% per streak day, capped at +50%; coins get no bonus.
// Integer percent maths, rounded once at the end (half rounds up: 27.5 -> 28).
export function rewardFor(difficulty: Difficulty, streakDays: number): Reward {
  const base = REWARD_BASE[difficulty];
  const days = Number.isFinite(streakDays) ? Math.max(streakDays, 0) : 0;
  const bonusPercent = Math.min(days * STREAK_XP_BONUS_PERCENT_PER_DAY, STREAK_XP_BONUS_CAP_PERCENT);
  return {
    xp: Math.round((base.xp * (100 + bonusPercent)) / 100),
    coins: base.coins,
  };
}
