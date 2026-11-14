import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, parseBackup, type BackupData } from "../../domain/backup";
import type { Item, Task } from "../../domain/types";
import { files } from "../../platform/files";
import { backupRepo } from "../../repositories/backupRepo";
import { rewardRepo } from "../../repositories/rewardRepo";
import { settingsRepo } from "../../repositories/settingsRepo";
import { shopRepo } from "../../repositories/shopRepo";
import { taskRepo } from "../../repositories/taskRepo";
import { useAppStore } from "../useAppStore";

vi.mock("../../repositories/backupRepo", () => ({ backupRepo: { readAll: vi.fn(), replaceAll: vi.fn() } }));
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: { listInRange: vi.fn(), create: vi.fn(), complete: vi.fn(), flagOverdue: vi.fn(), archive: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: { totals: vi.fn(), activeDaysSinceLastReset: vi.fn(), completedCount: vi.fn(), lastCompletionAt: vi.fn() },
}));
vi.mock("../../repositories/settingsRepo", () => ({ settingsRepo: { get: vi.fn(), set: vi.fn() } }));
vi.mock("../../repositories/shopRepo", () => ({
  shopRepo: { listItems: vi.fn(), listOwned: vi.fn(), purchase: vi.fn(), setEquipped: vi.fn() },
}));
vi.mock("../../platform/files", () => ({
  files: { saveBackupFile: vi.fn(), pickBackupFile: vi.fn(), writeSafetyCopy: vi.fn() },
}));
vi.mock("../../platform/notifier", () => ({ notifier: { notify: vi.fn() } }));

const TODAY = "2026-11-15";
const ITEMS: Item[] = [
  { id: 1, slot: "glasses", name: "Round Glasses", price: 10, minLevel: 1, assetKey: "glasses_round" },
  { id: 2, slot: "held", name: "Laptop", price: 20, minLevel: 1, assetKey: "laptop" },
];

const currentData: BackupData = {
  tasks: [
    {
      id: 1, title: "Now", notes: null, startDate: TODAY, endDate: TODAY, difficulty: 1, status: "active",
      overdueFlagged: false, completedOn: null, createdAt: "2026-11-14T08:00:00.000Z",
    },
  ],
  rewardEvents: [],
  inventory: [],
  settings: [{ key: "species", value: "monkey" }],
};

const restoredData: BackupData = {
  tasks: [
    {
      id: 7, title: "Old task", notes: "n", startDate: "2026-11-08", endDate: "2026-11-10", difficulty: 2,
      status: "active", overdueFlagged: false, completedOn: null, createdAt: "2026-11-07T08:00:00.000Z",
    },
    {
      id: 8, title: "Done task", notes: null, startDate: "2026-11-09", endDate: "2026-11-09", difficulty: 1,
      status: "done", overdueFlagged: false, completedOn: "2026-11-09", createdAt: "2026-11-08T08:00:00.000Z",
    },
  ],
  rewardEvents: [
    { id: 1, taskId: 8, xp: 10, coins: 5, reason: "task_done", day: "2026-11-09", createdAt: "x", itemId: null },
  ],
  inventory: [],
  settings: [{ key: "species", value: "cat" }],
};

const fileText = (data: BackupData) => JSON.stringify(buildBackup(data, "2026-11-14T12:00:00.000Z"));

const readAll = vi.mocked(backupRepo.readAll);
const replaceAll = vi.mocked(backupRepo.replaceAll);
const saveBackupFile = vi.mocked(files.saveBackupFile);
const pickBackupFile = vi.mocked(files.pickBackupFile);
const writeSafetyCopy = vi.mocked(files.writeSafetyCopy);
const listInRange = vi.mocked(taskRepo.listInRange);
const flagOverdue = vi.mocked(taskRepo.flagOverdue);
const listItems = vi.mocked(shopRepo.listItems);

const order = (fn: unknown) => vi.mocked(fn as () => void).mock.invocationCallOrder[0];

