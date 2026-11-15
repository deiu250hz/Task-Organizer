/** Every colour theme the app can wear. Add a name here, then its colours in src/index.css. */
export const THEMES = ["dusk", "forest", "ocean", "gameboy"] as const;

export type Theme = (typeof THEMES)[number];

/** The theme used until the player picks one, and when a saved value is unknown. */
export const DEFAULT_THEME: Theme = "dusk";

/** What the player sees. */
export const THEME_LABEL: Record<Theme, string> = {
  dusk: "Dusk",
  forest: "Forest",
  ocean: "Ocean",
  gameboy: "Game Boy",
};

/**
 * Is this value one of the known themes? The saved choice comes back from the database as a plain
 * string, so it is checked before it is trusted: a hand-edited or outdated value falls back to the default.
 */
export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
