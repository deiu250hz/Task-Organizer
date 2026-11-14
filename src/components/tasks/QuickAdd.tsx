import { useState, type FormEvent } from "react";
import { formatDayRange } from "../../domain/dates";
import { canStartOn } from "../../domain/tasks";
import type { Difficulty } from "../../domain/types";
import { useAppStore } from "../../store/useAppStore";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

export function QuickAdd() {
  // One narrow selector per field: this component re-renders only when these change.
  const addTask = useAppStore((s) => s.addTask);
  const today = useAppStore((s) => s.today);
  const selection = useAppStore((s) => s.selection);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(1);

  // New tasks take the days picked in the calendar, or today when nothing is selected.
  const startDate = selection?.from ?? today;
  const endDate = selection?.to ?? today;
  // The past is read-only for adding: a selection that starts before today only lets you finish
  // overdue tasks. The store enforces the same rule, so this is feedback, not the only guard.
  const canAdd = canStartOn(startDate, today);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!canAdd) return;
    const created = await addTask({ title, startDate, endDate, difficulty });
    // Keep what the user typed if the store rejected it, so nothing is lost.
    if (created) setTitle("");
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mb-4 flex flex-wrap gap-2"
    >
      <label htmlFor="quick-add-title" className="sr-only">
        New task
      </label>
      <input
        id="quick-add-title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={!canAdd}
        aria-describedby={canAdd ? undefined : "quick-add-hint"}
        placeholder={
          !canAdd
            ? "Pick today or a later day…"
            : selection === null
              ? "Add a task for today…"
              : `Add a task for ${formatDayRange(startDate, endDate)}…`
        }
        className="min-w-40 flex-1 rounded-md border border-border-strong bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
      />

      <label htmlFor="quick-add-difficulty" className="sr-only">
        Difficulty
      </label>
      <select
        id="quick-add-difficulty"
        value={difficulty}
        onChange={(event) => {
          // Narrow the string to 1 | 2 | 3 with a check instead of a cast.
          const next = Number(event.target.value);
          if (next === 1 || next === 2 || next === 3) setDifficulty(next);
        }}
        disabled={!canAdd}
        className="rounded-md border border-border-strong bg-bg px-2 py-2 text-sm text-text disabled:cursor-not-allowed disabled:opacity-50"
      >
        {DIFFICULTIES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!canAdd}
        className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent"
      >
        Add
      </button>

      {!canAdd && (
        <p id="quick-add-hint" className="w-full text-xs text-text-muted">
          New tasks can only start today or later. Past days only let you finish overdue tasks.
        </p>
      )}
    </form>
  );
}
