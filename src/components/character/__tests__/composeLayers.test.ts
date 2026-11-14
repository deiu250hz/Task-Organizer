import { describe, expect, it } from "vitest";
import { composeLayers } from "../composeLayers";

const blank = Array.from({ length: 32 }, () => ".".repeat(32));
const withPixel = (x: number, y: number, ch: string) =>
  blank.map((row, i) => (i === y ? row.slice(0, x) + ch + row.slice(x + 1) : row));

describe("composeLayers", () => {
  it("returns an empty 32x32 grid for no layers", () => {
    const out = composeLayers([]);
    expect(out).toHaveLength(32);
    expect(out.every((row) => row === ".".repeat(32))).toBe(true);
  });

  it("keeps a single layer as it is", () => {
    expect(composeLayers([withPixel(3, 4, "f")])).toEqual(withPixel(3, 4, "f"));
  });

  it("lets a later layer win where it has a pixel", () => {
    const out = composeLayers([withPixel(5, 5, "f"), withPixel(5, 5, "k")]);
    expect(out[5][5]).toBe("k");
  });

  it("lets the earlier layer show through where the later one is transparent", () => {
    const out = composeLayers([withPixel(5, 5, "f"), withPixel(9, 9, "k")]);
    expect(out[5][5]).toBe("f");
    expect(out[9][9]).toBe("k");
  });

  it("stacks three layers back to front", () => {
    const out = composeLayers([withPixel(1, 1, "a"), withPixel(1, 1, "b"), withPixel(1, 1, "c")]);
    expect(out[1][1]).toBe("c");
  });

  it("treats a short layer as transparent beyond its size", () => {
    const out = composeLayers([["ff"], withPixel(10, 10, "k")]);
    expect(out[0].slice(0, 3)).toBe("ff.");
    expect(out[10][10]).toBe("k");
    expect(out).toHaveLength(32);
  });
});
