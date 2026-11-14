// Reminder rules. Pure: the day and the counts are parameters, nothing reads the clock.
import type { ISODate } from "./types";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * The text of the reminder, or null when there is nothing to say (no task due today, none overdue).
 * "3 tasks due today and 2 overdue." / "1 task due today." / "2 tasks are overdue."
 */
export function reminderMessage(dueToday: number, overdue: number): string | null {
  const due = `${dueToday} ${plural(dueToday, "task", "tasks")} due today`;
  if (dueToday > 0 && overdue > 0) return `${due} and ${overdue} overdue.`;
  if (dueToday > 0) return `${due}.`;
  if (overdue > 0) return `${overdue} ${plural(overdue, "task is", "tasks are")} overdue.`;
  return null;
}

export interface ShouldRemindInput {
  enabled: boolean;
  today: ISODate;
  /** The day a reminder was last sent, or null if never. */
  lastRemindedDay: ISODate | null;
  dueToday: number;
  overdue: number;
}

/**
 * Send a reminder only if the setting is on, none was sent today yet, and there is something to say.
 * Any other `lastRemindedDay`, including one in the future (the clock was moved back), counts as "not today".
 */
export function shouldRemind({ enabled, today, lastRemindedDay, dueToday, overdue }: ShouldRemindInput): boolean {
  if (!enabled) return false;
  if (lastRemindedDay === today) return false;
  return reminderMessage(dueToday, overdue) !== null;
}
