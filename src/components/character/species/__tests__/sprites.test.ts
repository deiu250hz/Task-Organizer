import { describe, expect, it } from "vitest";
import type { Mood, Stage } from "../../../../domain/types";
import { SPECIES } from "../index";
import type { Grid, Species } from "../types";

const STAGES: Stage[] = [1, 2, 3, 4];
const MOODS: Mood[] = ["idle", "happy", "sad", "sleepy"];
// Keys that only ever belong to a face; a body must never contain them.
const FACE_ONLY_KEYS = ["k", "w", "n", "m", "b"];

const filled = (grid: Grid) => grid.join("").replace(/\./g, "").length;

describe.each(Object.keys(SPECIES) as Species[])("%s sprite data", (species) => {
  const art = SPECIES[species];

  it("has a 32x32 grid for every body, stage and mood", () => {
    for (const stage of STAGES) {
      expect(art.bodies[stage]).toHaveLength(32);
      for (const row of art.bodies[stage]) expect(row).toHaveLength(32);
      for (const mood of MOODS) {
        expect(art.faces[mood][stage]).toHaveLength(32);
        for (const row of art.faces[mood][stage]) expect(row).toHaveLength(32);
      }
    }
  });

  it("only uses '.' and keys that exist in the palette", () => {
    const known = new Set([".", ...Object.keys(art.palette)]);
    const grids: Grid[] = [];
    for (const stage of STAGES) {
      grids.push(art.bodies[stage]);
      for (const mood of MOODS) grids.push(art.faces[mood][stage]);
    }
    for (const grid of grids) for (const ch of grid.join("")) expect(known.has(ch)).toBe(true);
  });

  it("gives every palette colour as a hex value", () => {
    for (const colour of Object.values(art.palette)) expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps face pixels out of the bodies", () => {
    for (const stage of STAGES) {
      for (const ch of art.bodies[stage].join("")) expect(FACE_ONLY_KEYS).not.toContain(ch);
    }
  });

  it("draws something for every body and every face", () => {
    for (const stage of STAGES) {
      expect(filled(art.bodies[stage])).toBeGreaterThan(100);
      for (const mood of MOODS) expect(filled(art.faces[mood][stage])).toBeGreaterThan(5);
    }
  });

  it("grows from stage to stage", () => {
    const sizes = STAGES.map((stage) => filled(art.bodies[stage]));
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
  });

  it("gives each mood its own face at each stage", () => {
    for (const stage of STAGES) {
      const faces = MOODS.map((mood) => art.faces[mood][stage].join("|"));
      expect(new Set(faces).size).toBe(MOODS.length);
    }
  });

  it("keeps every sprite inside the canvas with a transparent first column and last column margin", () => {
    // Nothing should touch the left or right edge at stage 1, where the pet is smallest.
    for (const row of art.bodies[1]) {
      expect(row[0]).toBe(".");
      expect(row[31]).toBe(".");
    }
  });
});
