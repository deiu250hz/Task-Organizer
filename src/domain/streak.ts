import { addDays } from "./dates";
import type { ISODate } from "./types";

/**
 * Consecutive local days with at least one completed task, counted back from today, or from
 * yesterday when nothing is done yet today (so the streak survives until the day ends).
 * The caller passes only the days since the last streak reset. A Set makes the result
 * independent of ordering and duplicates, and days after today are never reached.
 */
export function streakFrom(activeDaysDesc: ISODate[], today: ISODate): number {
  const days = new Set(activeDaysDesc);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
