import { beforeEach, describe, expect, it, vi } from "vitest";
import { countOverdue } from "../../domain/tasks";
import type { Task } from "../../domain/types";
import { rewardRepo } from "../../repositories/rewardRepo";
import { taskRepo } from "../../repositories/taskRepo";
import { useAppStore } from "../useAppStore";

vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: {
    listInRange: vi.fn(),
    create: vi.fn(),
    complete: vi.fn(),
    flagOverdue: vi.fn(),
    archive: vi.fn(),
  },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: {
    totals: vi.fn(),
    activeDaysSinceLastReset: vi.fn(),
    completedCount: vi.fn(),
    lastCompletionAt: vi.fn(),
  },
}));

const TODAY = "2026-11-14";

function task(id: number, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    startDate: TODAY,
    endDate: TODAY,
    difficulty: 1,
    status: "active",
    overdueFlagged: false,
    completedOn: null,
    ...extra,
  };
}

const archive = vi.mocked(taskRepo.archive);
const totals = vi.mocked(rewardRepo.totals);

beforeEach(() => {
  vi.resetAllMocks();
  archive.mockResolvedValue(undefined);
  totals.mockResolvedValue({ xp: 0, coins: 0 });
  useAppStore.setState({
    tasks: [task(1), task(2)],
    today: TODAY,
    totals: { xp: 120, coins: 40 },
    error: null,
  });
});

describe("deleteTask", () => {
  it("archives an active task and removes it from the list", async () => {
    await useAppStore.getState().deleteTask(1);
    expect(archive).toHaveBeenCalledWith(1);
    expect(useAppStore.getState().tasks.map((t) => t.id)).toEqual([2]);
  });

  it("leaves XP and coins alone, because the ledger is never touched", async () => {
    await useAppStore.getState().deleteTask(1);
    expect(useAppStore.getState().totals).toEqual({ xp: 120, coins: 40 });
    expect(totals).not.toHaveBeenCalled();
  });

  it("does not delete a done task", async () => {
    useAppStore.setState({ tasks: [task(1, { status: "done", completedOn: TODAY })] });
    await useAppStore.getState().deleteTask(1);
    expect(archive).not.toHaveBeenCalled();
    expect(useAppStore.getState().tasks).toHaveLength(1);
  });

  it("ignores an id that is not in the list", async () => {
    await useAppStore.getState().deleteTask(999);
    expect(archive).not.toHaveBeenCalled();
    expect(useAppStore.getState().tasks).toHaveLength(2);
  });

  it("keeps the task and records an error when the repository fails", async () => {
    archive.mockRejectedValue("disk full");
    await useAppStore.getState().deleteTask(1);
    expect(useAppStore.getState().error).toBe("disk full");
    expect(useAppStore.getState().tasks.map((t) => t.id)).toEqual([1, 2]);
  });

  it("is harmless to call twice, the second call finds nothing to delete", async () => {
    await useAppStore.getState().deleteTask(1);
    await useAppStore.getState().deleteTask(1);
    expect(archive).toHaveBeenCalledTimes(1);
  });

  it("removes an overdue task from the overdue count, which the mood reads", async () => {
    useAppStore.setState({ tasks: [task(1, { startDate: "2026-11-10", endDate: "2026-11-12" })] });
    expect(countOverdue(useAppStore.getState().tasks, TODAY)).toBe(1);
    await useAppStore.getState().deleteTask(1);
    expect(countOverdue(useAppStore.getState().tasks, TODAY)).toBe(0);
  });

  it("does not undo a streak reset that was already applied", async () => {
    // The reset lives in the ledger, written when the task was flagged. Deleting reads nothing from it.
    useAppStore.setState({ tasks: [task(1, { endDate: "2026-11-12", overdueFlagged: true })], streak: 0 });
    await useAppStore.getState().deleteTask(1);
    expect(useAppStore.getState().streak).toBe(0);
  });
});
