import { describe, expect, it } from "vitest";
import {
  backupDateLabel,
  backupFileName,
  buildBackup,
  describeBackup,
  isISODate,
  parseBackup,
  safetyCopyFileName,
  type BackupData,
  type BackupEvent,
  type BackupTask,
} from "../backup";

const ITEMS = [1, 2];
const NOW = "2026-11-15T10:30:00.123Z";

const task = (id: number, extra: Partial<BackupTask> = {}): BackupTask => ({
  id,
  title: `Task ${id}`,
  notes: null,
  startDate: "2026-11-14",
  endDate: "2026-11-15",
  difficulty: 2,
  status: "active",
  overdueFlagged: false,
  completedOn: null,
  createdAt: "2026-11-13T08:00:00.000Z",
  ...extra,
});

const event = (id: number, extra: Partial<BackupEvent> = {}): BackupEvent => ({
  id,
  taskId: null,
  xp: 0,
  coins: 0,
  reason: "streak_reset",
  day: "2026-11-14",
  createdAt: "2026-11-14T09:00:00.000Z",
  itemId: null,
  ...extra,
});

function fullData(): BackupData {
  return {
    tasks: [
      task(1, { status: "done", completedOn: "2026-11-14" }),
      task(2),
      task(3, { status: "archived", overdueFlagged: true }),
    ],
    rewardEvents: [
      event(1, { taskId: 1, xp: 25, coins: 10, reason: "task_done" }),
      event(2, { reason: "streak_reset" }),
      event(3, { coins: -10, reason: "purchase", itemId: 1 }),
    ],
    inventory: [{ itemId: 1, purchasedOn: "2026-11-14", equipped: true }],
    settings: [
      { key: "species", value: "cat" },
      { key: "reminders", value: "0" },
      { key: "lastReminderDay", value: "2026-11-14" },
    ],
  };
}

const emptyData: BackupData = { tasks: [], rewardEvents: [], inventory: [], settings: [] };

// Builds a file, lets the test damage it, and parses the result.
function parseWith(mutate: (file: Record<string, unknown>) => void, data: BackupData = fullData()) {
  const file = JSON.parse(JSON.stringify(buildBackup(data, NOW))) as Record<string, unknown>;
  mutate(file);
  return parseBackup(JSON.stringify(file), ITEMS);
}

function reasonOf(result: ReturnType<typeof parseBackup>): string {
  if (result.ok) throw new Error("expected the backup to be rejected");
  return result.reason;
}

