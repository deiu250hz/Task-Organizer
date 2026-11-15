import { create } from "zustand";
import {
  backupFileName,
  buildBackup,
  describeBackup,
  parseBackup,
  safetyCopyFileName,
  type BackupFile,
  type BackupSummary,
} from "../domain/backup";
import { toISODate } from "../domain/dates";
import { levelFromXp, stageForLevel } from "../domain/levels";
import { oneShotsFor } from "../domain/oneShots";
import { reminderMessage, shouldRemind } from "../domain/reminders";
import { rewardFor } from "../domain/rewards";
import { canPurchase } from "../domain/shop";
import { isSpecies, type Species } from "../domain/species";
import { streakFrom } from "../domain/streak";
import { canDelete, canStartOn, countActiveOn, countOverdue, newlyOverdue } from "../domain/tasks";
import type {
  CollapsedGroups,
  DateSelection,
  ISODate,
  Item,
  NewTask,
  OwnedItem,
  QueuedOneShot,
  Stage,
  Task,
  TaskGroup,
  Totals,
} from "../domain/types";
import { files } from "../platform/files";
import { notifier } from "../platform/notifier";
import { backupRepo } from "../repositories/backupRepo";
import { rewardRepo } from "../repositories/rewardRepo";
import { settingsRepo } from "../repositories/settingsRepo";
import { shopRepo } from "../repositories/shopRepo";
import { taskRepo } from "../repositories/taskRepo";

// The SQL plugin rejects with plain strings, so a caught value is not always an Error.
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The settings keys: the chosen pet, whether reminders are on ("1" / "0", a missing key means on),
// and the last day a reminder was sent (so there is at most one a day, even across restarts).
const SPECIES_KEY = "species";
const REMINDERS_KEY = "reminders";
const LAST_REMINDER_KEY = "lastReminderDay";
// Whether each task group is collapsed ("1" / "0", a missing key means expanded).
const COLLAPSED_KEYS: Record<TaskGroup, string> = {
  active: "collapsedActive",
  done: "collapsedDone",
};

const REMINDER_TITLE = "Tasks Organizer";

// Ids only need to be unique while the app runs; the queue is never saved.
let nextOneShotId = 1;

// startup() must run its steps once, even if React calls the effect twice (StrictMode in dev).
let startupPromise: Promise<void> | null = null;

// refreshDay() can be triggered by the interval and by a focus event at the same moment. While one
// refresh runs, every caller gets that same promise, so the work happens once.
let refreshPromise: Promise<void> | null = null;

// True while an export or import runs. A second click on any backup button does nothing until it ends.
let backupBusy = false;

// Items being bought right now. A second click on the same Buy button is ignored until the first
// purchase finishes (the SQL guards already prevent a double charge; this also stops a double animation).
const purchasesInFlight = new Set<number>();

/** A backup file that was read and found valid, waiting for the player to confirm replacing the current data. */
export interface PendingImport {
  fileName: string;
  summary: BackupSummary;
  backup: BackupFile;
}

