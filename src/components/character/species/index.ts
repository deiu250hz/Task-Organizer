import { CAT_HAPPY_FACES } from "./cat/faces/happy";
import { CAT_IDLE_FACES } from "./cat/faces/idle";
import { CAT_SAD_FACES } from "./cat/faces/sad";
import { CAT_SLEEPY_FACES } from "./cat/faces/sleepy";
import { CAT_PALETTE } from "./cat/palette";
import { CAT_STAGE_1_BODY } from "./cat/stages/stage1";
import { CAT_STAGE_2_BODY } from "./cat/stages/stage2";
import { CAT_STAGE_3_BODY } from "./cat/stages/stage3";
import { CAT_STAGE_4_BODY } from "./cat/stages/stage4";
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
  cat: {
    palette: CAT_PALETTE,
    bodies: { 1: CAT_STAGE_1_BODY, 2: CAT_STAGE_2_BODY, 3: CAT_STAGE_3_BODY, 4: CAT_STAGE_4_BODY },
    faces: { idle: CAT_IDLE_FACES, happy: CAT_HAPPY_FACES, sad: CAT_SAD_FACES, sleepy: CAT_SLEEPY_FACES },
  },
};
