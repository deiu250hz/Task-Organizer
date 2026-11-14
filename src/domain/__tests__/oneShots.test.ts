import { describe, expect, it } from "vitest";
import { oneShotsFor } from "../oneShots";

describe("oneShotsFor", () => {
  it("only celebrates when the level does not change", () => {
    expect(oneShotsFor(3, 3)).toEqual([{ kind: "celebrate" }]);
  });

  it("adds levelUp when the level rises inside a stage", () => {
    expect(oneShotsFor(1, 2)).toEqual([{ kind: "celebrate" }, { kind: "levelUp" }]);
    expect(oneShotsFor(5, 6)).toEqual([{ kind: "celebrate" }, { kind: "levelUp" }]);
  });

  it("evolves into stage 2 at level 5", () => {
    expect(oneShotsFor(4, 5)).toEqual([{ kind: "celebrate" }, { kind: "levelUp" }, { kind: "evolve", toStage: 2 }]);
  });

  it("evolves into stage 3 at level 10 and stage 4 at level 25", () => {
    const last = (shots: ReturnType<typeof oneShotsFor>) => shots[shots.length - 1];
    expect(last(oneShotsFor(9, 10))).toEqual({ kind: "evolve", toStage: 3 });
    expect(last(oneShotsFor(24, 25))).toEqual({ kind: "evolve", toStage: 4 });
  });

  it("plays one levelUp and one evolve straight to the new stage when several levels pass", () => {
    expect(oneShotsFor(4, 12)).toEqual([{ kind: "celebrate" }, { kind: "levelUp" }, { kind: "evolve", toStage: 3 }]);
  });

  it("keeps the fixed order: celebrate, levelUp, evolve", () => {
    expect(oneShotsFor(9, 10).map((shot) => shot.kind)).toEqual(["celebrate", "levelUp", "evolve"]);
  });

  it("never evolves when the level goes down or stays", () => {
    expect(oneShotsFor(10, 9).map((shot) => shot.kind)).toEqual(["celebrate"]);
    expect(oneShotsFor(10, 10).map((shot) => shot.kind)).toEqual(["celebrate"]);
  });
});