beforeEach(() => {
  vi.resetAllMocks();
  readAll.mockResolvedValue(currentData);
  replaceAll.mockResolvedValue(undefined);
  saveBackupFile.mockResolvedValue("C:\\Backups\\backup.json");
  writeSafetyCopy.mockImplementation(async (name) => `C:\\AppData\\backups\\${name}`);
  listItems.mockResolvedValue(ITEMS);
  vi.mocked(shopRepo.listOwned).mockResolvedValue([]);
  listInRange.mockResolvedValue([]);
  flagOverdue.mockResolvedValue(undefined);
  vi.mocked(settingsRepo.get).mockResolvedValue(null);
  vi.mocked(rewardRepo.totals).mockResolvedValue({ xp: 0, coins: 0 });
  vi.mocked(rewardRepo.activeDaysSinceLastReset).mockResolvedValue([]);
  vi.mocked(rewardRepo.lastCompletionAt).mockResolvedValue(null);
  useAppStore.setState({
    today: TODAY, tasks: [], selection: { from: TODAY, to: TODAY }, oneShots: [{ id: 1, kind: "celebrate" }],
    pendingImport: null, error: null, species: "monkey",
  });
});

describe("exportBackup", () => {
  it("writes a valid backup of everything to the file the player picked", async () => {
    const result = await useAppStore.getState().exportBackup();
    expect(result).toEqual({ kind: "done", message: "Backup saved to C:\\Backups\\backup.json" });
    const [name, text] = saveBackupFile.mock.calls[0];
    expect(name).toBe("tasks-organizer-backup-2026-11-15.json");
    expect(parseBackup(text, [1, 2])).toMatchObject({ ok: true });
  });

  it("is a cancel, not an error, when the dialog is cancelled", async () => {
    saveBackupFile.mockResolvedValue(null);
    expect(await useAppStore.getState().exportBackup()).toEqual({ kind: "cancelled" });
  });

  it("reports a save failure with its message", async () => {
    saveBackupFile.mockRejectedValue(new Error("Could not save the backup: disk full"));
    expect(await useAppStore.getState().exportBackup()).toEqual({
      kind: "error",
      message: "Could not save the backup: disk full",
    });
  });

  it("reports a read failure", async () => {
    readAll.mockRejectedValue("db locked");
    expect(await useAppStore.getState().exportBackup()).toEqual({ kind: "error", message: "db locked" });
    expect(saveBackupFile).not.toHaveBeenCalled();
  });

  it("does not use the global error banner, which belongs to the task panel", async () => {
    saveBackupFile.mockRejectedValue(new Error("nope"));
    await useAppStore.getState().exportBackup();
    expect(useAppStore.getState().error).toBeNull();
  });

  it("ignores a second click while the first export runs", async () => {
    const first = useAppStore.getState().exportBackup();
    const second = await useAppStore.getState().exportBackup();
    expect(second).toEqual({ kind: "cancelled" });
    await first;
    expect(saveBackupFile).toHaveBeenCalledTimes(1);
  });

  it("can export again after finishing", async () => {
    await useAppStore.getState().exportBackup();
    await useAppStore.getState().exportBackup();
    expect(saveBackupFile).toHaveBeenCalledTimes(2);
  });
});

