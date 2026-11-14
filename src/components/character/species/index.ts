import { HAPPY_FACES } from "./monkey/faces/happy";
import { IDLE_FACES } from "./monkey/faces/idle";
import { SAD_FACES } from "./monkey/faces/sad";
import { SLEEPY_FACES } from "./monkey/faces/sleepy";
import { MONKEY_PALETTE } from "./monkey/palette";
import { STAGE_1_BODY } from "./monkey/stages/stage1";
import { STAGE_2_BODY } from "./monkey/stages/stage2";
import { STAGE_3_BODY } from "./monkey/stages/stage3";
import { STAGE_4_BODY } from "./monkey/stages/stage4";
import type { Species, SpeciesArt } from "./types";

export type { Grid, Palette, Species, SpeciesArt } from "./types";

// The registry: Character looks a species up here, so adding a pet is data, not new logic.
export const SPECIES: Record<Species, SpeciesArt> = {
  monkey: {
    palette: MONKEY_PALETTE,
    bodies: { 1: STAGE_1_BODY, 2: STAGE_2_BODY, 3: STAGE_3_BODY, 4: STAGE_4_BODY },
    faces: { idle: IDLE_FACES, happy: HAPPY_FACES, sad: SAD_FACES, sleepy: SLEEPY_FACES },
  },
};
