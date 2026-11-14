import type { MockTask } from "../../mock/mockData";

export interface TaskRowProps {
  task: MockTask;
}

export function TaskRow({ task }: TaskRowProps) {
  const isOverdue = task.status === "overdue";

  return (
    <li>
      {/* group-has-[:checked] lets the label text react to the checkbox with CSS only. */}
      <label className="group flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5 transition-colors hover:border-accent">
        <input
          type="checkbox"
          defaultChecked={task.status === "done"}
          className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-text group-has-[:checked]:text-text-muted group-has-[:checked]:line-through">
            {task.title}
          </span>
          <span
            className={`block text-xs ${isOverdue ? "font-semibold text-danger" : "text-text-muted"}`}
          >
            {task.dateLabel}
          </span>
        </span>
        <span
          aria-label="Reward"
          className="shrink-0 font-pixel text-xs text-xp"
        >
          +10 XP
        </span>
      </label>
    </li>
  );
}
