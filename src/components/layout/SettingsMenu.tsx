import { useEffect, useId, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { SettingsPanel, type TestResult } from "./SettingsPanel";

// A gear-style button in the title bar that opens a small popover. Whether it is open and the
// result of the last test are only this component's business, so they stay local state.
export function SettingsMenu() {
  const remindersEnabled = useAppStore((s) => s.remindersEnabled);
  const setRemindersEnabled = useAppStore((s) => s.setRemindersEnabled);
  const sendTestReminder = useAppStore((s) => s.sendTestReminder);

  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>("none");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // While open: close on a press outside and on Escape (Escape also gives focus back to the gear).
  // The listeners are removed when it closes, when the component unmounts, and between StrictMode's runs.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) !== true) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((wasOpen) => !wasOpen);
    setTestResult("none"); // a stale "sent" message should not greet the next opening
  };

  const handleTest = async () => {
    setTestResult((await sendTestReminder()) ? "sent" : "failed");
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
        />
      )}
    </div>
  );
}
