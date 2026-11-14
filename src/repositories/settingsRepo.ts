import { getDb } from "./db";

// A tiny key-value store for preferences (which pet the player chose). These are not game
// progress: XP and coins stay sums over the ledger, and nothing here is a counter.
export interface SettingsRepo {
  /** The saved value, or null if the key was never set. */
  get(key: string): Promise<string | null>;
  /** Saves a value, replacing any earlier one for the same key. */
  set(key: string, value: string): Promise<void>;
}

async function get(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(`SELECT value FROM settings WHERE key = $1`, [key]);
  return rows.length === 0 ? null : rows[0].value;
}

// An upsert: insert the key, or update it if it already exists, in one statement.
async function set(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export const settingsRepo: SettingsRepo = { get, set };
