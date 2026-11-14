import type { Palette } from "../types";

// Orange Tabby. One palette for all four stages: stages only get bigger and gain details,
// the colours never change (CLAUDE.md, character art rules).
export const CAT_PALETTE: Palette = {
  o: "#5a2a10", // outline
  f: "#f0902a", // orange fur
  d: "#c8631a", // darker orange (stripes, tail bands)
  l: "#ffc27a", // light orange (muzzle, eye patches)
  c: "#fff0dc", // cream (chest, paws, tail tip)
  k: "#17100c", // eye black, whisker lines
  w: "#ffffff", // white (eye shine)
  n: "#f08a9a", // nose
  p: "#f6a0b0", // pink (inner ears, blush)
  m: "#7a3b2a", // mouth
  b: "#6ec1e4", // tear
  v: "#e0507a", // collar
  y: "#ffd24a", // bell, bow knot
};
