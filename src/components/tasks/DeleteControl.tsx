import type { KeyboardEvent } from "react";

export interface DeleteControlProps {
  /** The task's title, used to name the buttons for screen readers. */
  taskTitle: string;
  /** false: just the trash button. true: "Delete? Yes / No". */
  confirming: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Presentational: the parent owns the "confirming" state, so both states are easy to render and test.
export function DeleteControl({ taskTitle, confirming, onAsk, onConfirm, onCancel }: DeleteControlProps) {
  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={`Delete task: ${taskTitle}`}
        onClick={onAsk}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg hover:text-danger"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9h6.8L12 4M6.5 6.5v4.5M9.5 6.5v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onCancel();
  };

  return (
    <div
      role="group"
      aria-label={`Confirm deleting ${taskTitle}`}
      onKeyDown={handleKeyDown}
      className="flex shrink-0 items-center gap-1.5"
    >
      <span className="text-xs text-text-muted">Delete?</span>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-on-accent transition-colors hover:opacity-90"
      >
        Yes
      </button>
      <button
        type="button"
        // Focus lands on the safe choice, so a stray Enter or Space cancels instead of deleting.
        autoFocus
        onClick={onCancel}
        className="rounded-md border border-border px-2 py-1 text-xs text-text transition-colors hover:border-accent"
      >
        No
      </button>
    </div>
  );
}
