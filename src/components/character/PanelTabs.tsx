import type { KeyboardEvent } from "react";

export type PanelTab = "stats" | "shop";

const TABS: readonly { id: PanelTab; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "shop", label: "Shop" },
];

/** The id of the content area the tabs control, so each tab can point at it with aria-controls. */
export const PET_TABPANEL_ID = "pet-tabpanel";

export const petTabId = (tab: PanelTab): string => `pet-tab-${tab}`;

export interface PanelTabsProps {
  active: PanelTab;
  onChange: (tab: PanelTab) => void;
}

// Presentational: the parent owns which tab is active. Follows the ARIA tabs pattern: only the active
// tab is in the Tab order, and the arrow keys move between tabs.
export function PanelTabs({ active, onChange }: PanelTabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: PanelTab = active === "stats" ? "shop" : "stats"; // two tabs: either arrow goes to the other
    onChange(next);
    document.getElementById(petTabId(next))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Pet panel"
      onKeyDown={handleKeyDown}
      className="mt-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-bg p-1"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={petTabId(tab.id)}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={PET_TABPANEL_ID}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className="rounded px-2 py-1.5 font-pixel text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:text-text aria-selected:bg-surface-raised aria-selected:text-accent"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