/** What a backup action tells the settings popover. Cancelling a dialog is not an error. */
export type BackupResult =
  | { kind: "done"; message: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

interface AppState {
  tasks: Task[];
  /** Local 'YYYY-MM-DD'. The store reads the clock; domain functions receive it as a parameter. */
  today: ISODate;
  /** The days picked in the calendar. null means "no filter": show every task. */
  selection: DateSelection | null;
  /** Sums over the reward ledger, never a stored counter. Refreshed by loadProgress. */
  totals: Totals;
  /** Consecutive active days shown in the UI; today counts once something is done today. */
  streak: number;
  /** When the last task was completed (epoch ms), from the ledger. Drives the pet's happy hour. */
  lastCompletionAt: number | null;
  /** Animations waiting to play, in order. The head is the one playing now. */
  oneShots: QueuedOneShot[];
  /** The stage on screen. It lags behind the level while an "evolve" is still waiting in the queue. */
  displayStage: Stage;
  /** The chosen pet. null means none was chosen yet (the first-run picker shows). */
  species: Species | null;
  /** False until the saved choice has been read, so the picker does not flash for returning players. */
  settingsLoaded: boolean;
  /** Whether the task reminder is on. Saved in settings; on by default. */
  remindersEnabled: boolean;
  /** The day a reminder was last sent, or null. Saved in settings. */
  lastReminderDay: ISODate | null;
  /** Which task groups are collapsed in the task panel. Saved in settings; both expanded by default. */
  collapsedGroups: CollapsedGroups;
  /** A valid backup waiting for the player's confirmation, or null. */
  pendingImport: PendingImport | null;
  /** Everything the shop sells. Static data, loaded once at startup. */
  items: Item[];
  /** What the player has bought and whether it is worn. */
  owned: OwnedItem[];
  error: string | null;
  selectDay(day: ISODate): void;
  /** Accepts the two ends in either order and stores them as from <= to. */
  selectRange(from: ISODate, to: ISODate): void;
  clearSelection(): void;
  /** Loads tasks, flags newly overdue ones, then loads progress. Runs its steps once per app run. */
  startup(): Promise<void>;
  loadTasks(): Promise<void>;
  /** Reads the saved pet and the reminder settings. A missing or unknown pet counts as not chosen. */
  loadSettings(): Promise<void>;
  /** Saves the setting, then updates the state. On failure the old value stays and `error` is set. */
  setRemindersEnabled(enabled: boolean): Promise<void>;
  /** Saves whether the group is collapsed, then updates the state. On failure the old value stays and `error` is set. */
  setGroupCollapsed(group: TaskGroup, collapsed: boolean): Promise<void>;
  /** Sends the daily reminder if the rules allow it (see domain/reminders). Saves the day only if it was really sent. */
  remindIfDue(): Promise<void>;
  /** Sends a sample notification now, ignoring the daily limit. Resolves true when it was shown. */
  sendTestReminder(): Promise<boolean>;
  /** When the real day is no longer `today`: reload, sweep overdue, reload progress, remind. Does nothing otherwise. */
  refreshDay(): Promise<void>;
  /** Writes every table to a JSON file the player picks. */
  exportBackup(): Promise<BackupResult>;
  /** Asks for a file, validates all of it, and keeps it as `pendingImport`. Changes no data. */
  prepareImport(): Promise<BackupResult>;
  /** Forgets the pending import without changing anything. */
  cancelImport(): void;
  /** Saves a safety copy of the current data, replaces everything with the pending backup, then reloads the app state. */
  confirmImport(): Promise<BackupResult>;
  /** Saves the choice, then updates the state. Level, XP and coins carry over: the pet is only a skin. */
  chooseSpecies(species: Species): Promise<void>;
  /** Tasks that became overdue reset the streak once each, then get flagged. */
  sweepOverdue(): Promise<void>;
  /** Reads totals, the streak and the last completion time from the ledger. Safe to call any number of times. */
  loadProgress(): Promise<void>;
  /** Resolves true when the task was created, false when it was rejected or failed (see `error`). */
  addTask(input: NewTask): Promise<boolean>;
  completeTask(id: number): Promise<void>;
  /** Archives an active task (soft delete). Done tasks cannot be deleted. XP and coins are never touched. */
  deleteTask(id: number): Promise<void>;
  /** Reads the items and the inventory. Replaces both lists, so it is safe to call any number of times. */
  loadShop(): Promise<void>;
  /** Buys and wears the item. Resolves true only when the item is really owned afterwards (see `error` otherwise). */
  purchaseItem(itemId: number): Promise<boolean>;
  /** Wears an owned item (replacing the one in the same slot) or takes it off. Unowned ids are ignored. */
  toggleEquip(itemId: number): Promise<void>;
  /** Called when the head animation finishes. Ignores ids that are not the head. */
  dequeueOneShot(id: number): void;
}

function refusalMessage(reason: "owned" | "level" | "coins", item: Item): string {
  if (reason === "owned") return "You already own this item";
  if (reason === "level") return `Reach level ${item.minLevel} to buy this`;
  return "Not enough coins";
}

export const useAppStore = create<AppState>()((set, get) => ({
  tasks: [],
  today: toISODate(new Date()),
  selection: null,
  totals: { xp: 0, coins: 0 },
  streak: 0,
  lastCompletionAt: null,
  oneShots: [],
  displayStage: 1,
  species: null,
  settingsLoaded: false,
  remindersEnabled: true,
  lastReminderDay: null,
  collapsedGroups: { active: false, done: false },
  pendingImport: null,
  items: [],
  owned: [],
  error: null,

  selectDay: (day) => set({ selection: { from: day, to: day } }),

  // 'YYYY-MM-DD' strings compare like dates, so swapping reversed ends needs no date functions.
  selectRange: (from, to) =>
    set({ selection: from <= to ? { from, to } : { from: to, to: from } }),

  clearSelection: () => set({ selection: null }),

  startup: () => {
    if (startupPromise === null) {
      startupPromise = (async () => {
        await Promise.all([get().loadSettings(), get().loadTasks(), get().loadShop()]);
        await get().sweepOverdue();
        await get().loadProgress();
        await get().remindIfDue(); // last: it needs the tasks, the settings and the overdue sweep
      })();
    }
    return startupPromise;
  },

  // Replaces the whole list, so running it twice (StrictMode in dev) is harmless.
  loadTasks: async () => {
    try {
      // No "list all" query exists; string dates make this range cover every task.
      const tasks = await taskRepo.listInRange("0000-01-01", "9999-12-31");
      set({ tasks, today: toISODate(new Date()), error: null });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  loadSettings: async () => {
    try {
      const [saved, reminders, lastReminder, collapsedActive, collapsedDone] = await Promise.all([
        settingsRepo.get(SPECIES_KEY),
        settingsRepo.get(REMINDERS_KEY),
        settingsRepo.get(LAST_REMINDER_KEY),
        settingsRepo.get(COLLAPSED_KEYS.active),
        settingsRepo.get(COLLAPSED_KEYS.done),
      ]);
      set({
        species: isSpecies(saved) ? saved : null,
        remindersEnabled: reminders !== "0", // missing (never set) means on
        lastReminderDay: lastReminder, // any other day than today simply means "not reminded today"
        // Only "1" collapses; a missing or unknown value leaves the group expanded.
        collapsedGroups: { active: collapsedActive === "1", done: collapsedDone === "1" },
        settingsLoaded: true,
      });
    } catch (error) {
      // Still mark it loaded, so the picker can appear instead of an empty box.
      set({ error: messageOf(error), settingsLoaded: true });
    }
  },

  chooseSpecies: async (species) => {
    if (get().species === species) return;
    try {
      await settingsRepo.set(SPECIES_KEY, species);
      set({ species, error: null });
    } catch (error) {
      set({ error: messageOf(error) }); // keep the previous pet
    }
  },

  setRemindersEnabled: async (enabled) => {
    if (get().remindersEnabled === enabled) return;
    try {
      await settingsRepo.set(REMINDERS_KEY, enabled ? "1" : "0");
      set({ remindersEnabled: enabled, error: null });
    } catch (error) {
      set({ error: messageOf(error) }); // keep the previous value: the checkbox stays where it was
    }
  },

  setGroupCollapsed: async (group, collapsed) => {
    if (get().collapsedGroups[group] === collapsed) return;
    try {
      await settingsRepo.set(COLLAPSED_KEYS[group], collapsed ? "1" : "0");
      set({ collapsedGroups: { ...get().collapsedGroups, [group]: collapsed }, error: null });
    } catch (error) {
      set({ error: messageOf(error) }); // keep the previous value: the group stays as it was
    }
  },

  remindIfDue: async () => {
    const { tasks, today, remindersEnabled, lastReminderDay } = get();
    // The two counts never overlap: "due today" are active tasks whose dates include today, overdue
    // are active tasks that ended before it. The sweep runs before this, so both are up to date.
    const dueToday = countActiveOn(tasks, today);
    const overdue = countOverdue(tasks, today);
    if (!shouldRemind({ enabled: remindersEnabled, today, lastRemindedDay: lastReminderDay, dueToday, overdue })) return;
    const body = reminderMessage(dueToday, overdue);
    if (body === null) return; // shouldRemind already said there is text; this narrows the type
    const sent = await notifier.notify(REMINDER_TITLE, body);
    if (!sent) return; // denied or failed: do not mark the day, so the next check tries again
    try {
      await settingsRepo.set(LAST_REMINDER_KEY, today);
      set({ lastReminderDay: today });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  sendTestReminder: () => notifier.notify(REMINDER_TITLE, "This is a test reminder. Your tasks will look like this."),

  refreshDay: () => {
    if (refreshPromise !== null) return refreshPromise;
    // The same day: nothing to do. Any difference counts, forwards (midnight, wake from sleep) or
    // backwards (the clock or time zone was changed), because the refresh is safe to repeat.
    if (toISODate(new Date()) === get().today) return Promise.resolve();
    refreshPromise = (async () => {
      try {
        await get().startup(); // never run in the middle of the first load
        if (toISODate(new Date()) === get().today) return; // startup already brought us to the new day
        // The same order as startup: loadTasks sets `today`, the sweep needs it, the reminder needs the sweep.
        await get().loadTasks();
        // loadTasks moves `today` only when it succeeded. If it failed, stop here: sweeping or
        // reminding from the old tasks and the old day would be wrong, and `error` must stay visible.
        // The next check will try again.
        if (toISODate(new Date()) !== get().today) return;
        await get().sweepOverdue();
        await get().loadProgress();
        await get().remindIfDue();
      } finally {
        refreshPromise = null; // let the next trigger run (also after a failure)
      }
    })();
    return refreshPromise;
  },

  exportBackup: async () => {
    if (backupBusy) return { kind: "cancelled" };
    backupBusy = true;
    try {
      const data = await backupRepo.readAll();
      const file = buildBackup(data, new Date().toISOString()); // the store reads the clock, the domain gets it as a parameter
      const path = await files.saveBackupFile(backupFileName(get().today), JSON.stringify(file, null, 2));
      return path === null ? { kind: "cancelled" } : { kind: "done", message: `Backup saved to ${path}` };
    } catch (error) {
      return { kind: "error", message: messageOf(error) };
    } finally {
      backupBusy = false;
    }
  },

  prepareImport: async () => {
    if (backupBusy) return { kind: "cancelled" };
    backupBusy = true;
    try {
      const picked = await files.pickBackupFile();
      if (picked === null) return { kind: "cancelled" };
      // The catalogue of shop items lives in the database (seeded by migrations); the file is checked against it.
      const items = await shopRepo.listItems();
      const result = parseBackup(picked.text, items.map((item) => item.id));
      if (!result.ok) {
        set({ pendingImport: null });
        return { kind: "error", message: `${picked.name}: ${result.reason}` };
      }
      set({ pendingImport: { fileName: picked.name, summary: describeBackup(result.backup), backup: result.backup } });
      return { kind: "done", message: `Ready to import ${picked.name}.` };
    } catch (error) {
      return { kind: "error", message: messageOf(error) };
    } finally {
      backupBusy = false;
    }
  },

  cancelImport: () => set({ pendingImport: null }),

  confirmImport: async () => {
    const pending = get().pendingImport;
    if (pending === null || backupBusy) return { kind: "cancelled" };
    backupBusy = true;
    let safetyPath: string | null = null;
    try {
      // 1. A copy of what is there now. If it cannot be written the import does not start.
      const now = new Date().toISOString();
      const current = buildBackup(await backupRepo.readAll(), now);
      safetyPath = await files.writeSafetyCopy(safetyCopyFileName(now), JSON.stringify(current, null, 2));
      // 2. Replace everything. Repeatable: running it again after a failure ends in the same state.
      await backupRepo.replaceAll(pending.backup);
      set({ pendingImport: null });
      return { kind: "done", message: `Backup imported. Your previous data is saved at ${safetyPath}` };
    } catch (error) {
      const reason = messageOf(error);
      return {
        kind: "error",
        message:
          safetyPath === null
            ? reason // nothing was changed
            : `${reason} Your previous data is saved at ${safetyPath}. Importing the same file again is safe.`,
      };
    } finally {
      if (safetyPath !== null) {
        // The database may have changed (fully or partly), so show what is really there: the same
        // loads as startup, in the same order. Selection and queued animations belonged to the old data.
        set({ selection: null, oneShots: [] });
        await get().loadSettings();
        await get().loadTasks();
        await get().loadShop();
        await get().sweepOverdue(); // restored tasks that are overdue reset the streak once, as at startup
        await get().loadProgress();
      }
      backupBusy = false;
    }
  },

  sweepOverdue: async () => {
    const { tasks, today } = get();
    const late = newlyOverdue(tasks, today);
    if (late.length === 0) return;
    try {
      const ids = late.map((task) => task.id);
      await taskRepo.flagOverdue(ids, today);
      const flagged = new Set(ids);
      set((state) => ({
        tasks: state.tasks.map(
          (task): Task => (flagged.has(task.id) ? { ...task, overdueFlagged: true } : task),
        ),
        error: null,
      }));
      await get().loadProgress(); // the streak just dropped
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  loadProgress: async () => {
    try {
      const [totals, activeDays, lastCompletionAt] = await Promise.all([
        rewardRepo.totals(),
        rewardRepo.activeDaysSinceLastReset(),
        rewardRepo.lastCompletionAt(),
      ]);
      const stage = stageForLevel(levelFromXp(totals.xp).level);
      set((state) => ({
        totals,
        streak: streakFrom(activeDays, state.today),
        lastCompletionAt,
        // While an evolve waits in the queue, keep the old stage on screen until it plays.
        displayStage: state.oneShots.some((shot) => shot.kind === "evolve") ? state.displayStage : stage,
        error: null,
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  addTask: async (input) => {
    const title = input.title.trim();
    if (title === "") {
      set({ error: "Title is required" });
      return false;
    }
    // The past is read-only for adding, so no task can be created already overdue.
    if (!canStartOn(input.startDate, get().today)) {
      set({ error: "Tasks can only start today or later" });
      return false;
    }
    try {
      const created = await taskRepo.create({ ...input, title });
      // New array, never push: React and Zustand detect changes by reference.
      set((state) => ({ tasks: [...state.tasks, created], error: null }));
      return true;
    } catch (error) {
      set({ error: messageOf(error) });
      return false;
    }
  },

  completeTask: async (id) => {
    const { today, tasks, totals, displayStage } = get();
    const task = tasks.find((candidate) => candidate.id === id);
    // Only an active task can be completed; this also stops a double click from paying twice.
    if (task === undefined || task.status !== "active") return;
    try {
      const levelBefore = levelFromXp(totals.xp).level;
      // The bonus uses the streak kept up to yesterday, so every task completed on the same
      // day earns the same bonus, whatever its position in the day.
      const activeDays = await rewardRepo.activeDaysSinceLastReset();
      const streakBeforeToday = streakFrom(
        activeDays.filter((day) => day < today),
        today,
      );
      await taskRepo.complete(id, rewardFor(task.difficulty, streakBeforeToday), today);
      set((state) => ({
        tasks: state.tasks.map(
          (candidate): Task =>
            candidate.id === id ? { ...candidate, status: "done", completedOn: today } : candidate,
        ),
        error: null,
      }));
      await get().loadProgress(); // XP, coins and streak come from the ledger, not a local counter

      const levelAfter = levelFromXp(get().totals.xp).level;
      const shots: QueuedOneShot[] = oneShotsFor(levelBefore, levelAfter).map((spec) => ({
        id: nextOneShotId++,
        ...spec,
      }));
      set((state) => ({
        oneShots: [...state.oneShots, ...shots],
        // loadProgress already moved the stage; put the old one back so the evolve can play.
        displayStage: shots.some((shot) => shot.kind === "evolve") ? displayStage : state.displayStage,
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  deleteTask: async (id) => {
    const task = get().tasks.find((candidate) => candidate.id === id);
    if (task === undefined || !canDelete(task)) return;
    try {
      await taskRepo.archive(id);
      // Mood, overdue count, calendar dots and the visible list are all derived from tasks,
      // so removing the task from this array updates all of them.
      set((state) => ({ tasks: state.tasks.filter((candidate) => candidate.id !== id), error: null }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  loadShop: async () => {
    try {
      const [items, owned] = await Promise.all([shopRepo.listItems(), shopRepo.listOwned()]);
      set({ items, owned, error: null });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  purchaseItem: async (itemId) => {
    if (purchasesInFlight.has(itemId)) return false;
    const { items, owned, totals, today } = get();
    const item = items.find((candidate) => candidate.id === itemId);
    if (item === undefined) {
      set({ error: "Unknown item" });
      return false;
    }
    const check = canPurchase(
      item,
      totals.coins,
      levelFromXp(totals.xp).level,
      owned.some((entry) => entry.itemId === itemId),
    );
    if (!check.ok) {
      set({ error: refusalMessage(check.reason, item) });
      return false;
    }
    purchasesInFlight.add(itemId);
    try {
      await shopRepo.purchase(item, today);
      await shopRepo.setEquipped(item.id, true); // buying wears it, so the player sees the result at once
      // Coins come from the ledger, so they are re-read rather than subtracted here.
      await Promise.all([get().loadShop(), get().loadProgress()]);
      // The guarded SQL may have refused (for example, coins changed under us). Trust the database.
      if (!get().owned.some((entry) => entry.itemId === itemId)) {
        set({ error: "The purchase did not go through" });
        return false;
      }
      set((state) => ({ oneShots: [...state.oneShots, { id: nextOneShotId++, kind: "equip" }] }));
      return true;
    } catch (error) {
      set({ error: messageOf(error) });
      return false;
    } finally {
      purchasesInFlight.delete(itemId);
    }
  },

  toggleEquip: async (itemId) => {
    const entry = get().owned.find((candidate) => candidate.itemId === itemId);
    if (entry === undefined) return; // not owned (or unknown): nothing to wear
    const wear = !entry.equipped;
    try {
      await shopRepo.setEquipped(itemId, wear);
      await get().loadShop();
      // Taking an item off is silent; only wearing plays the little hop.
      if (wear) set((state) => ({ oneShots: [...state.oneShots, { id: nextOneShotId++, kind: "equip" }] }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  dequeueOneShot: (id) =>
    set((state) => {
      const head = state.oneShots[0];
      if (head === undefined || head.id !== id) return state; // stale or duplicate notification
      return {
        oneShots: state.oneShots.slice(1),
        displayStage:
          head.kind === "evolve" && head.toStage !== undefined ? head.toStage : state.displayStage,
      };
    }),
}));
