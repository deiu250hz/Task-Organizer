import { describe, expect, it } from "vitest";
import { countActiveOn, countCompletedOn, countOverdue, newlyOverdue } from "../tasks";
import type { Task } from "../types";

const TODAY = "2026-11-14";

function task(id: number, startDate: string, endDate: string, extra: Partial<Task> = {}): Task {
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
    ...extra,
  };
}

describe("countOverdue", () => {
  it("counts active tasks that ended before today", () => {
    expect(countOverdue([task(1, "2026-11-10", "2026-11-13")], TODAY)).toBe(1);
  });

  it("does not count a task ending today", () => {
    expect(countOverdue([task(1, "2026-11-14", "2026-11-14")], TODAY)).toBe(0);
  });

  it("does not count done or archived tasks", () => {
    const tasks = [
      task(1, "2026-11-10", "2026-11-13", { status: "done", completedOn: "2026-11-13" }),
      task(2, "2026-11-10", "2026-11-13", { status: "archived" }),
    ];
    expect(countOverdue(tasks, TODAY)).toBe(0);
  });

  it("counts flagged tasks too, because they are still overdue", () => {
    expect(countOverdue([task(1, "2026-11-10", "2026-11-13", { overdueFlagged: true })], TODAY)).toBe(1);
  });
});

describe("countActiveOn", () => {
  it("counts a multi-day task on every day it covers", () => {
    const tasks = [task(1, "2026-11-12", "2026-11-16")];
    expect(countActiveOn(tasks, "2026-11-12")).toBe(1);
    expect(countActiveOn(tasks, "2026-11-14")).toBe(1);
    expect(countActiveOn(tasks, "2026-11-16")).toBe(1);
  });

  it("does not count days outside the task or finished tasks", () => {
    const tasks = [task(1, "2026-11-12", "2026-11-16"), task(2, "2026-11-14", "2026-11-14", { status: "done", completedOn: TODAY })];
    expect(countActiveOn(tasks, "2026-11-11")).toBe(0);
    expect(countActiveOn(tasks, "2026-11-17")).toBe(0);
    expect(countActiveOn([tasks[1]], TODAY)).toBe(0);
  });
});

describe("countCompletedOn", () => {
  it("counts tasks completed on exactly that day", () => {
    const tasks = [
      task(1, TODAY, TODAY, { status: "done", completedOn: TODAY }),
      task(2, TODAY, TODAY, { status: "done", completedOn: "2026-11-13" }),
      task(3, TODAY, TODAY),
    ];
    expect(countCompletedOn(tasks, TODAY)).toBe(1);
    expect(countCompletedOn(tasks, "2026-11-13")).toBe(1);
  });
});

describe("newlyOverdue", () => {
  it("returns active overdue tasks that have not reset the streak yet", () => {
    const fresh = task(1, "2026-11-10", "2026-11-13");
    const already = task(2, "2026-11-10", "2026-11-12", { overdueFlagged: true });
    const onTime = task(3, "2026-11-14", "2026-11-14");
    expect(newlyOverdue([fresh, already, onTime], TODAY).map((t) => t.id)).toEqual([1]);
  });

  it("ignores done tasks even if they were never flagged", () => {
    const done = task(1, "2026-11-10", "2026-11-13", { status: "done", completedOn: "2026-11-12" });
    expect(newlyOverdue([done], TODAY)).toEqual([]);
  });
});
