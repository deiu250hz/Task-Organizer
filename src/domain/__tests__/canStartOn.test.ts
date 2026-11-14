import { describe, expect, it } from "vitest";
import { canStartOn } from "../tasks";

const TODAY = "2026-11-14";

describe("canStartOn", () => {
  it("allows today", () => {
    expect(canStartOn("2026-11-14", TODAY)).toBe(true);
  });

  it("allows any later day, across month and year boundaries", () => {
    expect(canStartOn("2026-11-15", TODAY)).toBe(true);
    expect(canStartOn("2026-12-01", TODAY)).toBe(true);
    expect(canStartOn("2027-01-01", TODAY)).toBe(true);
  });

  it("rejects yesterday and any earlier day", () => {
    expect(canStartOn("2026-11-13", TODAY)).toBe(false);
    expect(canStartOn("2026-10-31", TODAY)).toBe(false);
    expect(canStartOn("2025-12-31", TODAY)).toBe(false);
  });
});
