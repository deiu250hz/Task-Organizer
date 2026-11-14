import type { CSSProperties } from "react";
import type { Equipped, Mood, OneShot, Stage } from "../../domain/types";
import { composeLayers } from "./composeLayers";
import { ONE_SHOT_MS } from "./oneShotTiming";
import { PixelSprite } from "./PixelSprite";
import { SPECIES, type Species } from "./species";
import { GRID_SIZE } from "./species/types";
import { useCharacterMachine } from "./useCharacterMachine";

// Presentational only (CLAUDE.md rule 6): everything comes in as props, and nothing is imported
// from store/ or repositories/.
export interface CharacterProps {
  species: Species;
  /** The stage on screen, 1..4. */
  stage: Stage;
  mood: Mood;
  /** Accessories by slot. Drawn from Phase 6; accepted now so the prop is stable. */
  equipped: Equipped;
  /** The animation playing now (head of the store's queue); null when nothing is pending. */
  oneShot: { id: number; kind: OneShot; toStage?: Stage } | null;
  /** Called once when the one-shot finishes, so the store can move on to the next one. */
  onOneShotDone: (id: number) => void;
  /** Rendered size in CSS px. Must be an integer multiple of the 32 px grid. Default 192. */
  size?: number;
}

const DEFAULT_SIZE = 192;

export function Character({ species, stage, mood, oneShot, onOneShotDone, size = DEFAULT_SIZE }: CharacterProps) {
  const art = SPECIES[species];
  const { shownMood, handleAnimationEnd } = useCharacterMachine({ mood, oneShot, onOneShotDone });

  const spriteFor = (forStage: Stage) => (
    <PixelSprite
      grid={composeLayers([art.bodies[forStage], art.faces[shownMood][forStage]])}
      palette={art.palette}
      size={size}
    />
  );

  // --px is one sprite pixel in screen pixels: animations move in whole sprite pixels, never between.
  // --shot-ms is the duration of the current one-shot. Both are CSS custom properties, which
  // CSSProperties does not know about, hence the assertion.
  const frameStyle = { width: size, height: size, "--px": `${size / GRID_SIZE}px` } as CSSProperties;
  const shotStyle = oneShot ? ({ "--shot-ms": `${ONE_SHOT_MS[oneShot.kind]}ms` } as CSSProperties) : undefined;

  const evolving = oneShot?.kind === "evolve" && oneShot.toStage !== undefined;

  return (
    <div
      className="pet"
      data-mood={shownMood}
      data-shot={oneShot?.kind}
      role="img"
      aria-label={`${species}, stage ${stage}, feeling ${shownMood}`}
      style={frameStyle}
    >
      <div
        // key restarts the CSS animation for each new one-shot
        key={oneShot?.id ?? "none"}
        className="pet-shot"
        data-kind={oneShot?.kind}
        style={shotStyle}
        onAnimationEnd={handleAnimationEnd}
      >
        {evolving && oneShot?.toStage !== undefined ? (
          <>
            <div className="pet-layer pet-evolve-out">{spriteFor(stage)}</div>
            <div className="pet-layer pet-evolve-in">{spriteFor(oneShot.toStage)}</div>
          </>
        ) : (
          <div className="pet-layer">{spriteFor(stage)}</div>
        )}
      </div>
    </div>
  );
}
