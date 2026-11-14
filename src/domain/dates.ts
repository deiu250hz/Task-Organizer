import { addDays as addDaysToDate, format, parseISO } from "date-fns";
import type { ISODate } from "./types";

// Builds 'YYYY-MM-DD' from the LOCAL year, month and day of d.
// Never use d.toISOString() for this: it converts to UTC and can shift the day.
export function toISODate(d: Date): ISODate {
  const year = String(d.getFullYear()).padStart(4, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-based
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Calendar arithmetic: parseISO reads a date-only string as LOCAL midnight, and date-fns
// addDays moves by calendar days, so a daylight-saving change cannot add or lose a day.
export function addDays(day: ISODate, n: number): ISODate {
  return toISODate(addDaysToDate(parseISO(day), n));
}

// Inclusive on both ends. 'YYYY-MM-DD' strings sort like dates, so plain comparison is enough.
export function isBetween(day: ISODate, from: ISODate, to: ISODate): boolean {
  return from <= day && day <= to;
}

// True when two inclusive ranges share at least one day (touching at one day counts).
export function rangesOverlap(
  aFrom: ISODate,
  aTo: ISODate,
  bFrom: ISODate,
  bTo: ISODate,
): boolean {
  return aFrom <= bTo && aTo >= bFrom;
}

// "16 Nov", "16 – 18 Nov", "30 Nov – 2 Dec", or with years when the range crosses a year.
export function formatDayRange(from: ISODate, to: ISODate): string {
  const start = parseISO(from);
  const end = parseISO(to);
  if (from === to) return format(start, "d MMM");
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "d")} – ${format(end, "d MMM")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}
