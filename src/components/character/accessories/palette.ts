import type { Palette } from "../species/types";

// Accessory colours. Every key is UPPERCASE and every pet palette key is lowercase, so the two can
// be merged into one palette for one SVG without ever clashing. Accessories look the same on every pet.
export const ACCESSORY_PALETTE: Palette = {
  G: "#3a78c2", // glasses frame (blue stands out on brown fur and on orange fur)
  X: "#1c1f2b", // laptop outline
  S: "#aeb4c0", // laptop shell
  U: "#d9dde6", // laptop shell, lit edge
  T: "#868d9c", // laptop shell, shaded edge
  V: "#f4f4f6", // laptop logo
};
