import type { Task } from "../../domain/types";

export interface TaskRowProps {
  task: Task;
  onComplete: (id: number) => void;
}

// Raw ISO dates for now; nicer formatting arrives with date-fns in Phase 3.
function dateLabel(task: Task): string {
  return task.startDate === task.endDate
    ? task.startDate
    : `${task.startDate} – ${task.endDate}`;
}

export function TaskRow({ task, onComplete }: TaskRowProps) {
  const isDone = task.status === "done";

  return (
    <li>
      {/* group-has-[:checked] lets the label text react to the checkbox with CSS only. */}
      <label className="group flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5 transition-colors hover:border-accent has-[:disabled]:cursor-default has-[:disabled]:hover:border-border">
        <input
          type="checkbox"
          checked={isDone}
          disabled={isDone}
          onChange={() => onComplete(task.id)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-accent disabled:cursor-default"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-text group-has-[:checked]:text-text-muted group-has-[:checked]:line-through">
            {task.title}
          </span>
          <span className="block text-xs text-text-muted">{dateLabel(task)}</span>
        </span>
      </label>
    </li>
  );
}
