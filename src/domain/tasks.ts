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

// A new task may start today or later. The past is read-only for adding: it only lets you finish
// tasks that are already overdue. 'YYYY-MM-DD' strings compare like dates.
export function canStartOn(startDate: ISODate, today: ISODate): boolean {
  return startDate >= today;
}

// An active task whose last day is already behind us. Overdue never removes XP or coins.
export function countOverdue(tasks: Task[], today: ISODate): number {
  return tasks.filter((task) => task.status === "active" && task.endDate < today).length;
}

// Active tasks on today's list: their dates include the day (a 16-18 Nov task counts on the 17th).
export function countActiveOn(tasks: Task[], day: ISODate): number {
  return tasks.filter((task) => task.status === "active" && isBetween(day, task.startDate, task.endDate)).length;
}

// Tasks completed on a local day. Grouped by the day written when it was completed.
export function countCompletedOn(tasks: Task[], day: ISODate): number {
  return tasks.filter((task) => task.status === "done" && task.completedOn === day).length;
}

// Tasks that became overdue and have not reset the streak yet (each one resets it once).
export function newlyOverdue(tasks: Task[], today: ISODate): Task[] {
  return tasks.filter((task) => task.status === "active" && task.endDate < today && !task.overdueFlagged);
}
