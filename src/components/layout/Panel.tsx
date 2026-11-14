import type { ReactNode } from "react";

export interface PanelProps {
  /** Visible heading; also names the region for screen readers. */
  title: string;
  /** Unique per panel; links the heading to the section via aria-labelledby. */
  id: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, id, children, className = "" }: PanelProps) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-h-0 flex-col rounded-panel border border-border bg-surface ${className}`}
    >
      <h2
        id={id}
        className="shrink-0 border-b border-border px-4 py-3 font-pixel text-sm font-bold uppercase tracking-wider text-text-muted"
      >
        {title}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}
