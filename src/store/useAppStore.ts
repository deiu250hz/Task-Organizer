import { create } from "zustand";
import { toISODate } from "../domain/dates";
import type { ISODate, NewTask, Reward, Task } from "../domain/types";
import { taskRepo } from "../repositories/taskRepo";

// Temporary: replaced by rewardFor(difficulty, streakDays) when the rewards engine lands (Phase 4).
const PLACEHOLDER_REWARD: Reward = { xp: 10, coins: 5 };

// The SQL plugin rejects with plain strings, so a caught value is not always an Error.
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface AppState {
  tasks: Task[];
  /** Local 'YYYY-MM-DD'. The store reads the clock; domain functions receive it as a parameter. */
  today: ISODate;
  error: string | null;
  loadTasks(): Promise<void>;
  /** Resolves true when the task was created, false when it was rejected or failed (see `error`). */
  addTask(input: NewTask): Promise<boolean>;
  completeTask(id: number): Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  tasks: [],
  today: toISODate(new Date()),
  error: null,

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
    const { today } = get();
    try {
      await taskRepo.complete(id, PLACEHOLDER_REWARD, today);
      set((state) => ({
        tasks: state.tasks.map(
          (task): Task =>
            task.id === id ? { ...task, status: "done", completedOn: today } : task,
        ),
        error: null,
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },
}));
