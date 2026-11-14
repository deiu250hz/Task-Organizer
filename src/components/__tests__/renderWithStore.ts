import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppStore } from "../../store/useAppStore";

type StoreState = ReturnType<typeof useAppStore.getState>;

// Server rendering (renderToStaticMarkup) reads Zustand's INITIAL snapshot and ignores later
// setState calls, so the state to render is written into that snapshot for one render and
// then restored. Actions are covered by the store tests; component tests only check what the
// components draw for a given state.
export function renderWith(partial: Partial<StoreState>, ui: ReactElement): string {
  const initial = useAppStore.getInitialState();
  const saved = { ...initial };
  Object.assign(
    initial,
    {
      tasks: [],
      selection: null,
      today: "2026-11-14",
      totals: { xp: 0, coins: 0 },
      streak: 0,
      lastCompletionAt: null,
      oneShots: [],
      displayStage: 1,
      error: null,
    },
    partial,
  );
  try {
    return renderToStaticMarkup(ui);
  } finally {
    Object.assign(initial, saved);
  }
}
