import { SPECIES as SPECIES_NAMES, SPECIES_LABEL } from "../../domain/species";
import { composeLayers } from "./composeLayers";
import { PixelSprite } from "./PixelSprite";
import { SPECIES, type Grid, type Species } from "./species";

export interface PetPickerProps {
  /** The pet in use now, or null on the very first run. */
  current: Species | null;
  onChoose: (species: Species) => void;
  /** Only given when switching pets, never on the first run (there is nothing to go back to). */
  onCancel?: () => void;
}

// A stage 1, idle preview per pet. Built once, so the picker does not recompose sprites on every render.
const previews = new Map<Species, Grid>();
function previewFor(species: Species): Grid {
  let grid = previews.get(species);
  if (grid === undefined) {
    const art = SPECIES[species];
    grid = composeLayers([art.bodies[1], art.faces.idle[1]]);
    previews.set(species, grid);
  }
  return grid;
}

export function PetPicker({ current, onChoose, onCancel }: PetPickerProps) {
  return (
    <section aria-labelledby="pet-picker-heading" className="flex flex-col gap-3">
      <h3 id="pet-picker-heading" className="text-center font-pixel text-sm font-bold text-text">
        Choose your pet
      </h3>

      <ul className="grid grid-cols-2 gap-3">
        {SPECIES_NAMES.map((species) => {
          const isCurrent = current === species;
          return (
            <li key={species}>
              <button
                type="button"
                onClick={() => onChoose(species)}
                aria-pressed={isCurrent}
                aria-label={isCurrent ? `${SPECIES_LABEL[species]}, current pet` : SPECIES_LABEL[species]}
                className="flex w-full flex-col items-center gap-1 rounded-md border border-border-strong bg-bg p-2 transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-surface-raised"
              >
                {/* 96 px is 3 x 32, so every sprite pixel stays square. */}
                <PixelSprite grid={previewFor(species)} palette={SPECIES[species].palette} size={96} />
                <span className="font-pixel text-xs text-text">{SPECIES_LABEL[species]}</span>
                {isCurrent && <span className="text-xs text-accent">Current</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-text-muted">
        Your level, XP and coins stay when you switch.
      </p>

      {onCancel !== undefined && (
        <button
          type="button"
          onClick={onCancel}
          className="mx-auto rounded-md px-3 py-1 text-xs text-text-muted transition-colors hover:text-text"
        >
          Cancel
        </button>
      )}
    </section>
  );
}
