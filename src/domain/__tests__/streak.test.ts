import { describe, expect, it } from "vitest";
import { streakFrom } from "../streak";

const TODAY = "2026-11-14";

describe("streakFrom", () => {
  it("is 0 with no active days", () => {
    expect(streakFrom([], TODAY)).toBe(0);
  });

  it("counts today alone as 1", () => {
    expect(streakFrom(["2026-11-14"], TODAY)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    expect(streakFrom(["2026-11-14", "2026-11-13", "2026-11-12"], TODAY)).toBe(3);
  });

  it("counts back from yesterday when today has nothing yet", () => {
    expect(streakFrom(["2026-11-13", "2026-11-12"], TODAY)).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(streakFrom(["2026-11-14", "2026-11-13", "2026-11-11", "2026-11-10"], TODAY)).toBe(2);
  });

  it("is 0 when the latest active day is older than yesterday", () => {
    expect(streakFrom(["2026-11-12", "2026-11-11"], TODAY)).toBe(0);
  });

  it("ignores duplicates and ordering", () => {
    expect(streakFrom(["2026-11-12", "2026-11-14", "2026-11-13", "2026-11-14"], TODAY)).toBe(3);
  });

  it("ignores days after today", () => {
    expect(streakFrom(["2026-11-16", "2026-11-15", "2026-11-14", "2026-11-13"], TODAY)).toBe(2);
    expect(streakFrom(["2026-11-16", "2026-11-15"], TODAY)).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(streakFrom(["2026-12-01", "2026-11-30", "2026-11-29"], "2026-12-01")).toBe(3);
    expect(streakFrom(["2027-01-01", "2026-12-31"], "2027-01-01")).toBe(2);
  });

  it("steps over daylight-saving changes", () => {
    expect(streakFrom(["2026-10-26", "2026-10-25", "2026-10-24"], "2026-10-26")).toBe(3); // EU clocks back
    expect(streakFrom(["2026-11-02", "2026-11-01", "2026-10-31"], "2026-11-02")).toBe(3); // US clocks back
    expect(streakFrom(["2026-03-30", "2026-03-29", "2026-03-28"], "2026-03-30")).toBe(3); // EU clocks forward
  });

  it("counts a long unbroken run", () => {
    const days: string[] = [];
    let day = new Date(2026, 10, 14);
    for (let i = 0; i < 400; i += 1) {
      days.push(
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      );
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
    }
    expect(streakFrom(days, TODAY)).toBe(400);
  });
});
