import { THEME_LABEL, THEMES, type Theme } from "../../domain/themes";
import { BackupSection, type BackupSectionProps } from "./BackupSection";

export type TestResult = "none" | "sent" | "failed";

export interface SettingsPanelProps {
  /** Links the gear button's aria-controls to this panel. */
  id: string;
  remindersEnabled: boolean;
  onRemindersChange: (enabled: boolean) => void;
  onTest: () => void;
  testResult: TestResult;
  /** The theme in use now. */
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  backup: BackupSectionProps;
}

// Presentational: the parent owns the open state, the store actions and the results.
export function SettingsPanel({
  id,
  remindersEnabled,
  onRemindersChange,
  onTest,
  testResult,
  theme,
  onThemeChange,
  backup,
}: SettingsPanelProps) {
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

      <fieldset className="mt-3 min-w-0 border-t border-border pt-3">
        <legend className="float-left mb-2 w-full text-xs font-semibold uppercase tracking-wider text-text-muted">
          Theme
        </legend>
        <div className="grid clear-both grid-cols-2 gap-2">
          {THEMES.map((name) => (
            // The radios share one name, so the browser gives arrow-key navigation for free.
            // data-theme on the swatch makes bg-surface, bg-accent... show THAT theme's colours.
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-text transition-colors hover:border-border-strong has-checked:border-accent has-checked:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="theme"
                value={name}
                checked={theme === name}
                onChange={() => onThemeChange(name)}
                className="sr-only"
              />
              <span
                data-theme={name}
                aria-hidden="true"
                className="flex h-5 w-9 shrink-0 overflow-hidden rounded-sm border border-border-strong bg-bg"
              >
                <span className="h-full flex-1 bg-surface-raised" />
                <span className="h-full flex-1 bg-accent" />
                <span className="h-full flex-1 bg-xp" />
              </span>
              <span>{THEME_LABEL[name]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <BackupSection {...backup} />
    </div>
  );
}
