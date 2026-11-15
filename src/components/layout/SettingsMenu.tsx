import { useEffect, useId, useRef, useState } from "react";
import { useAppStore, type BackupResult } from "../../store/useAppStore";
import type { BackupMessage } from "./BackupSection";
import { SettingsPanel, type TestResult } from "./SettingsPanel";

// A gear-style button in the title bar that opens a small popover. Whether it is open, the
// result of the last test and of the last backup action are only this component's business, so
// they stay local state. The file waiting for confirmation lives in the store (it is the parsed backup).
export function SettingsMenu() {
  const remindersEnabled = useAppStore((s) => s.remindersEnabled);
  const setRemindersEnabled = useAppStore((s) => s.setRemindersEnabled);
  const sendTestReminder = useAppStore((s) => s.sendTestReminder);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const pendingImport = useAppStore((s) => s.pendingImport);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const prepareImport = useAppStore((s) => s.prepareImport);
  const confirmImport = useAppStore((s) => s.confirmImport);
  const cancelImport = useAppStore((s) => s.cancelImport);

  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>("none");
  const [busy, setBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<BackupMessage | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // While open: close on a press outside and on Escape (Escape also gives focus back to the gear).
  // The listeners are removed when it closes, when the component unmounts, and between StrictMode's runs.
  useEffect(() => {
    if (!open) return;
    // Closing the popover also drops a file that was waiting for confirmation: nothing is replaced
    // by accident because the player wandered off.
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) !== true) {
        setOpen(false);
        cancelImport();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        cancelImport();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, cancelImport]);

  const toggle = () => {
    if (open) cancelImport();
    setOpen((wasOpen) => !wasOpen);
    setTestResult("none"); // a stale "sent" message should not greet the next opening
    setBackupMessage(null);
  };

  const handleTest = async () => {
    setTestResult((await sendTestReminder()) ? "sent" : "failed");
  };

  // Runs one backup action: the buttons wait while it runs, then the result is shown. A cancelled
  // dialog is not an error and shows nothing.
  const runBackup = async (action: () => Promise<BackupResult>) => {
    setBusy(true);
    setBackupMessage(null);
    const result = await action();
    setBusy(false);
    if (result.kind === "done") setBackupMessage({ tone: "ok", text: result.message });
    else if (result.kind === "error") setBackupMessage({ tone: "error", text: result.message });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex h-8 w-11 items-center justify-center text-text-muted transition-colors hover:bg-surface-raised hover:text-text aria-expanded:bg-surface-raised aria-expanded:text-accent"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M1 3.5h12M1 7h12M1 10.5h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="4.5" cy="3.5" r="1.5" fill="currentColor" />
          <circle cx="9.5" cy="7" r="1.5" fill="currentColor" />
          <circle cx="5.5" cy="10.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <SettingsPanel
          id={panelId}
          remindersEnabled={remindersEnabled}
          onRemindersChange={(enabled) => void setRemindersEnabled(enabled)}
          onTest={() => void handleTest()}
          testResult={testResult}
          theme={theme}
          onThemeChange={(next) => void setTheme(next)}
          backup={{
            busy,
            message: backupMessage,
            pending: pendingImport === null ? null : { fileName: pendingImport.fileName, summary: pendingImport.summary },
            onExport: () => void runBackup(exportBackup),
            onImport: () => void runBackup(prepareImport),
            onConfirmImport: () => void runBackup(confirmImport),
            onCancelImport: () => {
              cancelImport();
              setBackupMessage(null);
            },
          }}
        />
      )}
    </div>
  );
}
