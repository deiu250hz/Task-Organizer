import { isBetween, rangesOverlap } from "./dates";
import type { ISODate, Task } from "./types";

// Tasks that share at least one day with the inclusive range from..to.
export function tasksInRange(tasks: Task[], from: ISODate, to: ISODate): Task[] {
  return tasks.filter((task) => rangesOverlap(task.startDate, task.endDate, from, to));
}

// Is there at least one task on this day? Used for the calendar's task dots.
export function anyTaskOn(tasks: Task[], day: ISODate): boolean {
  return tasks.some((task) => isBetween(day, task.startDate, task.endDate));
}
