import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Task } from "../../domain/types";
import { rewardRepo } from "../../repositories/rewardRepo";
import { taskRepo } from "../../repositories/taskRepo";
import { useAppStore } from "../useAppStore";

// SQL cannot run in Vitest, so both repositories are replaced by mocks. These tests check the
// store's orchestration: which reward it computes and what it does with the results.
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: {
    listInRange: vi.fn(),
    create: vi.fn(),
    complete: vi.fn(),
    flagOverdue: vi.fn(),
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

function makeTask(id: number, difficulty: Difficulty, status: Task["status"] = "active"): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    startDate: TODAY,
    endDate: TODAY,
    difficulty,
    status,
    overdueFlagged: false,
    completedOn: null,
  };
}

const complete = vi.mocked(taskRepo.complete);
const totals = vi.mocked(rewardRepo.totals);
const activeDays = vi.mocked(rewardRepo.activeDaysSinceLastReset);
const lastCompletion = vi.mocked(rewardRepo.lastCompletionAt);

beforeEach(() => {
  vi.resetAllMocks();
  complete.mockResolvedValue(undefined);
  totals.mockResolvedValue({ xp: 0, coins: 0 });
  activeDays.mockResolvedValue([]);
  lastCompletion.mockResolvedValue(null);
  useAppStore.setState({
    tasks: [makeTask(1, 2)], // medium: 25 XP / 10 coins before any bonus
    today: TODAY,
    totals: { xp: 0, coins: 0 },
    streak: 0,
    lastCompletionAt: null,
    oneShots: [],
    displayStage: 1,
    error: null,
  });
});

describe("completeTask", () => {
  it("pays the base reward when there is no streak", async () => {
    await useAppStore.getState().completeTask(1);
    expect(complete).toHaveBeenCalledWith(1, { xp: 25, coins: 10 }, TODAY);
  });

  it("applies the bonus from the days before today", async () => {
    activeDays.mockResolvedValueOnce(["2026-11-13", "2026-11-12"]);
    await useAppStore.getState().completeTask(1);
    expect(complete).toHaveBeenCalledWith(1, { xp: 30, coins: 10 }, TODAY); // streak 2: +20%
  });

  it("ignores today's own completions when computing the bonus", async () => {
    activeDays.mockResolvedValueOnce(["2026-11-14", "2026-11-13", "2026-11-12"]);
    await useAppStore.getState().completeTask(1);
    expect(complete).toHaveBeenCalledWith(1, { xp: 30, coins: 10 }, TODAY); // still 2, not 3
  });

  it("gives no bonus when the streak ended before yesterday", async () => {
    activeDays.mockResolvedValueOnce(["2026-11-11", "2026-11-10"]);
    await useAppStore.getState().completeTask(1);
    expect(complete).toHaveBeenCalledWith(1, { xp: 25, coins: 10 }, TODAY);
  });

  it("marks the task done in the state", async () => {
    await useAppStore.getState().completeTask(1);
    const task = useAppStore.getState().tasks[0];
    expect(task.status).toBe("done");
    expect(task.completedOn).toBe(TODAY);
  });

  it("does nothing for a task that is not active", async () => {
    useAppStore.setState({ tasks: [makeTask(1, 2, "done")] });
    await useAppStore.getState().completeTask(1);
    expect(complete).not.toHaveBeenCalled();
  });

  it("does nothing for an unknown task id", async () => {
    await useAppStore.getState().completeTask(999);
    expect(complete).not.toHaveBeenCalled();
  });

  it("refreshes totals and streak afterwards", async () => {
    activeDays.mockResolvedValueOnce(["2026-11-13"]); // read before completing
    activeDays.mockResolvedValue(["2026-11-14", "2026-11-13"]); // read by loadProgress afterwards
    totals.mockResolvedValue({ xp: 28, coins: 10 });
    await useAppStore.getState().completeTask(1);
    expect(useAppStore.getState().totals).toEqual({ xp: 28, coins: 10 });
    expect(useAppStore.getState().streak).toBe(2); // today counts in the displayed streak
  });

  it("records an error and keeps the task active when the repository fails", async () => {
    complete.mockRejectedValue("disk full");
    await useAppStore.getState().completeTask(1);
    expect(useAppStore.getState().error).toBe("disk full");
    expect(useAppStore.getState().tasks[0].status).toBe("active");
  });
});

describe("loadProgress", () => {
  it("sets the totals from the ledger", async () => {
    totals.mockResolvedValue({ xp: 120, coins: 45 });
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().totals).toEqual({ xp: 120, coins: 45 });
  });

  it("counts today in the displayed streak", async () => {
    activeDays.mockResolvedValue(["2026-11-14", "2026-11-13"]);
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().streak).toBe(2);
  });

  it("keeps the streak alive from yesterday until something is done today", async () => {
    activeDays.mockResolvedValue(["2026-11-13", "2026-11-12", "2026-11-11"]);
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().streak).toBe(3);
  });

  it("is 0 for an empty ledger", async () => {
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().streak).toBe(0);
    expect(useAppStore.getState().totals).toEqual({ xp: 0, coins: 0 });
  });

  it("records an error when the repository fails", async () => {
    totals.mockRejectedValue(new Error("db locked"));
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().error).toBe("db locked");
  });
});
