import { useMemo } from "react";
import { levelFromXp } from "../domain/levels";
import { anyTaskOn, tasksInRange } from "../domain/tasks";
import type { ISODate, Task } from "../domain/types";
import { useAppStore } from "./useAppStore";

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
