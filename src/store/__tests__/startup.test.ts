import { beforeEach, describe, expect, it, vi } from "vitest";

// startup() keeps its promise in module scope, so each test loads a fresh copy of the store.
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: { listInRange: vi.fn(), create: vi.fn(), complete: vi.fn(), flagOverdue: vi.fn(), archive: vi.fn() },
}));
vi.mock("../../repositories/settingsRepo", () => ({
  settingsRepo: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: { totals: vi.fn(), activeDaysSinceLastReset: vi.fn(), completedCount: vi.fn(), lastCompletionAt: vi.fn() },
}));
vi.mock("../../repositories/shopRepo", () => ({
  shopRepo: { listItems: vi.fn(), listOwned: vi.fn(), purchase: vi.fn(), setEquipped: vi.fn() },
}));
vi.mock("../../platform/notifier", () => ({
  notifier: { notify: vi.fn() },
}));

async function freshStore() {
  vi.resetModules();
  const { taskRepo } = await import("../../repositories/taskRepo");
  const { rewardRepo } = await import("../../repositories/rewardRepo");
  const { settingsRepo } = await import("../../repositories/settingsRepo");
  const { shopRepo } = await import("../../repositories/shopRepo");
  const { notifier } = await import("../../platform/notifier");
  const { useAppStore } = await import("../useAppStore");
  vi.mocked(notifier.notify).mockResolvedValue(true);
  vi.mocked(shopRepo.listItems).mockResolvedValue([]);
  vi.mocked(shopRepo.listOwned).mockResolvedValue([]);
  vi.mocked(taskRepo.listInRange).mockResolvedValue([]);
  vi.mocked(taskRepo.flagOverdue).mockResolvedValue(undefined);
  vi.mocked(rewardRepo.totals).mockResolvedValue({ xp: 0, coins: 0 });
  vi.mocked(rewardRepo.activeDaysSinceLastReset).mockResolvedValue([]);
  vi.mocked(rewardRepo.lastCompletionAt).mockResolvedValue(null);
  vi.mocked(settingsRepo.get).mockResolvedValue(null);
  return { taskRepo, rewardRepo, settingsRepo, shopRepo, notifier, useAppStore };
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

  it("also reads the saved settings (pet and reminders), once", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    vi.mocked(settingsRepo.get).mockImplementation(async (key) =>
      key === "species" ? "cat" : key === "reminders" ? "0" : key === "lastReminderDay" ? "2026-11-14" : null,
    );
    await Promise.all([useAppStore.getState().startup(), useAppStore.getState().startup()]);
    // three keys, read once: a second startup() call shares the first run
    expect(settingsRepo.get).toHaveBeenCalledTimes(3);
    expect(settingsRepo.get).toHaveBeenCalledWith("species");
    expect(settingsRepo.get).toHaveBeenCalledWith("reminders");
    expect(settingsRepo.get).toHaveBeenCalledWith("lastReminderDay");
    expect(useAppStore.getState().species).toBe("cat");
    expect(useAppStore.getState().remindersEnabled).toBe(false);
    expect(useAppStore.getState().lastReminderDay).toBe("2026-11-14");
    expect(useAppStore.getState().settingsLoaded).toBe(true);
  });

  it("treats a missing reminders setting as on", async () => {
    const { useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    expect(useAppStore.getState().remindersEnabled).toBe(true);
    expect(useAppStore.getState().lastReminderDay).toBeNull();
  });

  it("sends the reminder last, once, when something is due today", async () => {
    const { taskRepo, settingsRepo, notifier, useAppStore } = await freshStore();
    const today = useAppStore.getState().today;
    vi.mocked(taskRepo.listInRange).mockResolvedValue([
      { id: 1, title: "Due", notes: null, startDate: today, endDate: today, difficulty: 1, status: "active", overdueFlagged: false, completedOn: null },
    ]);
    await Promise.all([useAppStore.getState().startup(), useAppStore.getState().startup()]);
    expect(notifier.notify).toHaveBeenCalledTimes(1);
    expect(notifier.notify).toHaveBeenCalledWith("Tasks Organizer", "1 task due today.");
    expect(settingsRepo.set).toHaveBeenCalledWith("lastReminderDay", today);
  });

  it("sends nothing when no task is due or overdue", async () => {
    const { notifier, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("also loads the shop items and the inventory, once", async () => {
    const { shopRepo, useAppStore } = await freshStore();
    vi.mocked(shopRepo.listItems).mockResolvedValue([
      { id: 1, slot: "glasses", name: "Round Glasses", price: 10, minLevel: 1, assetKey: "glasses_round" },
    ]);
    vi.mocked(shopRepo.listOwned).mockResolvedValue([{ itemId: 1, equipped: true }]);
    await Promise.all([useAppStore.getState().startup(), useAppStore.getState().startup()]);
    expect(shopRepo.listItems).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().items).toHaveLength(1);
    expect(useAppStore.getState().owned).toEqual([{ itemId: 1, equipped: true }]);
  });

  it("does not flag anything when nothing is overdue", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    expect(taskRepo.flagOverdue).not.toHaveBeenCalled();
  });
});
