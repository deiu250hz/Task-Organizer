import { TitleBar } from "./components/layout/TitleBar";
import { CalendarPanel } from "./components/calendar/CalendarPanel";
import { TaskPanel } from "./components/tasks/TaskPanel";
import { CharacterPanel } from "./components/character/CharacterPanel";

export function App() {
  return (
    <div className="flex h-full flex-col">
      <TitleBar title="Tasks Organizer" />
      {/* Three columns: calendar 280px, tasks flexible, character 300px. */}
      <main className="grid min-h-0 flex-1 grid-cols-[280px_1fr_300px] gap-3 p-3">
        <CalendarPanel />
        <TaskPanel />
        <CharacterPanel />
      </main>
    </div>
  );
}
