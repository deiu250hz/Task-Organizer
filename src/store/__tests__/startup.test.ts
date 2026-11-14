import { beforeEach, describe, expect, it, vi } from "vitest";

// startup() keeps its promise in module scope, so each test loads a fresh copy of the store.
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: { listInRange: vi.fn(), create: vi.fn(), complete: vi.fn(), flagOverdue: vi.fn(), markFlagged: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: { totals: vi.fn(), activeDaysSinceLastReset: vi.fn(), completedCount: vi.fn(), lastCompletionAt: vi.fn() },
}));

async function freshStore() {
  vi.resetModules();
  const { taskRepo } = await import("../../repositories/taskRepo");
  const { rewardRepo } = await import("../../repositories/rewardRepo");
  const { useAppStore } = await import("../useAppStore");
  vi.mocked(taskRepo.listInRange).mockResolvedValue([]);
  vi.mocked(taskRepo.flagOverdue).mockResolvedValue(undefined);
  vi.mocked(rewardRepo.totals).mockResolvedValue({ xp: 0, coins: 0 });
  vi.mocked(rewardRepo.activeDaysSinceLastReset).mockResolvedValue([]);
  vi.mocked(rewardRepo.lastCompletionAt).mockResolvedValue(null);
  return { taskRepo, rewardRepo, useAppStore };
}

describe("startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads tasks, sweeps, then loads progress", async () => {
    const { taskRepo, rewardRepo, useAppStore } = await freshStore();
    vi.mocked(taskRepo.listInRange).mockResolvedValue([
      { id: 1, title: "Late", notes: null, startDate: "2000-01-01", endDate: "2000-01-02", difficulty: 1, status: "active", overdueFlagged: false, completedOn: null },
    ]);
    await useAppStore.getState().startup();
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1);
    expect(taskRepo.flagOverdue).toHaveBeenCalledWith([1], useAppStore.getState().today);
    expect(rewardRepo.totals).toHaveBeenCalled();
    expect(useAppStore.getState().tasks[0].overdueFlagged).toBe(true);
  });

  it("runs its steps once when called twice at the same time, like StrictMode does", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    const first = useAppStore.getState().startup();
    const second = useAppStore.getState().startup();
    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1);
  });

  it("does not flag anything when nothing is overdue", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    expect(taskRepo.flagOverdue).not.toHaveBeenCalled();
  });
});
