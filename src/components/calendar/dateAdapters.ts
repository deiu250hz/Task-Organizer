import { parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toISODate } from "../../domain/dates";
import type { DateSelection, ISODate } from "../../domain/types";

// The only file where Date objects meet the app's ISODate strings: react-day-picker works
// with Date, the store and the domain work with 'YYYY-MM-DD'. Keeping the conversion here
// means no other file needs to think about time zones.

/** 'YYYY-MM-DD' -> local midnight of that day (parseISO reads a date-only string as local). */
export function toDate(day: ISODate): Date {
  return parseISO(day);
}

export function selectionToRange(selection: DateSelection | null): DateRange | undefined {
  if (selection === null) return undefined;
  return { from: toDate(selection.from), to: toDate(selection.to) };
}

export interface SelectionActions {
  selectDay(day: ISODate): void;
  selectRange(from: ISODate, to: ISODate): void;
  clearSelection(): void;
}

/** Turns what react-day-picker reports into the matching store action. */
export function applyRange(range: DateRange | undefined, actions: SelectionActions): void {
  if (range === undefined || range.from === undefined) {
    actions.clearSelection(); // the library reports undefined when the selected day is clicked again
    return;
  }
  const from = toISODate(range.from);
  if (range.to === undefined) {
    actions.selectDay(from);
  } else {
    actions.selectRange(from, toISODate(range.to)); // selectRange fixes reversed ends itself
  }
}
