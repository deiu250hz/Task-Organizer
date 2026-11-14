import { DayPicker } from "react-day-picker";
import { Panel } from "../layout/Panel";
import { formatDayRange, toISODate } from "../../domain/dates";
import { useHasTaskOn } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { applyRange, selectionToRange, toDate } from "./dateAdapters";

const navButton =
  "flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text";

// Selected range ends sit on a solid accent chip; the cell behind them carries the soft band.
const rangeEnd = "bg-accent/25 [&>button]:bg-accent [&>button]:font-bold [&>button]:text-on-accent";

export function CalendarPanel() {
  // One narrow selector per value: the panel re-renders only when one of these changes.
  const today = useAppStore((s) => s.today);
  const selection = useAppStore((s) => s.selection);
  const selectDay = useAppStore((s) => s.selectDay);
  const selectRange = useAppStore((s) => s.selectRange);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const hasTaskOn = useHasTaskOn();

  return (
    <Panel id="calendar-heading" title="Calendar">
      <DayPicker
        mode="range"
        selected={selectionToRange(selection)}
        onSelect={(range) => applyRange(range, { selectDay, selectRange, clearSelection })}
        today={toDate(today)}
        defaultMonth={toDate(today)}
        weekStartsOn={1}
        modifiers={{ hasTasks: (date) => hasTaskOn(toISODate(date)) }}
        modifiersClassNames={{
          // The dot sits in the cell's bottom padding, below the day button, so it never
          // overlaps the selected-day chip.
          hasTasks:
            "after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-xp",
        }}
        classNames={{
          root: "relative",
          months: "relative",
          month_caption: "mb-3 flex h-8 items-center justify-center",
          caption_label: "font-pixel text-base font-bold text-text",
          nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
          button_previous: navButton,
          button_next: navButton,
          chevron: "h-4 w-4 fill-current",
          month_grid: "w-full border-collapse",
          weekday: "pb-1 text-center text-xs font-normal text-text-muted",
          day: "relative p-0 pb-1.5 text-center text-sm",
          day_button:
            "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-raised",
          range_start: `${rangeEnd} rounded-l-md`,
          range_end: `${rangeEnd} rounded-r-md`,
          range_middle: "bg-accent/25",
          today: "[&>button]:ring-1 [&>button]:ring-accent",
        }}
      />

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-muted">
        {selection === null ? (
          <span>Click a day, then another to pick a range.</span>
        ) : (
          <>
            <span>
              Selected:{" "}
              <span className="font-semibold text-text">
                {formatDayRange(selection.from, selection.to)}
              </span>
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md px-2 py-1 text-accent transition-colors hover:bg-surface-raised"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </Panel>
  );
}
