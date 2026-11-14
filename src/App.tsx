import { useEffect } from "react";
import { TitleBar } from "./components/layout/TitleBar";
import { CalendarPanel } from "./components/calendar/CalendarPanel";
import { TaskPanel } from "./components/tasks/TaskPanel";
import { CharacterPanel } from "./components/character/CharacterPanel";
import { useAppStore } from "./store/useAppStore";
import { useDayWatcher } from "./store/useDayWatcher";

export function App() {
  const startup = useAppStore((s) => s.startup);

  // The app can stay open for days in the tray; this moves it to the new day (and sweeps, reminds).
  useDayWatcher();

  // The one place the app loads its data: tasks, the overdue sweep, then progress. startup()
  // runs its steps once even though StrictMode calls this effect twice in development.
  useEffect(() => {
    void startup();
  }, [startup]);

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
