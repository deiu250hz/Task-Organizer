import { Panel } from "../layout/Panel";
import { MOCK_MONTH } from "../../mock/mockData";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CalendarPanel() {
  const { label, daysInMonth, leadingBlanks, today, rangeStart, rangeEnd, daysWithTasks } =
    MOCK_MONTH;

  const blanks = Array.from({ length: leadingBlanks }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Panel id="calendar-heading" title="Calendar">
      <p className="mb-3 text-center font-pixel text-base font-bold text-text">
        {label}
      </p>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-xs text-text-muted">
            {day}
          </span>
        ))}

        {blanks.map((i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}

        {days.map((day) => {
          const inRange = day >= rangeStart && day <= rangeEnd;
          const isEdge = day === rangeStart || day === rangeEnd;
          const isToday = day === today;
          const hasTasks = daysWithTasks.includes(day);

          const shape = isEdge
            ? "bg-accent text-on-accent font-bold"
            : inRange
              ? "bg-accent/25 text-text"
              : "text-text hover:bg-surface-raised";
          const ring = isToday && !isEdge ? "ring-1 ring-accent" : "";

          return (
            <button
              key={day}
              type="button"
              aria-label={`${day} November${isToday ? ", today" : ""}${hasTasks ? ", has tasks" : ""}`}
              aria-pressed={inRange}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors ${shape} ${ring}`}
            >
              {day}
              {hasTasks && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${isEdge ? "bg-on-accent" : "bg-xp"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-text-muted">
        Selected: 16 – 18 Nov
      </p>
    </Panel>
  );
}
