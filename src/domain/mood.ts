import { HAPPY_AFTER_COMPLETION_MINUTES, SLEEPY_HOUR } from "./config";
import type { Mood } from "./types";

export interface MoodInput {
  /** Active tasks whose last day is before today. */
  overdueCount: number;
  completedToday: number;
  /** Active tasks whose dates include today (today's list). */
  activeDueToday: number;
  /** 0-23, local time. */
  localHour: number;
  /** Minutes since the last completed task, or null if nothing was ever completed. Negative values (the clock moved back) count as "just now". */
  minutesSinceLastCompletion: number | null;
}

/**
 * First match wins:
 * 1. sad:    something is overdue and nothing was completed today
 * 2. sleepy: nothing was completed today and it is late
 * 3. happy:  a task was completed within the last hour, or today's whole list is done
 * 4. idle:   otherwise
 */
export function moodFor(input: MoodInput): Mood {
  const { overdueCount, completedToday, activeDueToday, localHour, minutesSinceLastCompletion } = input;

  if (overdueCount > 0 && completedToday === 0) return "sad";
  if (completedToday === 0 && localHour >= SLEEPY_HOUR) return "sleepy";

  const recentlyCompleted =
    minutesSinceLastCompletion !== null && minutesSinceLastCompletion < HAPPY_AFTER_COMPLETION_MINUTES;
  const todayListDone = completedToday > 0 && activeDueToday === 0; // happy for the rest of the day
  if (recentlyCompleted || todayListDone) return "happy";

  return "idle";
}
