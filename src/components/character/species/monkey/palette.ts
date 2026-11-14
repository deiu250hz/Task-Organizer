import type { Palette } from "../types";

// Capuchin on the Chimp Cub colours. One palette for all four stages: stages change the
// silhouette and size, never the colours (CLAUDE.md, character art rules).
export const MONKEY_PALETTE: Palette = {
  o: "#2a1a12", // outline
  f: "#8a5a36", // fur
  d: "#6a4026", // dark fur (cap, tail, ears)
  l: "#b98253", // light fur (belly highlight)
  s: "#efc89a", // face skin
  t: "#d49f6e", // face shade (muzzle)
  c: "#efc89a", // tan (bib, hands, tail tip)
  k: "#1a120e", // eye dark
  w: "#ffffff", // white (eye shine, teeth, z)
  n: "#7a3b2e", // nose
  m: "#c4574a", // mouth
  b: "#6ec1e4", // tear
  g: "#c9ccd1", // silver
};
