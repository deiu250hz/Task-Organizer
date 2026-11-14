import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../useAppStore";

// The store is a module-level singleton, so reset the slice under test before each case.
beforeEach(() => {
  useAppStore.setState({ selection: null });
});

describe("selection actions", () => {
  it("selectDay sets a one-day range", () => {
    useAppStore.getState().selectDay("2026-11-17");
    expect(useAppStore.getState().selection).toEqual({ from: "2026-11-17", to: "2026-11-17" });
  });

  it("selectRange keeps the order when from <= to", () => {
    useAppStore.getState().selectRange("2026-11-16", "2026-11-18");
    expect(useAppStore.getState().selection).toEqual({ from: "2026-11-16", to: "2026-11-18" });
  });

  it("selectRange normalizes reversed dates", () => {
    useAppStore.getState().selectRange("2026-11-18", "2026-11-16");
    expect(useAppStore.getState().selection).toEqual({ from: "2026-11-16", to: "2026-11-18" });
  });

  it("selectRange accepts the same day twice", () => {
    useAppStore.getState().selectRange("2026-11-16", "2026-11-16");
    expect(useAppStore.getState().selection).toEqual({ from: "2026-11-16", to: "2026-11-16" });
  });

  it("clearSelection returns to null", () => {
    useAppStore.getState().selectDay("2026-11-17");
    useAppStore.getState().clearSelection();
    expect(useAppStore.getState().selection).toBeNull();
  });

  it("a new selection replaces the old one instead of mutating it", () => {
    useAppStore.getState().selectRange("2026-11-16", "2026-11-18");
    const first = useAppStore.getState().selection;
    useAppStore.getState().selectRange("2026-11-20", "2026-11-22");
    expect(first).toEqual({ from: "2026-11-16", to: "2026-11-18" });
    expect(useAppStore.getState().selection).not.toBe(first);
  });
});
