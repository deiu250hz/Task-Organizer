import { useMemo } from "react";
import { levelFromXp } from "../domain/levels";
import { moodFor } from "../domain/mood";
import {
  anyTaskOn,
  countActiveOn,
  countCompletedOn,
  countOverdue,
  tasksInRange,
} from "../domain/tasks";
import type { ISODate, Mood, QueuedOneShot, Task } from "../domain/types";
import { useAppStore } from "./useAppStore";
import { useNow } from "./useNow";

// These hooks read only stable slices (tasks, selection, totals, streak) and derive the result
// with useMemo. A selector that built a new array or object itself would return a different
// value on every call and make Zustand 5 re-render forever.

export interface PlayerProgress {
  level: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP the current level needs to be completed. */
  needed: number;
  xp: number;
  coins: number;
  streak: number;
}

/** Level, XP-into-level, coins and streak, derived from the ledger totals in the store. */
export function usePlayerProgress(): PlayerProgress {
  const totals = useAppStore((s) => s.totals);
  const streak = useAppStore((s) => s.streak);
  return useMemo(() => {
    const { level, intoLevel, needed } = levelFromXp(totals.xp);
    return { level, intoLevel, needed, xp: totals.xp, coins: totals.coins, streak };
  }, [totals, streak]);
}

/** Every task when nothing is selected, otherwise only the tasks that overlap the selection. */
export function useVisibleTasks(): Task[] {
  const tasks = useAppStore((s) => s.tasks);
  const selection = useAppStore((s) => s.selection);
  return useMemo(
    () => (selection === null ? tasks : tasksInRange(tasks, selection.from, selection.to)),
    [tasks, selection],
  );
}

/** Returns a function the calendar calls for each visible day to decide whether to draw a dot. */
export function useHasTaskOn(): (day: ISODate) => boolean {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => (day: ISODate) => anyTaskOn(tasks, day), [tasks]);
}

const MS_PER_MINUTE = 60_000;

/**
 * The pet's mood, derived from the tasks and the clock. It is recomputed when a task changes
 * and every 30 seconds, so the happy hour ends on its own. Reads stable slices only.
 */
export function usePetMood(): Mood {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const lastCompletionAt = useAppStore((s) => s.lastCompletionAt);
  const now = useNow();
  return useMemo(
    () =>
      moodFor({
        overdueCount: countOverdue(tasks, today),
        completedToday: countCompletedOn(tasks, today),
        activeDueToday: countActiveOn(tasks, today),
        localHour: new Date(now).getHours(),
        minutesSinceLastCompletion:
          lastCompletionAt === null ? null : (now - lastCompletionAt) / MS_PER_MINUTE,
      }),
    [tasks, today, lastCompletionAt, now],
  );
}

/** The animation playing now (the head of the queue), or null when nothing is pending. */
export function usePetOneShot(): QueuedOneShot | null {
  return useAppStore((s) => s.oneShots[0] ?? null);
}
