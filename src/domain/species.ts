/** Every pet the app can show. Add a name here, then its art in components/character/species. */
export const SPECIES = ["monkey", "cat"] as const;

export type Species = (typeof SPECIES)[number];

/** What the player sees. */
export const SPECIES_LABEL: Record<Species, string> = {
  monkey: "Monkey",
  cat: "Cat",
};

/**
 * Is this value one of the known pets? The saved choice comes back from the database as a plain
 * string, so it is checked before it is trusted: a hand-edited or outdated value counts as "not chosen".
 */
export function isSpecies(value: unknown): value is Species {
  return typeof value === "string" && (SPECIES as readonly string[]).includes(value);
}
