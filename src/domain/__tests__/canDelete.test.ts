import { describe, expect, it } from "vitest";
import { canDelete } from "../tasks";
import type { Task } from "../types";

function task(status: Task["status"]): Task {
  return {
    id: 1,
    title: "Task",
    notes: null,
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    difficulty: 1,
    status,
    overdueFlagged: false,
    completedOn: status === "done" ? "2026-11-14" : null,
  };
}

describe("canDelete", () => {
  it("allows deleting an active task", () => {
    expect(canDelete(task("active"))).toBe(true);
  });

  it("does not allow deleting a done task, which is history", () => {
    expect(canDelete(task("done"))).toBe(false);
  });

  it("does not allow deleting a task that is already archived", () => {
    expect(canDelete(task("archived"))).toBe(false);
  });

  it("allows deleting an overdue active task", () => {
    expect(canDelete({ ...task("active"), endDate: "2026-11-10", overdueFlagged: true })).toBe(true);
  });
});
