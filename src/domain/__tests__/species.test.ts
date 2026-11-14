import { describe, expect, it } from "vitest";
import { isSpecies, SPECIES, SPECIES_LABEL } from "../species";

describe("isSpecies", () => {
  it("accepts every known pet", () => {
    for (const species of SPECIES) expect(isSpecies(species)).toBe(true);
  });

  it("rejects a string that is not a pet", () => {
    expect(isSpecies("dog")).toBe(false);
    expect(isSpecies("Monkey")).toBe(false); // case matters: stored values are exact
    expect(isSpecies(" cat")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSpecies("")).toBe(false);
  });

  it("rejects values that are not strings", () => {
    expect(isSpecies(null)).toBe(false);
    expect(isSpecies(undefined)).toBe(false);
    expect(isSpecies(1)).toBe(false);
    expect(isSpecies({})).toBe(false);
  });
});

describe("SPECIES_LABEL", () => {
  it("has a label for every pet", () => {
    for (const species of SPECIES) expect(SPECIES_LABEL[species].length).toBeGreaterThan(0);
  });

  it("names the two pets", () => {
    expect(SPECIES_LABEL.monkey).toBe("Monkey");
    expect(SPECIES_LABEL.cat).toBe("Cat");
  });
});
