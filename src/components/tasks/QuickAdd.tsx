import { useState, type FormEvent } from "react";
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

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(1);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    const created = await addTask({
      title,
      startDate: today,
      endDate: today,
      difficulty,
    });
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
        placeholder="Add a task for today…"
        className="min-w-40 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted"
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
        className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-text"
      >
        {DIFFICULTIES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Add
      </button>
    </form>
  );
}
