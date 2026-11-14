import { GRID_SIZE, type Grid } from "./species/types";

/**
 * Stacks sprite layers into one grid, back to front: a later layer's pixel wins wherever it is
 * not '.' (transparent). Used for body + face now and for held item, glasses and hat later
 * (CLAUDE.md layer order). One merged grid means fewer <rect>s than drawing each layer.
 */
export function composeLayers(layers: readonly Grid[]): Grid {
  const rows: string[] = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    let row = "";
    for (let x = 0; x < GRID_SIZE; x += 1) {
      let pixel = ".";
      for (const layer of layers) {
        const candidate = layer[y]?.[x] ?? ".";
        if (candidate !== ".") pixel = candidate;
      }
      row += pixel;
    }
    rows.push(row);
  }
  return rows;
}
