// Backup file format and its validation. Pure: no clock, no I/O. The caller supplies the export
// time, and the file text it read from disk.
import { format, isValid, parseISO } from "date-fns";
import { toISODate } from "./dates";
import { isSpecies } from "./species";
import type { Difficulty, ISODate, TaskStatus } from "./types";

export const BACKUP_APP = "tasks-organizer";
export const BACKUP_FORMAT_VERSION = 1;

// The rows as they are saved. They mirror the tables, in camelCase, with the audit timestamps the
// domain types leave out. Every task status is included: archived tasks still have ledger rows.
export interface BackupTask {
  id: number;
  title: string;
  notes: string | null;
  startDate: ISODate;
  endDate: ISODate;
  difficulty: Difficulty;
  status: TaskStatus;
  overdueFlagged: boolean;
  completedOn: ISODate | null;
  createdAt: string;
}

export type BackupReason = "task_done" | "purchase" | "streak_reset";

export interface BackupEvent {
  id: number;
  taskId: number | null;
  xp: number;
  coins: number;
  reason: BackupReason;
  day: ISODate;
  createdAt: string;
  itemId: number | null;
}

export interface BackupOwned {
  itemId: number;
  purchasedOn: ISODate;
  equipped: boolean;
}

export interface BackupSetting {
  key: string;
  value: string;
}

export interface BackupData {
  tasks: BackupTask[];
  rewardEvents: BackupEvent[];
  inventory: BackupOwned[];
  settings: BackupSetting[];
}

export interface BackupFile extends BackupData {
  app: typeof BACKUP_APP;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  /** ISO timestamp of the export. Audit only; it never drives behaviour. */
  exportedAt: string;
}

export interface BackupSummary {
  tasks: number;
  events: number;
  items: number;
  exportedAt: string;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; reason: string };

/** Assembles the file. Everything is sorted, so the same data always gives the same text. The ledger is
 * ordered by id because the streak is cut by ledger order. */
export function buildBackup(data: BackupData, exportedAt: string): BackupFile {
  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    tasks: [...data.tasks].sort((a, b) => a.id - b.id),
    rewardEvents: [...data.rewardEvents].sort((a, b) => a.id - b.id),
    inventory: [...data.inventory].sort((a, b) => a.itemId - b.itemId),
    settings: [...data.settings].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
  };
}

export function backupFileName(day: ISODate): string {
  return `tasks-organizer-backup-${day}.json`;
}

/** The name of the automatic copy made just before an import. The timestamp's `:` and `.` are not allowed in Windows file names. */
export function safetyCopyFileName(timestamp: string): string {
  return `before-import-${timestamp.replace(/[:.]/g, "-")}.json`;
}

/** "14 Nov 2026": the local day a backup was made, for the confirmation text. */
export function backupDateLabel(exportedAt: string): string {
  const parsed = parseISO(exportedAt);
  return isValid(parsed) ? format(parsed, "d MMM yyyy") : "an unknown date";
}

export function describeBackup(backup: BackupFile): BackupSummary {
  return {
    tasks: backup.tasks.length,
    events: backup.rewardEvents.length,
    items: backup.inventory.length,
    exportedAt: backup.exportedAt,
  };
}

// ---------------------------------------------------------------------------------------------
// Validation. Each check throws a BackupFormatError with a message for the player; parseBackup is
// the only place that catches it, so the public function never throws for a bad file.

class BackupFormatError extends Error {}

function fail(reason: string): never {
  throw new BackupFormatError(reason);
}

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const isInt = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

/** A real calendar day written as 'YYYY-MM-DD'. "2026-02-30" and "2026-2-3" are not. */
export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && toISODate(parsed) === value;
}

const TASK_STATUSES: readonly string[] = ["active", "done", "archived"];
const REASONS: readonly string[] = ["task_done", "purchase", "streak_reset"];

function section(file: Obj, name: string): unknown[] {
  const value = file[name];
  if (!Array.isArray(value)) fail(`The file has no "${name}" list.`);
  return value;
}

