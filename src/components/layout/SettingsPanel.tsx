import { BackupSection, type BackupSectionProps } from "./BackupSection";

export type TestResult = "none" | "sent" | "failed";

export interface SettingsPanelProps {
  /** Links the gear button's aria-controls to this panel. */
  id: string;
  remindersEnabled: boolean;
  onRemindersChange: (enabled: boolean) => void;
  onTest: () => void;
  testResult: TestResult;
  backup: BackupSectionProps;
}

// Presentational: the parent owns the open state, the store actions and the results.
export function SettingsPanel({ id, remindersEnabled, onRemindersChange, onTest, testResult, backup }: SettingsPanelProps) {
  return (
    <div
      id={id}
      role="group"
      aria-label="Settings"
      className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-border bg-surface-raised p-3 shadow-lg"
    >
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={remindersEnabled}
          onChange={(event) => onRemindersChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <span>Remind me of tasks when the app starts or a new day begins</span>
      </label>
      <p className="ml-6 mt-1 text-xs text-text-muted">At most one reminder a day.</p>

      <button
        type="button"
        onClick={onTest}
        className="mt-3 rounded-md border border-border-strong px-3 py-1.5 text-xs text-text transition-colors hover:border-accent hover:text-accent"
      >
        Test reminder
      </button>
      <p role="status" className="mt-2 min-h-4 text-xs text-text-muted">
        {testResult === "sent" && "Reminder sent."}
        {testResult === "failed" &&
          "Could not show a notification. Check that notifications are allowed for this app in Windows settings."}
      </p>

      <BackupSection {...backup} />
    </div>
  );
}
