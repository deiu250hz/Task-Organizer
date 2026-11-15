import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, isTheme, THEME_LABEL, THEMES } from "../themes";

describe("isTheme", () => {
  it("accepts every known theme", () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
  });

  it("rejects unknown names, empty strings and non-strings", () => {
    expect(isTheme("neon")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme("Dusk")).toBe(false); // names are case-sensitive
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });
});

describe("themes", () => {
  it("has a label for every theme, and the default is one of them", () => {
    for (const theme of THEMES) expect(THEME_LABEL[theme].length).toBeGreaterThan(0);
    expect(isTheme(DEFAULT_THEME)).toBe(true);
  });
});