function row(raw: unknown, where: string): Obj {
  if (!isObject(raw)) fail(`${where} is not an object.`);
  return raw;
}

function parseTask(raw: unknown, index: number): BackupTask {
  const r = row(raw, `Task ${index + 1}`);
  const id = r.id;
  if (!isInt(id) || id < 1) fail(`Task ${index + 1} has an invalid id.`);
  const where = `Task ${id}`;
  if (typeof r.title !== "string" || r.title.trim() === "") fail(`${where} has no title.`);
  if (r.notes !== null && typeof r.notes !== "string") fail(`${where} has invalid notes.`);
  if (!isISODate(r.startDate) || !isISODate(r.endDate)) fail(`${where} has an invalid date.`);
  if (r.endDate < r.startDate) fail(`${where} ends before it starts.`);
  if (r.difficulty !== 1 && r.difficulty !== 2 && r.difficulty !== 3) fail(`${where} has an invalid difficulty.`);
  if (typeof r.status !== "string" || !TASK_STATUSES.includes(r.status)) fail(`${where} has an invalid status.`);
  if (typeof r.overdueFlagged !== "boolean") fail(`${where} has an invalid overdue flag.`);
  if (r.completedOn !== null && !isISODate(r.completedOn)) fail(`${where} has an invalid completion date.`);
  if ((r.status === "done") !== (r.completedOn !== null)) {
    fail(`${where} is inconsistent: only done tasks have a completion date.`);
  }
  if (typeof r.createdAt !== "string" || r.createdAt === "") fail(`${where} has no creation time.`);
  return {
    id,
    title: r.title,
    notes: r.notes,
    startDate: r.startDate,
    endDate: r.endDate,
    difficulty: r.difficulty,
    // The status list was checked just above, so the cast is safe.
    status: r.status as TaskStatus,
    overdueFlagged: r.overdueFlagged,
    completedOn: r.completedOn,
    createdAt: r.createdAt,
  };
}

function parseEvent(raw: unknown, index: number, taskIds: Set<number>, knownItems: Set<number>): BackupEvent {
  const r = row(raw, `Reward entry ${index + 1}`);
  const id = r.id;
  if (!isInt(id) || id < 1) fail(`Reward entry ${index + 1} has an invalid id.`);
  const where = `Reward entry ${id}`;
  if (typeof r.reason !== "string" || !REASONS.includes(r.reason)) fail(`${where} has an invalid reason.`);
  if (!isInt(r.xp) || r.xp < 0) fail(`${where} has invalid XP.`);
  if (!isInt(r.coins)) fail(`${where} has invalid coins.`);
  if (!isISODate(r.day)) fail(`${where} has an invalid day.`);
  if (typeof r.createdAt !== "string" || r.createdAt === "") fail(`${where} has no creation time.`);
  if (r.taskId !== null && !isInt(r.taskId)) fail(`${where} has an invalid task.`);
  if (r.itemId !== null && !isInt(r.itemId)) fail(`${where} has an invalid item.`);
  if (r.reason === "task_done" && (r.taskId === null || !taskIds.has(r.taskId))) {
    fail(`${where} completes a task that is not in the file.`);
  }
  if (r.reason === "purchase" && (r.itemId === null || !knownItems.has(r.itemId))) {
    fail(`${where} is a purchase of an item this version of the app does not know.`);
  }
  if (r.taskId !== null && !taskIds.has(r.taskId)) fail(`${where} refers to a task that is not in the file.`);
  return {
    id,
    taskId: r.taskId,
    xp: r.xp,
    coins: r.coins,
    reason: r.reason as BackupReason, // checked against REASONS above
    day: r.day,
    createdAt: r.createdAt,
    itemId: r.itemId,
  };
}

