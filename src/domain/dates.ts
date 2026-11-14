import type { ISODate } from "./types";

// Builds 'YYYY-MM-DD' from the LOCAL year, month and day of d.
// Never use d.toISOString() for this: it converts to UTC and can shift the day.
export function toISODate(d: Date): ISODate {
  const year = String(d.getFullYear()).padStart(4, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-based
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
