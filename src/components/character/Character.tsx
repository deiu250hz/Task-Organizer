import { useMemo, type CSSProperties } from "react";
import type { Equipped, Mood, OneShot, Stage } from "../../domain/types";
import { accessoryLayers, ACCESSORY_PALETTE } from "./accessories";
import { ANCHORS } from "./anchors";
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
  /** Accessories by slot (an asset key, or null for an empty slot). Placed with the anchors of the stage being drawn. */
  equipped: Equipped;
  /** The animation playing now (head of the store's queue); null when nothing is pending. */
  oneShot: { id: number; kind: OneShot; toStage?: Stage } | null;
  /** Called once when the one-shot finishes, so the store can move on to the next one. */
  onOneShotDone: (id: number) => void;
  /** Rendered size in CSS px. Must be an integer multiple of the 32 px grid. Default 192. */
  size?: number;
}

const DEFAULT_SIZE = 192;

export function Character({ species, stage, mood, equipped, oneShot, onOneShotDone, size = DEFAULT_SIZE }: CharacterProps) {
  const art = SPECIES[species];
  const { shownMood, handleAnimationEnd } = useCharacterMachine({ mood, oneShot, onOneShotDone });

  // Pet keys are lowercase and accessory keys uppercase, so one merged palette serves every layer.
  // Memoized so PixelSprite sees the same object between renders.
  const palette = useMemo(() => ({ ...art.palette, ...ACCESSORY_PALETTE }), [art]);

  // Layer order, back to front: background, body, face, held, glasses, hat. The background is drawn
  // on its own, behind the animated element (see the return below), so the scenery stays still while
  // the pet bobs and hops. A background is the same scene for every stage, so any stage's anchors do.
  const backdrop = useMemo(() => {
    const { behind } = accessoryLayers(equipped, ANCHORS[species][stage]);
    return behind.length === 0 ? null : composeLayers(behind);
  }, [equipped, species, stage]);

  // The pet itself: body, face, then held, glasses, hat. The anchors are looked up for the stage being
  // drawn, so during an evolve each of the two sprites gets its own placement.
  const spriteFor = (forStage: Stage) => {
    const worn = accessoryLayers(equipped, ANCHORS[species][forStage]);
    return (
      <PixelSprite
        grid={composeLayers([art.bodies[forStage], art.faces[shownMood][forStage], ...worn.front])}
        palette={palette}
        size={size}
      />
    );
  };

  // --px is one sprite pixel in screen pixels: animations move in whole sprite pixels, never between.
  // --shot-ms is the duration of the current one-shot. Both are CSS custom properties, which
  // CSSProperties does not know about, hence the assertion.
  const frameStyle = { width: size, height: size, "--px": `${size / GRID_SIZE}px` } as CSSProperties;
  const shotStyle = oneShot ? ({ "--shot-ms": `${ONE_SHOT_MS[oneShot.kind]}ms` } as CSSProperties) : undefined;

  const evolving = oneShot?.kind === "evolve" && oneShot.toStage !== undefined;

  return (
    // The stage holds the still background and, on top of it, the animated pet.
    <div className="pet-stage" style={{ width: size, height: size }}>
      {backdrop !== null && (
        <div className="pet-backdrop" aria-hidden="true">
          <PixelSprite grid={backdrop} palette={palette} size={size} />
        </div>
      )}
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
    </div>
  );
}
