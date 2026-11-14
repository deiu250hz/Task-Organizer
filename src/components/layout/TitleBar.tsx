import { getCurrentWindow } from "@tauri-apps/api/window";

export interface TitleBarProps {
  title: string;
}

type WindowAction = "minimize" | "toggleMaximize" | "close";

async function runWindowAction(action: WindowAction): Promise<void> {
  try {
    await getCurrentWindow()[action]();
  } catch {
    // Not running inside Tauri (plain `npm run dev` in a browser): nothing to control.
  }
}

const buttonClass =
  "flex h-8 w-11 items-center justify-center text-text-muted transition-colors hover:bg-surface-raised hover:text-text";

export function TitleBar({ title }: TitleBarProps) {
  return (
    <header
      data-tauri-drag-region
      className="flex h-8 shrink-0 select-none items-center justify-between border-b border-border bg-surface pl-3"
    >
      {/* The attribute only applies to the element it is on, not its children. */}
      <span
        data-tauri-drag-region
        className="font-pixel text-sm font-bold text-accent"
      >
        {title}
      </span>

      <div className="flex">
        <button
          type="button"
          aria-label="Minimize window"
          className={buttonClass}
          onClick={() => void runWindowAction("minimize")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="0" y="5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Maximize or restore window"
          className={buttonClass}
          onClick={() => void runWindowAction("toggleMaximize")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Close window"
          className="flex h-8 w-11 items-center justify-center text-text-muted transition-colors hover:bg-danger hover:text-on-accent"
          onClick={() => void runWindowAction("close")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 0L10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
