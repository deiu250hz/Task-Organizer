import { describe, expect, it } from "vitest";
import { moodToShow, shouldReportEnd } from "../useCharacterMachine";

describe("moodToShow", () => {
  it("shows the current mood when nothing is playing", () => {
    expect(moodToShow(false, "idle", "happy")).toBe("happy");
  });

  it("keeps the old mood while a one-shot plays, so a mood change waits for the end", () => {
    expect(moodToShow(true, "sad", "happy")).toBe("sad");
  });
});

describe("shouldReportEnd", () => {
  const own = { animationName: "pet-shot-celebrate", isOwnTarget: true, oneShotId: 4, reportedId: null };

  it("reports the shot wrapper's own animation", () => {
    expect(shouldReportEnd(own)).toBe(true);
  });

  it("ignores an animation that ended on a child element", () => {
    expect(shouldReportEnd({ ...own, isOwnTarget: false })).toBe(false);
  });

  it("ignores loop and layer animations that are not one-shots", () => {
    expect(shouldReportEnd({ ...own, animationName: "pet-loop-idle" })).toBe(false);
    expect(shouldReportEnd({ ...own, animationName: "pet-evolve-in" })).toBe(false);
  });

  it("reports each queued shot only once", () => {
    expect(shouldReportEnd({ ...own, reportedId: 4 })).toBe(false);
    expect(shouldReportEnd({ ...own, reportedId: 3 })).toBe(true);
  });
});
