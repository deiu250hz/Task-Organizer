import { useMemo } from "react";
import { anyTaskOn, tasksInRange } from "../domain/tasks";
import type { ISODate, Task } from "../domain/types";
import { useAppStore } from "./useAppStore";

// Both hooks read only stable slices (tasks, selection) and derive the result with useMemo.
// A selector that built a new array itself would return a different value on every call
// and make Zustand 5 re-render forever.

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
