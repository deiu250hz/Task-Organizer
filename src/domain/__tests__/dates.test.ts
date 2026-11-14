import { describe, expect, it } from "vitest";
import { addDays, formatDayRange, isBetween, rangesOverlap, toISODate } from "../dates";

describe("toISODate", () => {
  it("pads single-digit months and days", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses the local day just after midnight", () => {
    // toISOString() would give the previous day in time zones ahead of UTC.
    expect(toISODate(new Date(2026, 10, 13, 0, 30))).toBe("2026-11-13");
  });

  it("uses the local day just before midnight", () => {
    expect(toISODate(new Date(2026, 10, 13, 23, 30))).toBe("2026-11-13");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 is not a leap year
  });

  it("steps correctly over the daylight-saving changes", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25"); // EU clocks go back on 25 Oct
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02"); // US clocks go back on 1 Nov
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // EU clocks go forward on 29 Mar
  });

  it("accepts negative n and zero", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-13", 0)).toBe("2026-11-13");
  });
});

describe("isBetween", () => {
  it("includes both endpoints", () => {
    expect(isBetween("2026-11-16", "2026-11-16", "2026-11-18")).toBe(true);
    expect(isBetween("2026-11-18", "2026-11-16", "2026-11-18")).toBe(true);
  });

  it("is true inside the range", () => {
    expect(isBetween("2026-11-17", "2026-11-16", "2026-11-18")).toBe(true);
  });

  it("is false before and after the range", () => {
    expect(isBetween("2026-11-15", "2026-11-16", "2026-11-18")).toBe(false);
    expect(isBetween("2026-11-19", "2026-11-16", "2026-11-18")).toBe(false);
  });

  it("compares across month and year boundaries", () => {
    expect(isBetween("2026-12-01", "2026-11-30", "2027-01-02")).toBe(true);
    expect(isBetween("2027-01-03", "2026-11-30", "2027-01-02")).toBe(false);
  });
});

describe("rangesOverlap", () => {
  it("detects ranges that touch on a single day", () => {
    expect(rangesOverlap("2026-11-16", "2026-11-18", "2026-11-18", "2026-11-20")).toBe(true);
    expect(rangesOverlap("2026-11-18", "2026-11-20", "2026-11-16", "2026-11-18")).toBe(true);
  });

  it("detects one range inside another", () => {
    expect(rangesOverlap("2026-11-01", "2026-11-30", "2026-11-16", "2026-11-18")).toBe(true);
    expect(rangesOverlap("2026-11-16", "2026-11-18", "2026-11-01", "2026-11-30")).toBe(true);
  });

  it("is false for disjoint ranges", () => {
    expect(rangesOverlap("2026-11-16", "2026-11-18", "2026-11-19", "2026-11-20")).toBe(false);
    expect(rangesOverlap("2026-11-19", "2026-11-20", "2026-11-16", "2026-11-18")).toBe(false);
  });
});

describe("formatDayRange", () => {
  it("shows a single day", () => {
    expect(formatDayRange("2026-11-16", "2026-11-16")).toBe("16 Nov");
  });

  it("collapses the month when the range stays inside it", () => {
    expect(formatDayRange("2026-11-16", "2026-11-18")).toBe("16 – 18 Nov");
  });

  it("shows both months when the range crosses a month", () => {
    expect(formatDayRange("2026-11-30", "2026-12-02")).toBe("30 Nov – 2 Dec");
  });

  it("shows the years when the range crosses a year", () => {
    expect(formatDayRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});