describe("prepareImport", () => {
  it("keeps a valid file as the pending import, with its counts, and changes no data", async () => {
    pickBackupFile.mockResolvedValue({ name: "mine.json", text: fileText(restoredData) });
    const result = await useAppStore.getState().prepareImport();
    expect(result.kind).toBe("done");
    const pending = useAppStore.getState().pendingImport;
    expect(pending?.fileName).toBe("mine.json");
    expect(pending?.summary).toMatchObject({ tasks: 2, events: 1, items: 0 });
    expect(replaceAll).not.toHaveBeenCalled();
    expect(writeSafetyCopy).not.toHaveBeenCalled();
  });

  it("is a cancel when the dialog is cancelled", async () => {
    pickBackupFile.mockResolvedValue(null);
    expect(await useAppStore.getState().prepareImport()).toEqual({ kind: "cancelled" });
    expect(useAppStore.getState().pendingImport).toBeNull();
  });

  it("refuses a file that is not a backup, names the file, and touches nothing", async () => {
    pickBackupFile.mockResolvedValue({ name: "notes.json", text: "hello" });
    const result = await useAppStore.getState().prepareImport();
    expect(result).toEqual({ kind: "error", message: "notes.json: This file is not a valid backup (it is not JSON)." });
    expect(useAppStore.getState().pendingImport).toBeNull();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("checks the file against the shop items this version has", async () => {
    const withItem: BackupData = {
      ...restoredData,
      rewardEvents: [
        ...restoredData.rewardEvents,
        { id: 2, taskId: null, xp: 0, coins: -5, reason: "purchase", day: "2026-11-09", createdAt: "x", itemId: 99 },
      ],
    };
    pickBackupFile.mockResolvedValue({ name: "new.json", text: fileText(withItem) });
    const result = await useAppStore.getState().prepareImport();
    expect(result.kind).toBe("error");
    expect(listItems).toHaveBeenCalled();
  });

  it("drops an earlier pending import when the next file is bad", async () => {
    pickBackupFile.mockResolvedValueOnce({ name: "good.json", text: fileText(restoredData) });
    await useAppStore.getState().prepareImport();
    expect(useAppStore.getState().pendingImport).not.toBeNull();
    pickBackupFile.mockResolvedValueOnce({ name: "bad.json", text: "{" });
    await useAppStore.getState().prepareImport();
    expect(useAppStore.getState().pendingImport).toBeNull();
  });

  it("reports a failure to open the file", async () => {
    pickBackupFile.mockRejectedValue(new Error("Could not open the file: locked"));
    expect(await useAppStore.getState().prepareImport()).toEqual({
      kind: "error",
      message: "Could not open the file: locked",
    });
  });
});

describe("cancelImport", () => {
  it("forgets the pending import", async () => {
    pickBackupFile.mockResolvedValue({ name: "mine.json", text: fileText(restoredData) });
    await useAppStore.getState().prepareImport();
    useAppStore.getState().cancelImport();
    expect(useAppStore.getState().pendingImport).toBeNull();
  });
});

async function withPending() {
  pickBackupFile.mockResolvedValue({ name: "mine.json", text: fileText(restoredData) });
  await useAppStore.getState().prepareImport();
}

describe("confirmImport", () => {
  it("does nothing without a pending import", async () => {
    expect(await useAppStore.getState().confirmImport()).toEqual({ kind: "cancelled" });
    expect(writeSafetyCopy).not.toHaveBeenCalled();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("saves a safety copy of the current data before replacing anything", async () => {
    await withPending();
    await useAppStore.getState().confirmImport();
    expect(order(readAll)).toBeLessThan(order(writeSafetyCopy));
    expect(order(writeSafetyCopy)).toBeLessThan(order(replaceAll));
    const [name, text] = writeSafetyCopy.mock.calls[0];
    expect(name).toMatch(/^before-import-.*\.json$/);
    expect(name).not.toContain(":");
    expect(parseBackup(text, [1, 2])).toMatchObject({ ok: true }); // the safety copy is itself a valid backup
    expect(replaceAll).toHaveBeenCalledWith(useAppStore.getState().pendingImport?.backup ?? expect.anything());
  });

  it("replaces with exactly the file that was validated", async () => {
    await withPending();
    const pending = useAppStore.getState().pendingImport;
    await useAppStore.getState().confirmImport();
    expect(replaceAll).toHaveBeenCalledTimes(1);
    expect(replaceAll.mock.calls[0][0]).toBe(pending?.backup);
  });

  it("reports success with the safety copy path, and clears the pending import", async () => {
    await withPending();
    const result = await useAppStore.getState().confirmImport();
    expect(result.kind).toBe("done");
    expect(result.kind === "done" && result.message).toContain("C:\\AppData\\backups\\before-import-");
    expect(useAppStore.getState().pendingImport).toBeNull();
  });

  it("reloads everything from the database afterwards, in the startup order, and clears old UI state", async () => {
    await withPending();
    listInRange.mockResolvedValue([
      { id: 8, title: "Done task", notes: null, startDate: "2026-11-09", endDate: "2026-11-09", difficulty: 1, status: "done", overdueFlagged: false, completedOn: "2026-11-09" },
    ] satisfies Task[]);
    vi.mocked(settingsRepo.get).mockImplementation(async (key) => (key === "species" ? "cat" : null));
    vi.mocked(rewardRepo.totals).mockResolvedValue({ xp: 10, coins: 5 });
    await useAppStore.getState().confirmImport();
    const s = useAppStore.getState();
    expect(s.tasks.map((t) => t.id)).toEqual([8]);
    expect(s.species).toBe("cat");
    expect(s.totals).toEqual({ xp: 10, coins: 5 });
    expect(s.selection).toBeNull();
    expect(s.oneShots).toEqual([]);
    expect(order(replaceAll)).toBeLessThan(order(listInRange));
    expect(order(listInRange)).toBeLessThan(vi.mocked(rewardRepo.totals).mock.invocationCallOrder[0]);
  });

  it("sweeps restored tasks that are overdue, once, like at startup", async () => {
    await withPending();
    listInRange.mockResolvedValue([
      { id: 7, title: "Old task", notes: null, startDate: "2026-11-08", endDate: "2026-11-10", difficulty: 2, status: "active", overdueFlagged: false, completedOn: null },
    ] satisfies Task[]);
    await useAppStore.getState().confirmImport();
    expect(flagOverdue).toHaveBeenCalledWith([7], TODAY);
  });

  it("does not start when the safety copy cannot be written, and changes nothing", async () => {
    await withPending();
    writeSafetyCopy.mockRejectedValue(new Error("Could not save a safety copy of your current data: disk full"));
    const result = await useAppStore.getState().confirmImport();
    expect(result).toEqual({
      kind: "error",
      message: "Could not save a safety copy of your current data: disk full",
    });
    expect(replaceAll).not.toHaveBeenCalled();
    expect(listInRange).not.toHaveBeenCalled(); // no reload either: nothing could have changed
    expect(useAppStore.getState().pendingImport).not.toBeNull(); // the player can try again
  });

  it("does not start when the current data cannot be read", async () => {
    await withPending();
    readAll.mockRejectedValue("db locked");
    expect((await useAppStore.getState().confirmImport()).kind).toBe("error");
    expect(writeSafetyCopy).not.toHaveBeenCalled();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("after a failure halfway, names the safety copy, says retrying is safe, still reloads, and keeps the import pending", async () => {
    await withPending();
    replaceAll.mockRejectedValue("disk full");
    const result = await useAppStore.getState().confirmImport();
    expect(result.kind).toBe("error");
    const message = result.kind === "error" ? result.message : "";
    expect(message).toContain("disk full");
    expect(message).toContain("C:\\AppData\\backups\\before-import-");
    expect(message).toContain("Importing the same file again is safe");
    expect(listInRange).toHaveBeenCalled(); // the screen shows what is really in the database
    expect(useAppStore.getState().pendingImport).not.toBeNull();
  });

  it("lets the player retry after a failure and succeed", async () => {
    await withPending();
    replaceAll.mockRejectedValueOnce("disk full");
    await useAppStore.getState().confirmImport();
    const second = await useAppStore.getState().confirmImport();
    expect(second.kind).toBe("done");
    expect(useAppStore.getState().pendingImport).toBeNull();
  });

  it("ignores a second click while the first import runs", async () => {
    await withPending();
    const first = useAppStore.getState().confirmImport();
    const second = await useAppStore.getState().confirmImport();
    expect(second).toEqual({ kind: "cancelled" });
    await first;
    expect(replaceAll).toHaveBeenCalledTimes(1);
  });
});
