import type {
  BackupData,
  BackupEvent,
  BackupOwned,
  BackupReason,
  BackupSetting,
  BackupTask,
} from "../domain/backup";
import type { Difficulty, TaskStatus } from "../domain/types";
import { getDb } from "./db";

// Reads every table for a backup, and replaces every table from one. No rules live here: the file is
// checked by domain/backup.ts (parseBackup) before replaceAll is ever called.
export interface BackupRepo {
  readAll(): Promise<BackupData>;
  /** Deletes everything, then inserts the backup with its original ids. Safe to run again after a failure. */
  replaceAll(data: BackupData): Promise<void>;
}

interface TaskRow {
  id: number;
  title: string;
  notes: string | null;
  start_date: string;
  end_date: string;
  difficulty: number;
  status: string;
  overdue_flagged: number;
  completed_on: string | null;
  created_at: string;
}

interface EventRow {
  id: number;
  task_id: number | null;
  xp: number;
  coins: number;
  reason: string;
  day: string;
  created_at: string;
  item_id: number | null;
}

interface OwnedRow {
  item_id: number;
  purchased_on: string;
  equipped: number;
}

// Unlike taskRepo.listInRange this keeps archived tasks: deleted tasks still have ledger rows.
async function readAll(): Promise<BackupData> {
  const db = await getDb();
  const [tasks, events, owned, settings] = await Promise.all([
    db.select<TaskRow[]>(
      `SELECT id, title, notes, start_date, end_date, difficulty, status, overdue_flagged, completed_on, created_at
       FROM tasks ORDER BY id`,
    ),
    // Ledger order (id) matters: the streak is cut at the last streak_reset by id, not by date.
    db.select<EventRow[]>(
      `SELECT id, task_id, xp, coins, reason, day, created_at, item_id FROM reward_events ORDER BY id`,
    ),
    db.select<OwnedRow[]>(`SELECT item_id, purchased_on, equipped FROM inventory ORDER BY item_id`),
    db.select<BackupSetting[]>(`SELECT key, value FROM settings ORDER BY key`),
  ]);
  return {
    tasks: tasks.map(
      (row): BackupTask => ({
        id: row.id,
        title: row.title,
        notes: row.notes,
        startDate: row.start_date,
        endDate: row.end_date,
        // The table's CHECK constraints guarantee these values, so the casts are safe.
        difficulty: row.difficulty as Difficulty,
        status: row.status as TaskStatus,
        overdueFlagged: row.overdue_flagged === 1,
        completedOn: row.completed_on,
        createdAt: row.created_at,
      }),
    ),
    rewardEvents: events.map(
      (row): BackupEvent => ({
        id: row.id,
        taskId: row.task_id,
        xp: row.xp,
        coins: row.coins,
        reason: row.reason as BackupReason,
        day: row.day,
        createdAt: row.created_at,
        itemId: row.item_id,
      }),
    ),
    inventory: owned.map(
      (row): BackupOwned => ({ itemId: row.item_id, purchasedOn: row.purchased_on, equipped: row.equipped === 1 }),
    ),
    settings: settings.map((row): BackupSetting => ({ key: row.key, value: row.value })),
  };
}

// Rows per INSERT. 50 rows of at most 10 columns is 500 bound values, far below SQLite's limit.
const CHUNK = 50;

type Cell = string | number | null;

// One INSERT per chunk of rows. Only the "$1, $2, ..." placeholders are built into the text; the
// table and column names are constants in this file and every value is bound.
async function insertAll(table: string, columns: string[], rows: Cell[][]): Promise<void> {
  const db = await getDb();
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const tuples = chunk
      .map((_, r) => `(${columns.map((__, c) => `$${r * columns.length + c + 1}`).join(", ")})`)
      .join(", ");
    await db.execute(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples}`, chunk.flat());
  }
}

/*
 * The SQL plugin cannot make this one transaction (every execute() may use a different pooled
 * connection, PLAN.md section 5), so it is built to be repeatable instead: delete everything in
 * foreign-key-safe order, then insert everything with the ORIGINAL ids. Whatever state a failure
 * leaves, running it again ends in exactly the same final state. Original ids matter: the streak is
 * cut by ledger id order, so renumbering the ledger would silently change it.
 */
async function replaceAll(data: BackupData): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM reward_events`);
  await db.execute(`DELETE FROM inventory`);
  await db.execute(`DELETE FROM tasks`);
  await db.execute(`DELETE FROM settings`);

  // Parents first: tasks, then the ledger rows that point at them, then the rest.
  await insertAll(
    "tasks",
    ["id", "title", "notes", "start_date", "end_date", "difficulty", "status", "overdue_flagged", "completed_on", "created_at"],
    data.tasks.map((t) => [
      t.id,
      t.title,
      t.notes,
      t.startDate,
      t.endDate,
      t.difficulty,
      t.status,
      t.overdueFlagged ? 1 : 0,
      t.completedOn,
      t.createdAt,
    ]),
  );
  await insertAll(
    "reward_events",
    ["id", "task_id", "xp", "coins", "reason", "day", "created_at", "item_id"],
    data.rewardEvents.map((e) => [e.id, e.taskId, e.xp, e.coins, e.reason, e.day, e.createdAt, e.itemId]),
  );
  await insertAll(
    "inventory",
    ["item_id", "purchased_on", "equipped"],
    data.inventory.map((o) => [o.itemId, o.purchasedOn, o.equipped ? 1 : 0]),
  );
  await insertAll(
    "settings",
    ["key", "value"],
    data.settings.map((s) => [s.key, s.value]),
  );
}

export const backupRepo: BackupRepo = { readAll, replaceAll };
