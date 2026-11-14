import { useState } from "react";
import { formatDayRange } from "../../domain/dates";
import { canDelete } from "../../domain/tasks";
import type { Task } from "../../domain/types";
import { DeleteControl } from "./DeleteControl";

export interface TaskRowProps {
  task: Task;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TaskRow({ task, onComplete, onDelete }: TaskRowProps) {
  const isDone = task.status === "done";
  // Only this row needs to know it is asking for confirmation, so it stays local state.
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="group flex items-center gap-1 rounded-md border border-border bg-surface-raised pr-2 transition-colors hover:border-accent has-[input:disabled]:hover:border-border">
      {/* The delete buttons sit BESIDE this label, not inside it: buttons nested in a label confuse
          screen readers. group-has-[:checked] lets the title react to the checkbox with CSS only. */}
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 has-[:disabled]:cursor-default">
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
          <span className="block text-xs text-text-muted">
            {formatDayRange(task.startDate, task.endDate)}
          </span>
        </span>
      </label>

      {canDelete(task) && (
        <DeleteControl
          taskTitle={task.title}
          confirming={confirming}
          onAsk={() => setConfirming(true)}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete(task.id);
          }}
        />
      )}
    </li>
  );
}
