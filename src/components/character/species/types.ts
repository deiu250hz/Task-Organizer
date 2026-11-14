import type { Mood, Stage } from "../../../domain/types";

/** Every sprite is a square grid of this many pixels per side. */
export const GRID_SIZE = 32;

/** The pets the app can show. Add a name here (and a registry entry) to add a species. */
export type Species = "monkey";

/** One colour per palette key. The key '.' is reserved for transparent and has no colour. */
export type Palette = Readonly<Record<string, string>>;

/** 32 rows of 32 palette keys. */
export type Grid = readonly string[];

/** Everything needed to draw one species. Layers, back to front: body, face, then accessories. */
export interface SpeciesArt {
  palette: Palette;
  /** The body for each evolution stage, without a face. */
  bodies: Record<Stage, Grid>;
  /** The face overlay for each mood and stage (the head moves and grows between stages). */
  faces: Record<Mood, Record<Stage, Grid>>;
}
