import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelSprite, spriteRects } from "../PixelSprite";

const palette = { f: "#8a5a36", k: "#1a120e" };

describe("spriteRects", () => {
  it("merges a horizontal run of one colour into one rect", () => {
    expect(spriteRects(["..fff..."], palette)).toEqual([{ x: 2, y: 0, width: 3, fill: "#8a5a36" }]);
  });

  it("starts a new rect when the colour changes", () => {
    expect(spriteRects(["ffkk"], palette)).toEqual([
      { x: 0, y: 0, width: 2, fill: "#8a5a36" },
      { x: 2, y: 0, width: 2, fill: "#1a120e" },
    ]);
  });

  it("starts a new rect after a gap of transparent pixels", () => {
    expect(spriteRects(["f..f"], palette)).toHaveLength(2);
  });

  it("does not merge runs across rows", () => {
    expect(spriteRects(["ff", "ff"], palette)).toEqual([
      { x: 0, y: 0, width: 2, fill: "#8a5a36" },
      { x: 0, y: 1, width: 2, fill: "#8a5a36" },
    ]);
  });

  it("draws nothing for transparent pixels", () => {
    expect(spriteRects(["....", "...."], palette)).toEqual([]);
  });

  it("skips a key that has no colour in the palette", () => {
    expect(spriteRects(["xff"], palette)).toEqual([{ x: 1, y: 0, width: 2, fill: "#8a5a36" }]);
  });
});

describe("PixelSprite", () => {
  const grid = Array.from({ length: 32 }, (_, y) => (y === 0 ? "ff" + ".".repeat(30) : ".".repeat(32)));

  it("renders a crisp square svg at the requested size", () => {
    const html = renderToStaticMarkup(<PixelSprite grid={grid} palette={palette} size={192} />);
    expect(html).toContain('width="192"');
    expect(html).toContain('height="192"');
    expect(html).toContain('viewBox="0 0 32 32"');
    expect(html).toContain('shape-rendering="crispEdges"');
  });

  it("draws one rect per run", () => {
    const html = renderToStaticMarkup(<PixelSprite grid={grid} palette={palette} size={64} />);
    expect(html.match(/<rect /g)).toHaveLength(1);
    expect(html).toContain('fill="#8a5a36"');
  });

  it("is hidden from screen readers, because the Character names the picture", () => {
    expect(renderToStaticMarkup(<PixelSprite grid={grid} palette={palette} size={64} />)).toContain('aria-hidden="true"');
  });
});
