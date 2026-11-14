import { useEffect } from "react";
import { Panel } from "../layout/Panel";
import { usePlayerProgress } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface StatTileProps {
  label: string;
  value: string;
  valueClass: string;
}

function StatTile({ label, value, valueClass }: StatTileProps) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`font-pixel text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function CharacterPanel() {
  // Level, XP, coins and streak are derived from the ledger totals held in the store.
  const { level, intoLevel, needed, coins, streak } = usePlayerProgress();
  const loadProgress = useAppStore((s) => s.loadProgress);

  // Load once on startup. Action functions keep the same identity, so this does not re-run.
  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const percent = Math.round((intoLevel / needed) * 100); // needed is always at least 100

  return (
    <Panel id="character-heading" title="Monkey">
      {/* Placeholder stage: the pixel-art monkey replaces this box in Phase 5. */}
      <div
        role="img"
        aria-label="Monkey character placeholder"
        className="mx-auto flex h-40 w-40 items-center justify-center rounded-panel border-2 border-dashed border-border bg-bg font-pixel text-xs text-text-muted"
      >
        monkey here
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="rounded-md bg-accent px-2 py-0.5 font-pixel text-sm font-bold text-on-accent">
          LVL {level}
        </span>
        <span className="font-pixel text-xs text-text-muted">
          {intoLevel} / {needed} XP
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Experience"
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={intoLevel}
        aria-valuetext={`${intoLevel} of ${needed} XP`}
        className="mt-2 h-3 overflow-hidden rounded-full border border-border bg-bg"
      >
        {/* The width animates; the global reduced-motion rule in index.css turns that off. */}
        <div
          className="h-full bg-xp transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile label="Coins" value={String(coins)} valueClass="text-coin" />
        <StatTile label="Streak" value={`${streak} d`} valueClass="text-streak" />
      </div>
    </Panel>
  );
}
