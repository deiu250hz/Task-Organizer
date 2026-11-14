import { describe, expect, it } from "vitest";
import { QuickAdd } from "../tasks/QuickAdd";
import { renderWith } from "./renderWithStore";

const TODAY = "2026-11-14";
const HINT = "New tasks can only start today or later";

// Number of form controls that are disabled in the markup (input, select, button).
const disabledControls = (html: string) => (html.match(/disabled=""/g) ?? []).length;

describe("QuickAdd and the read-only past", () => {
  it("is enabled when nothing is selected (new tasks go to today)", () => {
    const html = renderWith({ today: TODAY }, <QuickAdd />);
    expect(disabledControls(html)).toBe(0);
    expect(html).not.toContain(HINT);
    expect(html).toContain("Add a task for today…");
  });

  it("is enabled when today is selected", () => {
    const html = renderWith({ today: TODAY, selection: { from: TODAY, to: TODAY } }, <QuickAdd />);
    expect(disabledControls(html)).toBe(0);
  });

  it("is enabled for a future day and names the range", () => {
    const html = renderWith({ today: TODAY, selection: { from: "2026-11-16", to: "2026-11-18" } }, <QuickAdd />);
    expect(disabledControls(html)).toBe(0);
    expect(html).toContain("Add a task for 16 – 18 Nov…");
  });

  it("is disabled, with a hint, when a past day is selected", () => {
    const html = renderWith({ today: TODAY, selection: { from: "2026-11-12", to: "2026-11-12" } }, <QuickAdd />);
    expect(disabledControls(html)).toBe(3);
    expect(html).toContain(HINT);
    expect(html).toContain("Past days only let you finish overdue tasks.");
  });

  it("is disabled for a range that starts in the past, even if it ends today or later", () => {
    const html = renderWith({ today: TODAY, selection: { from: "2026-11-13", to: "2026-11-16" } }, <QuickAdd />);
    expect(disabledControls(html)).toBe(3);
    expect(html).toContain(HINT);
  });

  it("links the input to the hint for screen readers when disabled", () => {
    const html = renderWith({ today: TODAY, selection: { from: "2026-11-12", to: "2026-11-12" } }, <QuickAdd />);
    expect(html).toContain('aria-describedby="quick-add-hint"');
    expect(html).toContain('id="quick-add-hint"');
  });
});
