import { backupDateLabel, type BackupSummary } from "../../domain/backup";

export interface BackupMessage {
  tone: "ok" | "error";
  text: string;
}

export interface BackupSectionProps {
  /** An export or import is running: the buttons wait. */
  busy: boolean;
  /** The result of the last action, or null. Hidden while a confirmation is showing. */
  message: BackupMessage | null;
  /** A valid file waiting for the player's confirmation, or null. */
  pending: { fileName: string; summary: BackupSummary } | null;
  onExport: () => void;
  onImport: () => void;
  onConfirmImport: () => void;
  onCancelImport: () => void;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const buttonClass =
  "rounded-md border border-border-strong px-3 py-1.5 text-xs text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong disabled:hover:text-text";

// Presentational: the parent owns the busy flag, the last result and the store actions.
export function BackupSection({ busy, message, pending, onExport, onImport, onConfirmImport, onCancelImport }: BackupSectionProps) {
  return (
    <section aria-labelledby="backup-heading" className="mt-3 border-t border-border pt-3">
      <h3 id="backup-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Backup
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Save your tasks, rewards and settings to a file, or restore them from one.
      </p>

      {pending === null ? (
        <>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onExport} disabled={busy} className={buttonClass}>
              Export backup
            </button>
            <button type="button" onClick={onImport} disabled={busy} className={buttonClass}>
              Import backup
            </button>
          </div>
          <p
            role="status"
            className={`mt-2 min-h-4 break-words text-xs ${message?.tone === "error" ? "text-danger" : "text-text-muted"}`}
          >
            {message?.text}
          </p>
        </>
      ) : (
        <div role="group" aria-label="Confirm import" className="mt-2 rounded-md border border-danger p-2.5">
          <p className="text-sm font-semibold text-text">Replace your data?</p>
          <p className="mt-1 break-words text-xs text-text-muted">
            {pending.fileName} was made on {backupDateLabel(pending.summary.exportedAt)} and has{" "}
            {count(pending.summary.tasks, "task", "tasks")} and{" "}
            {count(pending.summary.events, "reward entry", "reward entries")}. Everything you have now is replaced. A
            safety copy of your current data is saved first.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={busy}
              className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Replace everything
            </button>
            <button
              type="button"
              // Focus lands on the safe choice, so a stray Enter or Space cancels instead of replacing.
              autoFocus
              onClick={onCancelImport}
              disabled={busy}
              className={buttonClass}
            >
              Cancel
            </button>
          </div>
          <p role="status" className="mt-2 min-h-4 break-words text-xs text-danger">
            {message?.tone === "error" ? message.text : null}
          </p>
        </div>
      )}
    </section>
  );
}
