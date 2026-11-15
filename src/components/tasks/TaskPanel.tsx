import { Panel } from "../layout/Panel";
import { TaskRow } from "./TaskRow";
import { QuickAdd } from "./QuickAdd";
import { useVisibleTasks } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { formatDayRange } from "../../domain/dates";
import type { Task, TaskGroup as TaskGroupName } from "../../domain/types";

interface TaskGroupProps {
  group: TaskGroupName;
  heading: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: (group: TaskGroupName, collapsed: boolean) => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}

function TaskGroup({
  group,
  heading,
  tasks,
  collapsed,
  onToggle,
  onComplete,
  onDelete,
}: TaskGroupProps) {
  if (tasks.length === 0) return null;
  const listId = `task-group-${group}`;
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="mb-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={listId}
          onClick={() => onToggle(group, !collapsed)}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className={`inline-block transition-transform motion-reduce:transition-none ${collapsed ? "" : "rotate-90"}`}
          >
            ▸
          </span>
          <span>
            {heading} · {tasks.length}
          </span>
        </button>
      </h3>
      <ul id={listId} hidden={collapsed} className="flex flex-col gap-2">
        {tasks.map((task) => (
          // The database id is stable, so it is the right key (never the array index).
          <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}

export function TaskPanel() {
  // Select stable slices only. A selector that builds a new array (e.g. s.tasks.filter(...))
  // returns a different value every call and makes Zustand 5 loop forever. The filtered list
  // comes from a hook that derives it with useMemo (see store/selectors.ts).
  const tasks = useVisibleTasks();
  const selection = useAppStore((s) => s.selection);
  const error = useAppStore((s) => s.error);
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const collapsedGroups = useAppStore((s) => s.collapsedGroups);
  const setGroupCollapsed = useAppStore((s) => s.setGroupCollapsed);

  // Derived during render: no extra state to keep in sync.
  const active = tasks.filter((task) => task.status === "active");
  const done = tasks.filter((task) => task.status === "done");

  return (
    <Panel id="tasks-heading" title="Tasks">
      <QuickAdd />

      {error !== null && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {selection !== null && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-md bg-surface-raised px-3 py-2 text-sm">
          <span className="text-text-muted">
            Showing{" "}
            <span className="font-semibold text-text">
              {formatDayRange(selection.from, selection.to)}
            </span>
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md px-2 py-1 text-accent transition-colors hover:bg-surface"
          >
            Show all
          </button>
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-sm text-text-muted">
          {selection === null
            ? "No tasks yet. Add one above."
            : "No tasks for this selection."}
        </p>
      )}

      <TaskGroup
        group="active"
        heading="Active"
        tasks={active}
        collapsed={collapsedGroups.active}
        onToggle={setGroupCollapsed}
        onComplete={completeTask}
        onDelete={deleteTask}
      />
      <TaskGroup
        group="done"
        heading="Done"
        tasks={done}
        collapsed={collapsedGroups.done}
        onToggle={setGroupCollapsed}
        onComplete={completeTask}
        onDelete={deleteTask}
      />
    </Panel>
  );
}
