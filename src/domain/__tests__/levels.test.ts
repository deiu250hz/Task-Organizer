import { describe, expect, it } from "vitest";
import { levelFromXp, stageForLevel, xpForLevel } from "../levels";

describe("xpForLevel", () => {
  it("follows round(100 * level^1.5)", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(283);
    expect(xpForLevel(3)).toBe(520);
    expect(xpForLevel(4)).toBe(800);
    expect(xpForLevel(5)).toBe(1118);
  });

  it("treats levels below 1 and NaN as level 1", () => {
    expect(xpForLevel(0)).toBe(100);
    expect(xpForLevel(-5)).toBe(100);
    expect(xpForLevel(Number.NaN)).toBe(100);
  });
});

describe("levelFromXp", () => {
  it("handles 0 XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, needed: 100 });
  });

  it("stays on the level one XP below a threshold", () => {
    expect(levelFromXp(99)).toEqual({ level: 1, intoLevel: 99, needed: 100 });
  });

  it("moves up exactly at a threshold with nothing left over", () => {
    expect(levelFromXp(100)).toEqual({ level: 2, intoLevel: 0, needed: 283 });
  });

  it("keeps the leftover XP just past a threshold", () => {
    expect(levelFromXp(101)).toEqual({ level: 2, intoLevel: 1, needed: 283 });
  });

  it("works several levels deep, using the cumulative cost", () => {
    // Cumulative XP to reach level 3, 4, 5: 100+283, +520, +800.
    expect(levelFromXp(382)).toEqual({ level: 2, intoLevel: 282, needed: 283 });
    expect(levelFromXp(383)).toEqual({ level: 3, intoLevel: 0, needed: 520 });
    expect(levelFromXp(903)).toEqual({ level: 4, intoLevel: 0, needed: 800 });
    expect(levelFromXp(1703)).toEqual({ level: 5, intoLevel: 0, needed: 1118 });
  });

  it("always splits XP into whole levels plus leftover", () => {
    for (let xp = 0; xp <= 20000; xp += 37) {
      const { level, intoLevel, needed } = levelFromXp(xp);
      let spent = 0;
      for (let l = 1; l < level; l += 1) spent += xpForLevel(l);
      expect(spent + intoLevel).toBe(xp);
      expect(intoLevel).toBeGreaterThanOrEqual(0);
      expect(intoLevel).toBeLessThan(needed);
    }
  });

  it("finishes for very large XP", () => {
    for (const xp of [1e12, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY]) {
      const { level, intoLevel, needed } = levelFromXp(xp);
      expect(level).toBeGreaterThan(1000);
      expect(intoLevel).toBeGreaterThanOrEqual(0);
      expect(intoLevel).toBeLessThan(needed);
    }
  });

  it("treats negative and NaN XP as 0 and floors fractions", () => {
    expect(levelFromXp(-50)).toEqual({ level: 1, intoLevel: 0, needed: 100 });
    expect(levelFromXp(Number.NEGATIVE_INFINITY)).toEqual({ level: 1, intoLevel: 0, needed: 100 });
    expect(levelFromXp(Number.NaN)).toEqual({ level: 1, intoLevel: 0, needed: 100 });
    expect(levelFromXp(99.9)).toEqual({ level: 1, intoLevel: 99, needed: 100 });
  });
});

describe("stageForLevel", () => {
  it("stays at stage 1 below level 5", () => {
    expect(stageForLevel(1)).toBe(1);
    expect(stageForLevel(4)).toBe(1);
    expect(stageForLevel(0)).toBe(1);
  });

  it("changes at levels 5, 10 and 25", () => {
    expect(stageForLevel(5)).toBe(2);
    expect(stageForLevel(9)).toBe(2);
    expect(stageForLevel(10)).toBe(3);
    expect(stageForLevel(24)).toBe(3);
    expect(stageForLevel(25)).toBe(4);
    expect(stageForLevel(500)).toBe(4);
  });
});