describe("buildBackup", () => {
  it("labels the file and keeps the export time it was given", () => {
    const file = buildBackup(emptyData, NOW);
    expect(file).toMatchObject({ app: "tasks-organizer", formatVersion: 1, exportedAt: NOW });
  });

  it("sorts everything by id, so the ledger order (which the streak depends on) is explicit", () => {
    const data = fullData();
    const shuffled: BackupData = { ...data, tasks: [...data.tasks].reverse(), rewardEvents: [...data.rewardEvents].reverse() };
    const file = buildBackup(shuffled, NOW);
    expect(file.tasks.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(file.rewardEvents.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("does not change the data it was given", () => {
    const data = fullData();
    const reversed = [...data.rewardEvents].reverse();
    buildBackup({ ...data, rewardEvents: reversed }, NOW);
    expect(reversed.map((e) => e.id)).toEqual([3, 2, 1]);
  });
});

describe("parseBackup, accepting", () => {
  it("accepts an empty but valid backup", () => {
    const result = parseBackup(JSON.stringify(buildBackup(emptyData, NOW)), ITEMS);
    expect(result.ok).toBe(true);
  });

  it("accepts a full backup and gives back exactly what was saved (round trip)", () => {
    const original = buildBackup(fullData(), NOW);
    const result = parseBackup(JSON.stringify(original), ITEMS);
    expect(result).toEqual({ ok: true, backup: original });
  });

  it("keeps the ledger order and ids", () => {
    const result = parseWith(() => undefined);
    if (!result.ok) throw new Error(result.reason);
    expect(result.backup.rewardEvents.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("keeps archived tasks, because the ledger points at them", () => {
    const result = parseWith(() => undefined);
    if (!result.ok) throw new Error(result.reason);
    expect(result.backup.tasks.map((t) => t.status)).toEqual(["done", "active", "archived"]);
  });

  it("ignores a setting this version does not know, and imports the rest", () => {
    const result = parseWith((file) => {
      (file.settings as unknown[]).push({ key: "theme", value: "pink" });
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.backup.settings.map((s) => s.key).sort()).toEqual(["lastReminderDay", "reminders", "species"]);
  });

  it("allows a coin balance of exactly zero", () => {
    const data = fullData();
    data.rewardEvents[0] = event(1, { taskId: 1, xp: 25, coins: 10, reason: "task_done" });
    expect(parseWith(() => undefined, data).ok).toBe(true); // earns 10, spends 10
  });
});

describe("parseBackup, rejecting a file that is not a backup", () => {
  it("rejects text that is not JSON", () => {
    expect(reasonOf(parseBackup("hello", ITEMS))).toContain("not JSON");
  });

  it("rejects an empty file", () => {
    expect(reasonOf(parseBackup("", ITEMS))).toContain("not JSON");
  });

  it("rejects JSON that is not an object, or from another app", () => {
    expect(reasonOf(parseBackup("[1,2]", ITEMS))).toContain("not a Tasks Organizer backup");
    expect(reasonOf(parseBackup("null", ITEMS))).toContain("not a Tasks Organizer backup");
    expect(reasonOf(parseWith((file) => (file.app = "other-app")))).toContain("not a Tasks Organizer backup");
  });

  it("explains that a backup from a newer version needs an update", () => {
    expect(reasonOf(parseWith((file) => (file.formatVersion = 2)))).toContain("newer version");
  });

  it("rejects an unknown format version", () => {
    expect(reasonOf(parseWith((file) => (file.formatVersion = 0)))).toContain("unknown format");
    expect(reasonOf(parseWith((file) => delete file.formatVersion))).toContain("unknown format");
  });

  it("rejects a file with a missing or non-list section", () => {
    for (const name of ["tasks", "rewardEvents", "inventory", "settings"]) {
      expect(reasonOf(parseWith((file) => delete file[name]))).toContain(`"${name}"`);
      expect(reasonOf(parseWith((file) => (file[name] = {})))).toContain(`"${name}"`);
    }
  });

  it("rejects a file with no export time", () => {
    expect(reasonOf(parseWith((file) => delete file.exportedAt))).toContain("export time");
  });
});

describe("parseBackup, rejecting bad tasks", () => {
  const damageFirstTask = (change: Record<string, unknown>) =>
    parseWith((file) => {
      Object.assign((file.tasks as Record<string, unknown>[])[0], change);
    });

  it("rejects a bad or missing id", () => {
    expect(reasonOf(damageFirstTask({ id: 0 }))).toContain("invalid id");
    expect(reasonOf(damageFirstTask({ id: 1.5 }))).toContain("invalid id");
    expect(reasonOf(damageFirstTask({ id: "1" }))).toContain("invalid id");
  });

  it("rejects an empty title", () => {
    expect(reasonOf(damageFirstTask({ title: "   " }))).toContain("no title");
    expect(reasonOf(damageFirstTask({ title: 5 }))).toContain("no title");
  });

  it("rejects invalid notes", () => {
    expect(reasonOf(damageFirstTask({ notes: 5 }))).toContain("notes");
  });

  it("rejects a date that is not a real day", () => {
    expect(reasonOf(damageFirstTask({ startDate: "2026-02-30" }))).toContain("invalid date");
    expect(reasonOf(damageFirstTask({ endDate: "2026-2-3" }))).toContain("invalid date");
    expect(reasonOf(damageFirstTask({ startDate: 20261114 }))).toContain("invalid date");
  });

  it("rejects a task that ends before it starts", () => {
    expect(reasonOf(damageFirstTask({ startDate: "2026-11-16", endDate: "2026-11-15" }))).toContain("ends before");
  });

  it("rejects a difficulty outside 1 to 3", () => {
    expect(reasonOf(damageFirstTask({ difficulty: 0 }))).toContain("difficulty");
    expect(reasonOf(damageFirstTask({ difficulty: 4 }))).toContain("difficulty");
    expect(reasonOf(damageFirstTask({ difficulty: "2" }))).toContain("difficulty");
  });

  it("rejects an unknown status", () => {
    expect(reasonOf(damageFirstTask({ status: "paused" }))).toContain("status");
  });

  it("rejects a non-boolean overdue flag", () => {
    expect(reasonOf(damageFirstTask({ overdueFlagged: 1 }))).toContain("overdue flag");
  });

  it("rejects a done task without a completion date, and a completion date on a task that is not done", () => {
    expect(reasonOf(damageFirstTask({ completedOn: null }))).toContain("inconsistent");
    expect(reasonOf(parseWith((file) => Object.assign((file.tasks as Record<string, unknown>[])[1], { completedOn: "2026-11-14" })))).toContain("inconsistent");
  });

  it("rejects a task with no creation time", () => {
    expect(reasonOf(damageFirstTask({ createdAt: "" }))).toContain("creation time");
  });

  it("rejects a task that is not an object", () => {
    expect(reasonOf(parseWith((file) => ((file.tasks as unknown[])[0] = 7)))).toContain("not an object");
  });

  it("rejects two tasks with the same id", () => {
    expect(reasonOf(parseWith((file) => ((file.tasks as Record<string, unknown>[])[1].id = 1)))).toContain("tasks share the same id");
  });
});

describe("parseBackup, rejecting a bad ledger", () => {
  const damageEvent = (index: number, change: Record<string, unknown>) =>
    parseWith((file) => {
      Object.assign((file.rewardEvents as Record<string, unknown>[])[index], change);
    });

  it("rejects an invalid reason", () => {
    expect(reasonOf(damageEvent(0, { reason: "gift" }))).toContain("reason");
  });

  it("rejects non-integer or negative XP and non-integer coins", () => {
    expect(reasonOf(damageEvent(0, { xp: 1.5 }))).toContain("XP");
    expect(reasonOf(damageEvent(0, { xp: -1 }))).toContain("XP");
    expect(reasonOf(damageEvent(0, { coins: "5" }))).toContain("coins");
    expect(reasonOf(damageEvent(0, { coins: 0.5 }))).toContain("coins");
  });

  it("rejects an invalid day", () => {
    expect(reasonOf(damageEvent(0, { day: "yesterday" }))).toContain("day");
  });

  it("rejects a task_done without a task, or for a task that is not in the file", () => {
    expect(reasonOf(damageEvent(0, { taskId: null }))).toContain("completes a task");
    expect(reasonOf(damageEvent(0, { taskId: 99 }))).toContain("completes a task");
  });

  it("rejects a purchase without an item, or of an item this version does not know", () => {
    expect(reasonOf(damageEvent(2, { itemId: null }))).toContain("does not know");
    expect(reasonOf(damageEvent(2, { itemId: 99 }))).toContain("does not know");
  });

  it("rejects an entry that refers to a task that is not in the file", () => {
    expect(reasonOf(damageEvent(1, { taskId: 99 }))).toContain("not in the file");
  });

  it("rejects two reward entries with the same id", () => {
    expect(reasonOf(damageEvent(1, { id: 1 }))).toContain("reward entries share the same id");
  });

  it("rejects the same task being completed twice", () => {
    const result = parseWith((file) => {
      (file.rewardEvents as unknown[]).push({
        id: 4, taskId: 1, xp: 25, coins: 10, reason: "task_done", day: "2026-11-14", createdAt: "x", itemId: null,
      });
    });
    expect(reasonOf(result)).toContain("completed twice");
  });

  it("rejects a coin balance below zero", () => {
    expect(reasonOf(damageEvent(2, { coins: -11 }))).toContain("more coins than they earn");
  });
});

describe("parseBackup, rejecting a bad inventory or settings", () => {
  it("rejects an inventory entry for an unknown item", () => {
    const result = parseWith((file) => ((file.inventory as Record<string, unknown>[])[0].itemId = 99));
    expect(reasonOf(result)).toContain("does not know");
  });

  it("rejects a duplicate inventory entry", () => {
    const result = parseWith((file) => {
      (file.inventory as unknown[]).push({ itemId: 1, purchasedOn: "2026-11-14", equipped: false });
    });
    expect(reasonOf(result)).toContain("inventory entries share the same id");
  });

  it("rejects a bad purchase date or equipped flag", () => {
    expect(reasonOf(parseWith((file) => ((file.inventory as Record<string, unknown>[])[0].purchasedOn = "x")))).toContain("purchase date");
    expect(reasonOf(parseWith((file) => ((file.inventory as Record<string, unknown>[])[0].equipped = 1)))).toContain("equipped flag");
  });

  it("rejects a known setting with an invalid value", () => {
    const setValue = (key: string, value: string) =>
      parseWith((file) => {
        const entry = (file.settings as Record<string, unknown>[]).find((s) => s.key === key);
        if (entry) entry.value = value;
      });
    expect(reasonOf(setValue("species", "dog"))).toContain('"species"');
    expect(reasonOf(setValue("reminders", "yes"))).toContain('"reminders"');
    expect(reasonOf(setValue("lastReminderDay", "2026-13-01"))).toContain('"lastReminderDay"');
  });

  it("rejects a repeated known setting and a malformed setting", () => {
    expect(
      reasonOf(parseWith((file) => (file.settings as unknown[]).push({ key: "species", value: "monkey" }))),
    ).toContain("appears twice");
    expect(reasonOf(parseWith((file) => (file.settings as unknown[]).push({ key: "x" })))).toContain("invalid");
  });
});

describe("isISODate", () => {
  it("accepts real days and rejects everything else", () => {
    expect(isISODate("2026-11-15")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true); // a leap year
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("2026-1-1")).toBe(false);
    expect(isISODate("2026-11-15T10:00:00")).toBe(false);
    expect(isISODate(20261115)).toBe(false);
    expect(isISODate(null)).toBe(false);
  });
});

describe("names and summary", () => {
  it("names the backup file after the local day", () => {
    expect(backupFileName("2026-11-15")).toBe("tasks-organizer-backup-2026-11-15.json");
  });

  it("names the safety copy after the timestamp, without characters Windows forbids in file names", () => {
    expect(safetyCopyFileName(NOW)).toBe("before-import-2026-11-15T10-30-00-123Z.json");
    expect(safetyCopyFileName(NOW)).not.toMatch(/[:]/);
  });

  it("gives two different names to two imports in the same second", () => {
    expect(safetyCopyFileName("2026-11-15T10:30:00.123Z")).not.toBe(safetyCopyFileName("2026-11-15T10:30:00.124Z"));
  });

  it("shows the day a backup was made, in plain words", () => {
    // Noon UTC is the same calendar day in every time zone from UTC-11 to UTC+11.
    expect(backupDateLabel("2026-11-14T12:00:00.000Z")).toBe("14 Nov 2026");
  });

  it("does not break on an unreadable export time", () => {
    expect(backupDateLabel("not a date")).toBe("an unknown date");
  });

  it("counts what the backup holds", () => {
    expect(describeBackup(buildBackup(fullData(), NOW))).toEqual({ tasks: 3, events: 3, items: 1, exportedAt: NOW });
    expect(describeBackup(buildBackup(emptyData, NOW))).toEqual({ tasks: 0, events: 0, items: 0, exportedAt: NOW });
  });
});
