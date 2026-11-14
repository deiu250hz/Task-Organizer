import type { ISODate, Totals } from "../domain/types";
import { getDb } from "./db";

// Contract from PLAN.md section 5. XP and coins are never stored as counters: they are sums
// over the append-only reward_events ledger, so they can never drift from what happened.
export interface RewardRepo {
  totals(): Promise<Totals>;
  /** Days with a task_done event after the last streak_reset, newest first. */
  activeDaysSinceLastReset(): Promise<ISODate[]>;
  completedCount(day: ISODate): Promise<number>;
  /** When the last task was completed, in epoch milliseconds; null if none ever was. Drives the pet's happy hour. */
  lastCompletionAt(): Promise<number | null>;
}

async function totals(): Promise<Totals> {
  const db = await getDb();
  // SUM() over zero rows is NULL, so COALESCE keeps an empty ledger at 0.
  const rows = await db.select<Totals[]>(
    `SELECT COALESCE(SUM(xp), 0) AS xp, COALESCE(SUM(coins), 0) AS coins
     FROM reward_events`,
  );
  return { xp: rows[0].xp, coins: rows[0].coins };
}

// "After the last reset" is decided by ledger order (id), not by day: a task completed on the
// same day as a reset still counts, which `day > lastResetDay` would silently drop.
async function activeDaysSinceLastReset(): Promise<ISODate[]> {
  const db = await getDb();
  const rows = await db.select<{ day: string }[]>(
    `SELECT DISTINCT day FROM reward_events
     WHERE reason = 'task_done'
       AND id > COALESCE((SELECT MAX(id) FROM reward_events WHERE reason = 'streak_reset'), 0)
     ORDER BY day DESC`,
  );
  return rows.map((row) => row.day);
}

async function completedCount(day: ISODate): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM reward_events WHERE reason = 'task_done' AND day = $1`,
    [day],
  );
  return rows[0].n;
}

// created_at is an audit timestamp everywhere else. This is the one place it drives behaviour:
// the "happy for an hour after a task" window. ISO timestamps sort like time, so MAX works,
// and epoch milliseconds make the later comparison independent of time zones and DST.
async function lastCompletionAt(): Promise<number | null> {
  const db = await getDb();
  const rows = await db.select<{ last: string | null }[]>(
    `SELECT MAX(created_at) AS last FROM reward_events WHERE reason = 'task_done'`,
  );
  const last = rows[0].last;
  if (last === null) return null;
  const ms = Date.parse(last);
  return Number.isNaN(ms) ? null : ms;
}

export const rewardRepo: RewardRepo = {
  totals,
  activeDaysSinceLastReset,
  completedCount,
  lastCompletionAt,
};
