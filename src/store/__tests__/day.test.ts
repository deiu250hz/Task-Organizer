import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../../domain/types";

// refreshDay() and startup() keep promises in module scope, and `today` is read when the store module
// loads, so every test sets the clock first and then loads a fresh copy of the store.
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

const DAY_1 = "2026-11-14";
const DAY_2 = "2026-11-15";
// Local times (no "Z"), because the app works in local days.
const at = (day: string, time: string) => new Date(`${day}T${time}`);

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

async function freshStore(options: { now?: Date; tasks?: Task[]; settings?: Record<string, string> } = {}) {
  vi.setSystemTime(options.now ?? at(DAY_1, "10:00:00"));
  vi.resetModules();
  const { taskRepo } = await import("../../repositories/taskRepo");
  const { rewardRepo } = await import("../../repositories/rewardRepo");
  const { settingsRepo } = await import("../../repositories/settingsRepo");
  const { shopRepo } = await import("../../repositories/shopRepo");
  const { notifier } = await import("../../platform/notifier");
  const { useAppStore } = await import("../useAppStore");
  vi.mocked(taskRepo.listInRange).mockResolvedValue(options.tasks ?? []);
  vi.mocked(taskRepo.flagOverdue).mockResolvedValue(undefined);
  vi.mocked(rewardRepo.totals).mockResolvedValue({ xp: 0, coins: 0 });
  vi.mocked(rewardRepo.activeDaysSinceLastReset).mockResolvedValue([]);
  vi.mocked(rewardRepo.lastCompletionAt).mockResolvedValue(null);
  vi.mocked(shopRepo.listItems).mockResolvedValue([]);
  vi.mocked(shopRepo.listOwned).mockResolvedValue([]);
  const settings = options.settings ?? {};
  vi.mocked(settingsRepo.get).mockImplementation(async (key) => settings[key] ?? null);
  vi.mocked(settingsRepo.set).mockResolvedValue(undefined);
  vi.mocked(notifier.notify).mockResolvedValue(true);
  return { taskRepo, rewardRepo, settingsRepo, notifier, useAppStore };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Only the clock is faked: promises and the test runner itself must keep working normally.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("refreshDay", () => {
  it("does nothing while it is still the same day", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    vi.setSystemTime(at(DAY_1, "23:59:00"));
    await useAppStore.getState().refreshDay();
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1); // only startup's load
    expect(useAppStore.getState().today).toBe(DAY_1);
  });

  it("moves to the new day: reloads, sweeps the task that just became overdue, reloads progress", async () => {
    const { taskRepo, rewardRepo, useAppStore } = await freshStore({ tasks: [task(1, DAY_1, DAY_1)] });
    await useAppStore.getState().startup();
    expect(taskRepo.flagOverdue).not.toHaveBeenCalled(); // not overdue on its own last day

    vi.setSystemTime(at(DAY_2, "00:05:00"));
    vi.mocked(taskRepo.listInRange).mockClear();
    vi.mocked(rewardRepo.totals).mockClear();
    await useAppStore.getState().refreshDay();

    expect(useAppStore.getState().today).toBe(DAY_2);
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1);
    expect(taskRepo.flagOverdue).toHaveBeenCalledWith([1], DAY_2);
    expect(useAppStore.getState().tasks[0].overdueFlagged).toBe(true);
    expect(rewardRepo.totals).toHaveBeenCalled();
    // the order: reload tasks (which sets today), then the sweep, then progress
    const order = (fn: unknown) => (vi.mocked(fn as () => void).mock.invocationCallOrder[0]);
    expect(order(taskRepo.listInRange)).toBeLessThan(order(taskRepo.flagOverdue));
    expect(order(taskRepo.flagOverdue)).toBeLessThan(vi.mocked(rewardRepo.totals).mock.invocationCallOrder[0]);
  });

  it("runs once when the interval and a focus event ask at the same moment", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    vi.setSystemTime(at(DAY_2, "00:00:30"));
    vi.mocked(taskRepo.listInRange).mockClear();
    const first = useAppStore.getState().refreshDay();
    const second = useAppStore.getState().refreshDay();
    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1);
  });

  it("can run again for the next day after finishing", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    vi.setSystemTime(at(DAY_2, "08:00:00"));
    await useAppStore.getState().refreshDay();
    vi.setSystemTime(at("2026-11-16", "08:00:00"));
    vi.mocked(taskRepo.listInRange).mockClear();
    await useAppStore.getState().refreshDay();
    expect(useAppStore.getState().today).toBe("2026-11-16");
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1);
  });

  it("waits for the first load instead of running in the middle of it", async () => {
    // The clock is already on the next day when the first refresh is requested, before any startup ran.
    const { taskRepo, useAppStore } = await freshStore();
    vi.setSystemTime(at(DAY_2, "09:00:00"));
    await useAppStore.getState().refreshDay();
    expect(useAppStore.getState().today).toBe(DAY_2);
    expect(taskRepo.listInRange).toHaveBeenCalledTimes(1); // startup's own load already reached the new day
  });

  it("also follows a clock that moved backwards", async () => {
    const { useAppStore } = await freshStore({ now: at(DAY_2, "10:00:00") });
    await useAppStore.getState().startup();
    vi.setSystemTime(at(DAY_1, "10:00:00"));
    await useAppStore.getState().refreshDay();
    expect(useAppStore.getState().today).toBe(DAY_1);
  });

  it("tries again at the next check after a failed reload", async () => {
    const { taskRepo, useAppStore } = await freshStore();
    await useAppStore.getState().startup();
    vi.setSystemTime(at(DAY_2, "08:00:00"));
    vi.mocked(taskRepo.listInRange).mockRejectedValueOnce("db locked");
    await useAppStore.getState().refreshDay();
    expect(useAppStore.getState().today).toBe(DAY_1); // loadTasks failed, so the day did not move
    expect(useAppStore.getState().error).toBe("db locked");
    await useAppStore.getState().refreshDay();
    expect(useAppStore.getState().today).toBe(DAY_2);
  });

  it("sends the reminder for the new day, after the sweep", async () => {
    const { taskRepo, notifier, settingsRepo, useAppStore } = await freshStore({
      tasks: [task(1, DAY_2, DAY_2)],
      settings: { lastReminderDay: DAY_1 },
    });
    await useAppStore.getState().startup(); // DAY_1: nothing due that day, so no reminder yet
    expect(notifier.notify).not.toHaveBeenCalled();
    vi.setSystemTime(at(DAY_2, "07:30:00"));
    await useAppStore.getState().refreshDay();
    expect(notifier.notify).toHaveBeenCalledWith("Tasks Organizer", "1 task due today.");
    expect(settingsRepo.set).toHaveBeenCalledWith("lastReminderDay", DAY_2);
    // the reminder comes after the last reload of the tasks (the refresh's own)
    const loads = vi.mocked(taskRepo.listInRange).mock.invocationCallOrder;
    expect(vi.mocked(notifier.notify).mock.invocationCallOrder[0]).toBeGreaterThan(loads[loads.length - 1]);
  });
});

