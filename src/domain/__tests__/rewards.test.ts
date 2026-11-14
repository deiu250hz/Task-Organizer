import { describe, expect, it } from "vitest";
import { rewardFor } from "../rewards";

describe("rewardFor", () => {
  it("returns the base reward with no streak", () => {
    expect(rewardFor(1, 0)).toEqual({ xp: 10, coins: 5 });
  });

  it("returns the right base reward for each difficulty", () => {
    expect(rewardFor(1, 0)).toEqual({ xp: 10, coins: 5 });
    expect(rewardFor(2, 0)).toEqual({ xp: 25, coins: 10 });
    expect(rewardFor(3, 0)).toEqual({ xp: 50, coins: 25 });
  });

  it("adds 10% XP per streak day", () => {
    expect(rewardFor(1, 1).xp).toBe(11);
    expect(rewardFor(1, 3).xp).toBe(13); // 0.1 * 3 would drift in floating point
    expect(rewardFor(3, 2).xp).toBe(60);
  });

  it("caps the XP bonus at 50%", () => {
    expect(rewardFor(3, 5).xp).toBe(75);
    expect(rewardFor(3, 6).xp).toBe(75);
    expect(rewardFor(3, 1000).xp).toBe(75);
  });

  it("does not give coins a streak bonus", () => {
    expect(rewardFor(2, 0).coins).toBe(10);
    expect(rewardFor(2, 4).coins).toBe(10);
    expect(rewardFor(3, 100).coins).toBe(25);
  });

  it("rounds XP half up", () => {
    expect(rewardFor(2, 1).xp).toBe(28); // 25 * 1.10 = 27.5
  });

  it("treats a negative or invalid streak as zero", () => {
    expect(rewardFor(2, -3)).toEqual({ xp: 25, coins: 10 });
    expect(rewardFor(2, Number.NaN)).toEqual({ xp: 25, coins: 10 });
  });
});
