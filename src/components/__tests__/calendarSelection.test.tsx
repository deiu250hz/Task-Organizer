import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Task } from "../../domain/types";
import { useAppStore } from "../../store/useAppStore";
import { CalendarPanel } from "../calendar/CalendarPanel";
import { TaskPanel } from "../tasks/TaskPanel";

// The phase's done check, at render level: a task on 16-18 Nov shows on all three days.
const labReport: Task = {
  id: 1,
  title: "Lab report",
  notes: null,
  startDate: "2026-11-16",
  endDate: "2026-11-18",
  difficulty: 2,
  status: "active",
  overdueFlagged: false,
  completedOn: null,
};

type StoreState = ReturnType<typeof useAppStore.getState>;

// Server rendering (renderToStaticMarkup) reads Zustand's INITIAL snapshot and ignores later
// setState calls, so the state to render is written into that snapshot for one render and
// then restored. Actions are covered by store/__tests__/selection.test.ts; here we only
// check what the components draw for a given state.
function renderWith(partial: Partial<StoreState>, ui: ReactElement): string {
  const initial = useAppStore.getInitialState();
  const saved = { ...initial };
  Object.assign(initial, { tasks: [], selection: null, today: "2026-11-14", error: null }, partial);
  try {
    return renderToStaticMarkup(ui);
  } finally {
    Object.assign(initial, saved);
  }
}

// react-day-picker renders each day as <td class="..." data-day="YYYY-MM-DD">.
function dayCellClasses(html: string, day: string): string {
  const match = html.match(new RegExp(`<td class="([^"]*)"[^>]*data-day="${day}"`));
  if (match === null) throw new Error(`Day ${day} not found in the calendar markup`);
  return match[1];
}

const DOT = "after:bg-xp";

describe("calendar task dots", () => {
  it("draws a dot on every day of a 16-18 Nov task and nowhere around it", () => {
    const html = renderWith({ tasks: [labReport] }, <CalendarPanel />);
    for (const day of ["2026-11-16", "2026-11-17", "2026-11-18"]) {
      expect(dayCellClasses(html, day)).toContain(DOT);
    }
    for (const day of ["2026-11-15", "2026-11-19"]) {
      expect(dayCellClasses(html, day)).not.toContain(DOT);
    }
  });

  it("marks the selected range ends and the days between", () => {
    const html = renderWith(
      { tasks: [labReport], selection: { from: "2026-11-16", to: "2026-11-18" } },
      <CalendarPanel />,
    );
    expect(dayCellClasses(html, "2026-11-16")).toContain("rounded-l-md");
    expect(dayCellClasses(html, "2026-11-17")).toContain("bg-accent/25");
    expect(dayCellClasses(html, "2026-11-18")).toContain("rounded-r-md");
    expect(html).toContain("16 – 18 Nov");
  });

  it("shows no dots when there are no tasks", () => {
    const html = renderWith({}, <CalendarPanel />);
    expect(dayCellClasses(html, "2026-11-17")).not.toContain(DOT);
  });
});

describe("task panel filtering", () => {
  it("shows every task when nothing is selected", () => {
    expect(renderWith({ tasks: [labReport] }, <TaskPanel />)).toContain("Lab report");
  });

  it("shows the task when the selection is any single day inside it", () => {
    for (const day of ["2026-11-16", "2026-11-17", "2026-11-18"]) {
      const html = renderWith(
        { tasks: [labReport], selection: { from: day, to: day } },
        <TaskPanel />,
      );
      expect(html).toContain("Lab report");
    }
  });

  it("hides the task when the selection is the day before or after it", () => {
    for (const day of ["2026-11-15", "2026-11-19"]) {
      const html = renderWith(
        { tasks: [labReport], selection: { from: day, to: day } },
        <TaskPanel />,
      );
      expect(html).not.toContain("Lab report");
      expect(html).toContain("No tasks for this selection.");
    }
  });

  it("offers a way back to all tasks while a selection is active", () => {
    const html = renderWith(
      { tasks: [labReport], selection: { from: "2026-11-19", to: "2026-11-19" } },
      <TaskPanel />,
    );
    expect(html).toContain("Show all");
  });

  it("points new tasks at the selected range in the quick-add placeholder", () => {
    const html = renderWith(
      { selection: { from: "2026-11-16", to: "2026-11-18" } },
      <TaskPanel />,
    );
    expect(html).toContain("Add a task for 16 – 18 Nov…");
  });
});
