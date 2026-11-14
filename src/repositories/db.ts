import Database from "@tauri-apps/plugin-sql";

// Must match the name registered with add_migrations() in src-tauri/src/lib.rs.
const DB_PATH = "sqlite:tasks.db";

// Holds the pending (or finished) connection. Caching the promise, not the result,
// means two callers asking before the first load finishes share one connection.
let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (dbPromise === null) {
    dbPromise = Database.load(DB_PATH).catch((error: unknown) => {
      // Do not keep a rejected promise forever: reset so the next call can retry.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
