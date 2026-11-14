import { describe, expect, it } from "vitest";
import { anyTaskOn, tasksInRange } from "../tasks";
import type { Task } from "../types";

function makeTask(id: number, startDate: string, endDate: string): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    startDate,
    endDate,
    difficulty: 1,
    status: "active",
    overdueFlagged: false,
    completedOn: null,
  };
}

// The phase's done check: a task on 16-18 Nov must show on all three days.
const labReport = makeTask(1, "2026-11-16", "2026-11-18");
const dentist = makeTask(2, "2026-11-20", "2026-11-20");

describe("tasksInRange", () => {
  it("keeps a task that spans the whole selection", () => {
    expect(tasksInRange([labReport], "2026-11-17", "2026-11-17")).toEqual([labReport]);
  });

  it("keeps a task that only touches the first day of the selection", () => {
    expect(tasksInRange([labReport], "2026-11-18", "2026-11-25")).toEqual([labReport]);
  });

  it("keeps a task that only touches the last day of the selection", () => {
    expect(tasksInRange([labReport], "2026-11-10", "2026-11-16")).toEqual([labReport]);
  });

  it("drops tasks outside the range", () => {
    expect(tasksInRange([labReport, dentist], "2026-11-19", "2026-11-19")).toEqual([]);
  });

  it("returns only the overlapping tasks, in the original order", () => {
    expect(tasksInRange([labReport, dentist], "2026-11-18", "2026-11-20")).toEqual([
      labReport,
      dentist,
    ]);
    expect(tasksInRange([labReport, dentist], "2026-11-20", "2026-11-20")).toEqual([dentist]);
  });

  it("returns an empty list when there are no tasks", () => {
    expect(tasksInRange([], "2026-11-16", "2026-11-18")).toEqual([]);
  });
});

describe("anyTaskOn", () => {
  it("is true on every day of 16-18 Nov", () => {
    expect(anyTaskOn([labReport], "2026-11-16")).toBe(true);
    expect(anyTaskOn([labReport], "2026-11-17")).toBe(true);
    expect(anyTaskOn([labReport], "2026-11-18")).toBe(true);
  });

  it("is false the day before and the day after", () => {
    expect(anyTaskOn([labReport], "2026-11-15")).toBe(false);
    expect(anyTaskOn([labReport], "2026-11-19")).toBe(false);
  });

  it("is false when there are no tasks", () => {
    expect(anyTaskOn([], "2026-11-16")).toBe(false);
  });
});
