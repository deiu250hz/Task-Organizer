import { Panel } from "../layout/Panel";
import { TaskRow } from "./TaskRow";
import { MOCK_TASKS, type MockTask } from "../../mock/mockData";

interface TaskGroupProps {
  heading: string;
  tasks: MockTask[];
}

function TaskGroup({ heading, tasks }: TaskGroupProps) {
  if (tasks.length === 0) return null;
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {heading}
      </h3>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
}

export function TaskPanel() {
  const active = MOCK_TASKS.filter((t) => t.status === "overdue" || t.status === "today");
  const done = MOCK_TASKS.filter((t) => t.status === "done");
  const upcoming = MOCK_TASKS.filter((t) => t.status === "upcoming");

  return (
    <Panel id="tasks-heading" title="Tasks">
      <TaskGroup heading="Active" tasks={active} />
      <TaskGroup heading="Upcoming" tasks={upcoming} />
      <TaskGroup heading="Done today" tasks={done} />
    </Panel>
  );
}
