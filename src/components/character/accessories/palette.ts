import type { Palette } from "../species/types";

// Accessory colours. Every key is UPPERCASE and every pet palette key is lowercase, so the two can
// be merged into one palette for one SVG without ever clashing. Accessories look the same on every pet.
export const ACCESSORY_PALETTE: Palette = {
  // laptop and round glasses
  G: "#3a78c2", // glasses frame (blue stands out on brown fur and on orange fur)
  X: "#1c1f2b", // laptop and controller outline
  S: "#aeb4c0", // laptop and controller shell
  U: "#d9dde6", // laptop shell, lit edge
  T: "#868d9c", // laptop shell, shaded edge; clipboard clip
  V: "#f4f4f6", // laptop logo
  // hats, sunglasses, held items
  R: "#d6453d", // red (beanie, gems, a controller button)
  B: "#3b6fd8", // blue (beanie band, a gem, a lens glint)
  N: "#1b2a5e", // navy (sunglasses lens, the night sky)
  Y: "#ffd24a", // gold (crown, monocle, party hat tip, stars, sun)
  Z: "#fff1a8", // pale gold (moon, the monocle chain)
  Q: "#ffffff", // white (pom-pom, party stripes, stars, clouds)
  K: "#14121c", // near black (sunglasses frame, clipboard text, d-pad)
  M: "#8b4fd0", // purple (party hat)
  E: "#3fae5a", // green (clipboard ticks, a button, the near hill)
  C: "#6b3f1f", // brown (coffee, clipboard board)
  F: "#f1f1f4", // off-white (cup, paper)
  // backgrounds
  W: "#2c3f86", // lighter navy (the lower night sky)
  H: "#0f1636", // dark ground at night
  D: "#2d7a3e", // dark green (the far hill)
  J: "#7fd1f0", // sky
  I: "#bfe9ff", // pale sky near the horizon
  P: "#f07aa0", // pink (flowers)
};
