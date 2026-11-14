import type {
  Difficulty,
  ISODate,
  NewTask,
  Reward,
  Task,
  TaskStatus,
} from "../domain/types";
import { getDb } from "./db";

// Contract (the subset of PLAN.md section 5 implemented so far).
export interface TaskRepo {
  listInRange(from: ISODate, to: ISODate): Promise<Task[]>;
  create(input: NewTask): Promise<Task>;
  /** Marks the task done and writes its task_done ledger row. Safe to retry; see the comment on complete. */
  complete(id: number, reward: Reward, today: ISODate): Promise<void>;
  /** The streak resets once for these tasks, then they are flagged. Safe to retry; see the comment on flagOverdue. */
  flagOverdue(ids: number[], today: ISODate): Promise<void>;
  /** Flags tasks without resetting the streak (a task created already past its end date is not a missed deadline). */
  markFlagged(ids: number[]): Promise<void>;
}

// A row exactly as SQLite returns it: snake_case, 0/1 for booleans, plain strings for dates.
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

// The only place snake_case becomes camelCase and 0/1 becomes boolean.
function rowToTask(row: TaskRow): Task {
  return {
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
  };
}

async function listInRange(from: ISODate, to: ISODate): Promise<Task[]> {
  const db = await getDb();
  // Range overlap on 'YYYY-MM-DD' strings: lexicographic order equals date order.
  const rows = await db.select<TaskRow[]>(
    `SELECT * FROM tasks
     WHERE start_date <= $2 AND end_date >= $1 AND status != 'archived'
     ORDER BY end_date, id`,
    [from, to],
  );
  return rows.map(rowToTask);
}

async function create(input: NewTask): Promise<Task> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO tasks (title, notes, start_date, end_date, difficulty, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.title,
      input.notes ?? null,
      input.startDate,
      input.endDate,
      input.difficulty,
      new Date().toISOString(), // audit timestamp only; never drives behaviour
    ],
  );
  if (result.lastInsertId === undefined) {
    throw new Error("Insert did not return an id");
  }
  const rows = await db.select<TaskRow[]>("SELECT * FROM tasks WHERE id = $1", [
    result.lastInsertId,
  ]);
  if (rows.length === 0) {
    throw new Error(`Task ${result.lastInsertId} not found right after insert`);
  }
  return rowToTask(rows[0]);
}

/*
 * Two writes, and the SQL plugin cannot make them one transaction: every execute()
 * runs on whichever pooled connection is free, so BEGIN / COMMIT sent separately can
 * land on different connections. Instead the two steps are ordered and idempotent:
 *   1. insert the ledger row, but only if the task is still active and has none yet;
 *   2. mark the task done, but only if it is still active.
 * If step 2 fails, retrying complete() skips step 1 (the row exists) and finishes step 2,
 * so the reward is written exactly once. Calling it twice never double-pays.
 */
async function complete(
  id: number,
  reward: Reward,
  today: ISODate,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO reward_events (task_id, xp, coins, reason, day, created_at)
     SELECT $1, $2, $3, 'task_done', $4, $5
     WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND status = 'active')
       AND NOT EXISTS (SELECT 1 FROM reward_events WHERE task_id = $1 AND reason = 'task_done')`,
    [id, reward.xp, reward.coins, today, new Date().toISOString()],
  );
  await db.execute(
    `UPDATE tasks SET status = 'done', completed_on = $2
     WHERE id = $1 AND status = 'active'`,
    [id, today],
  );
}

// "$1, $2, ..." for n bound values. Only placeholders are built here, never the values.
function placeholders(count: number): string {
  return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(", ");
}

async function markFlagged(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.execute(`UPDATE tasks SET overdue_flagged = 1 WHERE id IN (${placeholders(ids.length)})`, ids);
}

/*
 * Same idea as complete: two writes, ordered so a retry is safe.
 *   1. insert one streak_reset event for today;
 *   2. flag the tasks so they never reset the streak again.
 * If step 2 fails the tasks stay unflagged, and the next sweep inserts another reset. A second
 * reset is harmless, because the streak is cut at the LAST reset, so the result is identical.
 * Flagging first would be worse: a failure after it would lose the reset for good.
 */
async function flagOverdue(ids: number[], today: ISODate): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.execute(
    `INSERT INTO reward_events (task_id, xp, coins, reason, day, created_at)
     VALUES (NULL, 0, 0, 'streak_reset', $1, $2)`,
    [today, new Date().toISOString()],
  );
  await markFlagged(ids);
}

export const taskRepo: TaskRepo = { listInRange, create, complete, flagOverdue, markFlagged };
