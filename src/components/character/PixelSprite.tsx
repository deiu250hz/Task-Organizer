import { useMemo } from "react";
import type { Grid, Palette } from "./species/types";

export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  fill: string;
}

/**
 * Turns a grid into the fewest rectangles that draw it: a horizontal run of one colour becomes
 * one <rect>, one pixel tall. A 32x32 sprite ends up with a couple of hundred rects, not 1024.
 * A key with no palette colour is skipped rather than drawn in a wrong colour.
 */
export function spriteRects(grid: Grid, palette: Palette): SpriteRect[] {
  const rects: SpriteRect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x;
      while (end + 1 < row.length && row[end + 1] === key) end += 1;
      const fill = key === "." ? undefined : palette[key];
      if (fill !== undefined) rects.push({ x, y, width: end - x + 1, fill });
      x = end + 1;
    }
  });
  return rects;
}

export interface PixelSpriteProps {
  grid: Grid;
  palette: Palette;
  /**
   * Width in CSS pixels; the height follows the grid's shape (a square grid is drawn square).
   * Use a multiple of the grid's width so every sprite pixel is a whole number of screen pixels:
   * a multiple of 32 for the pets, of 12 for the laptop icon, and so on.
   */
  size: number;
}

export function PixelSprite({ grid, palette, size }: PixelSpriteProps) {
  const rects = useMemo(() => spriteRects(grid, palette), [grid, palette]);
  // The grid can be any size (pets are 32x32, shop icons are small), so the viewBox follows it.
  const columns = Math.max(1, ...grid.map((row) => row.length));
  const rows = Math.max(1, grid.length);
  return (
    <svg
      width={size}
      height={(size * rows) / columns}
      viewBox={`0 0 ${columns} ${rows}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects.map((rect) => (
        <rect key={`${rect.x}-${rect.y}`} x={rect.x} y={rect.y} width={rect.width} height={1} fill={rect.fill} />
      ))}
    </svg>
  );
}
