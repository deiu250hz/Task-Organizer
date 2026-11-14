import { appDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

// The only place the dialog and fs plugins are imported (like notifier.ts and repositories/).
// Unlike the notifier, these THROW: a backup that silently failed would look like a backup that
// worked. Every error carries a message the player can read; the store catches it.
export interface Files {
  /** Asks where to save, writes the file, and returns the path. null when the player cancelled. */
  saveBackupFile(defaultName: string, contents: string): Promise<string | null>;
  /** Asks which file to open and reads it. null when the player cancelled. */
  pickBackupFile(): Promise<{ name: string; text: string } | null>;
  /** Writes into the app's own `backups` folder (made if missing) and returns the full path. */
  writeSafetyCopy(name: string, contents: string): Promise<string>;
}

const FILTERS = [{ name: "Tasks Organizer backup", extensions: ["json"] }];
const SAFETY_FOLDER = "backups"; // inside the app data folder, next to tasks.db

function ensureDesktop(): void {
  // Tauri injects this into its webview. Outside it (plain `npm run dev` in a browser) there are no dialogs.
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Backups need the desktop app.");
  }
}

// The plugins reject with plain strings as well as Errors.
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function saveBackupFile(defaultName: string, contents: string): Promise<string | null> {
  ensureDesktop();
  try {
    const path = await save({ defaultPath: defaultName, filters: FILTERS });
    if (path === null) return null;
    await writeTextFile(path, contents);
    return path;
  } catch (error) {
    throw new Error(`Could not save the backup: ${describe(error)}`);
  }
}

async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  ensureDesktop();
  try {
    const path = await open({ multiple: false, directory: false, filters: FILTERS });
    if (path === null) return null;
    const text = await readTextFile(path);
    return { name: path.split(/[\\/]/).pop() ?? path, text };
  } catch (error) {
    throw new Error(`Could not open the file: ${describe(error)}`);
  }
}

async function writeSafetyCopy(name: string, contents: string): Promise<string> {
  ensureDesktop();
  try {
    await mkdir(SAFETY_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(`${SAFETY_FOLDER}/${name}`, contents, { baseDir: BaseDirectory.AppData });
    return await join(await appDataDir(), SAFETY_FOLDER, name);
  } catch (error) {
    throw new Error(`Could not save a safety copy of your current data: ${describe(error)}`);
  }
}

export const files: Files = { saveBackupFile, pickBackupFile, writeSafetyCopy };
