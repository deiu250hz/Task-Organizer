import { describe, expect, it } from "vitest";
import { CharacterPanel } from "../character/CharacterPanel";
import { renderWith } from "./renderWithStore";

describe("CharacterPanel progress", () => {
  it("shows level 1 and an empty bar for an empty ledger", () => {
    const html = renderWith({}, <CharacterPanel />);
    expect(html).toContain("LVL 1");
    expect(html).toContain("0 / 100 XP");
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain("width:0%");
  });

  it("shows the level and the XP earned inside it", () => {
    // 150 XP = level 2 (100 XP spent on level 1) with 50 of the 283 XP needed.
    const html = renderWith({ totals: { xp: 150, coins: 0 } }, <CharacterPanel />);
    expect(html).toContain("LVL 2");
    expect(html).toContain("50 / 283 XP");
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('aria-valuemax="283"');
    expect(html).toContain("width:18%"); // 50 / 283 = 17.7%
  });

  it("starts a new level with an empty bar at an exact threshold", () => {
    const html = renderWith({ totals: { xp: 100, coins: 0 } }, <CharacterPanel />);
    expect(html).toContain("LVL 2");
    expect(html).toContain("0 / 283 XP");
    expect(html).toContain("width:0%");
  });

  it("shows coins and the streak", () => {
    const html = renderWith({ totals: { xp: 0, coins: 85 }, streak: 4 }, <CharacterPanel />);
    expect(html).toContain('text-coin">85<');
    expect(html).toContain('text-streak">4 d<');
  });
});
