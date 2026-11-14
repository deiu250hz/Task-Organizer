import { create } from "zustand";
import { toISODate } from "../domain/dates";
import { rewardFor } from "../domain/rewards";
import { streakFrom } from "../domain/streak";
import type { DateSelection, ISODate, NewTask, Task, Totals } from "../domain/types";
import { rewardRepo } from "../repositories/rewardRepo";
import { taskRepo } from "../repositories/taskRepo";

// The SQL plugin rejects with plain strings, so a caught value is not always an Error.
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  error: string | null;
  selectDay(day: ISODate): void;
  /** Accepts the two ends in either order and stores them as from <= to. */
  selectRange(from: ISODate, to: ISODate): void;
  clearSelection(): void;
  loadTasks(): Promise<void>;
  /** Reads totals and the streak from the ledger. Safe to call any number of times. */
  loadProgress(): Promise<void>;
  /** Resolves true when the task was created, false when it was rejected or failed (see `error`). */
  addTask(input: NewTask): Promise<boolean>;
  completeTask(id: number): Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  tasks: [],
  today: toISODate(new Date()),
  selection: null,
  totals: { xp: 0, coins: 0 },
  streak: 0,
  error: null,

  selectDay: (day) => set({ selection: { from: day, to: day } }),

  // 'YYYY-MM-DD' strings compare like dates, so swapping reversed ends needs no date functions.
  selectRange: (from, to) =>
    set({ selection: from <= to ? { from, to } : { from: to, to: from } }),

  clearSelection: () => set({ selection: null }),

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

  loadProgress: async () => {
    try {
      const [totals, activeDays] = await Promise.all([
        rewardRepo.totals(),
        rewardRepo.activeDaysSinceLastReset(),
      ]);
      set({ totals, streak: streakFrom(activeDays, get().today), error: null });
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
    const { today, tasks } = get();
    const task = tasks.find((candidate) => candidate.id === id);
    // Only an active task can be completed; this also stops a double click from paying twice.
    if (task === undefined || task.status !== "active") return;
    try {
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
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },
}));