function parseOwned(raw: unknown, index: number, knownItems: Set<number>): BackupOwned {
  const r = row(raw, `Inventory entry ${index + 1}`);
  if (!isInt(r.itemId) || !knownItems.has(r.itemId)) {
    fail(`Inventory entry ${index + 1} is an item this version of the app does not know.`);
  }
  if (!isISODate(r.purchasedOn)) fail(`Inventory entry ${index + 1} has an invalid purchase date.`);
  if (typeof r.equipped !== "boolean") fail(`Inventory entry ${index + 1} has an invalid equipped flag.`);
  return { itemId: r.itemId, purchasedOn: r.purchasedOn, equipped: r.equipped };
}

// The settings this version understands. Any other key is ignored, so a backup from a version with
// more settings still imports. A known key with a bad value is an error.
const SETTING_CHECKS: Record<string, (value: string) => boolean> = {
  species: (value) => isSpecies(value),
  reminders: (value) => value === "0" || value === "1",
  lastReminderDay: (value) => isISODate(value),
};

function parseSettings(rawList: unknown[]): BackupSetting[] {
  const seen = new Set<string>();
  const settings: BackupSetting[] = [];
  rawList.forEach((raw, index) => {
    const r = row(raw, `Setting ${index + 1}`);
    if (typeof r.key !== "string" || typeof r.value !== "string") fail(`Setting ${index + 1} is invalid.`);
    const check = SETTING_CHECKS[r.key];
    if (check === undefined) return; // unknown key: not imported
    if (seen.has(r.key)) fail(`The setting "${r.key}" appears twice.`);
    seen.add(r.key);
    if (!check(r.value)) fail(`The setting "${r.key}" has an invalid value.`);
    settings.push({ key: r.key, value: r.value });
  });
  return settings;
}

function uniqueIds(ids: number[], what: string): void {
  if (new Set(ids).size !== ids.length) fail(`Two ${what} share the same id.`);
}

/**
 * Checks a whole backup file before anything is changed. `knownItemIds` are the shop items this version
 * of the app has (they come from the database, seeded by migrations); the catalogue itself is not saved
 * in a backup, only what was bought and spent.
 */
export function parseBackup(text: string, knownItemIds: readonly number[]): ParseResult {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: "This file is not a valid backup (it is not JSON)." };
    }
    if (!isObject(parsed) || parsed.app !== BACKUP_APP) {
      return { ok: false, reason: "This file is not a Tasks Organizer backup." };
    }
    if (typeof parsed.formatVersion === "number" && parsed.formatVersion > BACKUP_FORMAT_VERSION) {
      return { ok: false, reason: "This backup was made by a newer version of the app. Update the app and try again." };
    }
    if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
      return { ok: false, reason: "This backup has an unknown format version." };
    }
    if (typeof parsed.exportedAt !== "string") fail("The file has no export time.");

    const knownItems = new Set(knownItemIds);
    const tasks = section(parsed, "tasks").map((raw, index) => parseTask(raw, index));
    uniqueIds(tasks.map((task) => task.id), "tasks");
    const taskIds = new Set(tasks.map((task) => task.id));

    const rewardEvents = section(parsed, "rewardEvents").map((raw, index) => parseEvent(raw, index, taskIds, knownItems));
    uniqueIds(rewardEvents.map((event) => event.id), "reward entries");
    const completed = rewardEvents.filter((event) => event.reason === "task_done").map((event) => event.taskId);
    if (new Set(completed).size !== completed.length) fail("A task is completed twice in the reward entries.");
    const balance = rewardEvents.reduce((sum, event) => sum + event.coins, 0);
    if (balance < 0) fail("The reward entries spend more coins than they earn.");

    const inventory = section(parsed, "inventory").map((raw, index) => parseOwned(raw, index, knownItems));
    uniqueIds(inventory.map((owned) => owned.itemId), "inventory entries");

    const settings = parseSettings(section(parsed, "settings"));

    return {
      ok: true,
      backup: buildBackup({ tasks, rewardEvents, inventory, settings }, parsed.exportedAt),
    };
  } catch (error) {
    if (error instanceof BackupFormatError) return { ok: false, reason: error.message };
    throw error; // a real bug, not a bad file: do not hide it
  }
}