describe("remindIfDue", () => {
  it("counts a task that ended yesterday as overdue, not as due today", async () => {
    const { notifier, useAppStore } = await freshStore({
      now: at(DAY_2, "09:00:00"),
      tasks: [task(1, DAY_1, DAY_1)],
    });
    await useAppStore.getState().startup();
    expect(notifier.notify).toHaveBeenCalledWith("Tasks Organizer", "1 task is overdue.");
  });

  it("joins due and overdue in one message", async () => {
    const { notifier, useAppStore } = await freshStore({
      now: at(DAY_2, "09:00:00"),
      tasks: [task(1, DAY_1, DAY_1), task(2, DAY_2, DAY_2), task(3, DAY_2, "2026-11-17")],
    });
    await useAppStore.getState().startup();
    expect(notifier.notify).toHaveBeenCalledWith("Tasks Organizer", "2 tasks due today and 1 overdue.");
  });

  it("does not count done tasks", async () => {
    const { notifier, useAppStore } = await freshStore({
      tasks: [task(1, DAY_1, DAY_1, { status: "done", completedOn: DAY_1 })],
    });
    await useAppStore.getState().startup();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("sends nothing when reminders are off", async () => {
    const { notifier, useAppStore } = await freshStore({ tasks: [task(1, DAY_1, DAY_1)], settings: { reminders: "0" } });
    await useAppStore.getState().startup();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("sends nothing when one was already sent today (a restart on the same day)", async () => {
    const { notifier, useAppStore } = await freshStore({
      tasks: [task(1, DAY_1, DAY_1)],
      settings: { lastReminderDay: DAY_1 },
    });
    await useAppStore.getState().startup();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("sends only one a day however often it is called", async () => {
    const { notifier, useAppStore } = await freshStore({ tasks: [task(1, DAY_1, DAY_1)] });
    await useAppStore.getState().startup();
    await useAppStore.getState().remindIfDue();
    await useAppStore.getState().remindIfDue();
    expect(notifier.notify).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().lastReminderDay).toBe(DAY_1);
  });

  it("does not mark the day when the notification could not be shown, so it tries again", async () => {
    const { notifier, settingsRepo, useAppStore } = await freshStore({ tasks: [task(1, DAY_1, DAY_1)] });
    vi.mocked(notifier.notify).mockResolvedValueOnce(false);
    await useAppStore.getState().startup();
    expect(settingsRepo.set).not.toHaveBeenCalledWith("lastReminderDay", expect.anything());
    expect(useAppStore.getState().lastReminderDay).toBeNull();
    await useAppStore.getState().remindIfDue();
    expect(notifier.notify).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().lastReminderDay).toBe(DAY_1);
  });

  it("records an error but does not crash when saving the day fails", async () => {
    const { settingsRepo, useAppStore } = await freshStore({ tasks: [task(1, DAY_1, DAY_1)] });
    vi.mocked(settingsRepo.set).mockRejectedValue("disk full");
    await useAppStore.getState().startup();
    expect(useAppStore.getState().error).toBe("disk full");
  });
});

describe("setRemindersEnabled", () => {
  it("saves 0 and updates the state", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().setRemindersEnabled(false);
    expect(settingsRepo.set).toHaveBeenCalledWith("reminders", "0");
    expect(useAppStore.getState().remindersEnabled).toBe(false);
  });

  it("saves 1 when turned back on", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().setRemindersEnabled(false);
    await useAppStore.getState().setRemindersEnabled(true);
    expect(settingsRepo.set).toHaveBeenLastCalledWith("reminders", "1");
    expect(useAppStore.getState().remindersEnabled).toBe(true);
  });

  it("does not write when the value is unchanged", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().setRemindersEnabled(true);
    expect(settingsRepo.set).not.toHaveBeenCalled();
  });

  it("keeps the old value and records an error when saving fails", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    vi.mocked(settingsRepo.set).mockRejectedValue("disk full");
    await useAppStore.getState().setRemindersEnabled(false);
    expect(useAppStore.getState().remindersEnabled).toBe(true);
    expect(useAppStore.getState().error).toBe("disk full");
  });
});

describe("sendTestReminder", () => {
  it("shows a notification and reports whether it was shown", async () => {
    const { notifier, useAppStore } = await freshStore();
    expect(await useAppStore.getState().sendTestReminder()).toBe(true);
    expect(notifier.notify).toHaveBeenCalledWith("Tasks Organizer", expect.stringContaining("test reminder"));
    vi.mocked(notifier.notify).mockResolvedValueOnce(false);
    expect(await useAppStore.getState().sendTestReminder()).toBe(false);
  });

  it("ignores the daily limit and the setting, and saves nothing", async () => {
    const { notifier, settingsRepo, useAppStore } = await freshStore({
      settings: { reminders: "0", lastReminderDay: DAY_1 },
    });
    await useAppStore.getState().startup();
    await useAppStore.getState().sendTestReminder();
    expect(notifier.notify).toHaveBeenCalledTimes(1);
    expect(settingsRepo.set).not.toHaveBeenCalled();
  });
});
