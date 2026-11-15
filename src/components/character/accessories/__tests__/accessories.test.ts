import { describe, expect, it } from "vitest";
import type { Equipped, Mood, Stage } from "../../../../domain/types";
import { ANCHORS } from "../../anchors";
import { GRID_SIZE, type Grid } from "../../species/types";
import { SPECIES, type Species } from "../../species";
import { ACCESSORIES, ACCESSORY_PALETTE, accessoryLayers } from "..";
import { drawGlasses, GLASSES_ICON } from "../glasses";
import { drawLaptop, LAPTOP_SPRITE } from "../laptop";
import { paste } from "../paste";

const SPECIES_LIST = ["monkey", "cat"] as const satisfies readonly Species[];
const STAGES = [1, 2, 3, 4] as const satisfies readonly Stage[];
const MOODS = ["idle", "happy", "sad", "sleepy"] as const satisfies readonly Mood[];
const nothing: Equipped = { hat: null, glasses: null, held: null, background: null };

function pixels(grid: Grid): { x: number; y: number; key: string }[] {
  const found: { x: number; y: number; key: string }[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) if (row[x] !== ".") found.push({ x, y, key: row[x] });
  });
  return found;
}

describe("paste", () => {
  it("places a small grid at the given corner on a 32x32 canvas", () => {
    const out = paste(["ab", "cd"], 3, 5);
    expect(out).toHaveLength(GRID_SIZE);
    expect(out.every((row) => row.length === GRID_SIZE)).toBe(true);
    expect(out[5].slice(3, 5)).toBe("ab");
    expect(out[6].slice(3, 5)).toBe("cd");
    expect(pixels(out)).toHaveLength(4);
  });

  it("clips what falls outside the canvas instead of throwing", () => {
    const out = paste(["ab", "cd"], 31, 31);
    expect(pixels(out)).toEqual([{ x: 31, y: 31, key: "a" }]);
    expect(pixels(paste(["ab"], -1, 0))).toEqual([{ x: 0, y: 0, key: "b" }]);
    expect(pixels(paste(["ab", "cd"], 0, -1))).toEqual([
      { x: 0, y: 0, key: "c" },
      { x: 1, y: 0, key: "d" },
    ]);
  });
});

describe("accessory palette", () => {
  it("uses only uppercase keys, so it can never clash with a lowercase pet palette", () => {
    for (const key of Object.keys(ACCESSORY_PALETTE)) expect(key).toBe(key.toUpperCase());
  });

  it("does not share a key with any pet palette", () => {
    for (const species of SPECIES_LIST) {
      for (const key of Object.keys(SPECIES[species].palette)) {
        expect(ACCESSORY_PALETTE).not.toHaveProperty(key);
      }
    }
  });

  it("gives a colour to every key the accessories use", () => {
    const grids = [
      GLASSES_ICON,
      LAPTOP_SPRITE,
      drawGlasses(ANCHORS.monkey[1].eyes),
      drawLaptop(ANCHORS.monkey[1].held),
    ];
    for (const grid of grids) {
      for (const { key } of pixels(grid)) expect(ACCESSORY_PALETTE).toHaveProperty(key);
    }
  });
});

describe("accessory grids", () => {
  it("draws every layer as 32 rows of 32 columns", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const art of Object.values(ACCESSORIES)) {
          const layer = art.layer(ANCHORS[species][stage]);
          expect(layer).toHaveLength(GRID_SIZE);
          expect(layer.every((row) => row.length === GRID_SIZE)).toBe(true);
        }
      }
    }
  });

  it("keeps the shop icons small and rectangular", () => {
    for (const art of Object.values(ACCESSORIES)) {
      expect(art.icon.length).toBeGreaterThan(0);
      expect(art.icon.length).toBeLessThanOrEqual(16);
      expect(new Set(art.icon.map((row) => row.length)).size).toBe(1);
      expect(art.icon[0].length).toBeLessThanOrEqual(16);
    }
  });

  it("files each item under the slot it is worn in", () => {
    expect(ACCESSORIES.glasses_round.slot).toBe("glasses");
    expect(ACCESSORIES.laptop.slot).toBe("held");
  });
});

describe("anchors", () => {
  it("keep every accessory inside the canvas", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const art of Object.values(ACCESSORIES)) {
          const layer = art.layer(ANCHORS[species][stage]);
          // pasting clips, so a layer that lost pixels at an edge would have fewer than the full sprite
          const drawn = pixels(layer).length;
          expect(drawn).toBeGreaterThan(0);
        }
        const { held } = ANCHORS[species][stage];
        expect(held.x).toBeGreaterThanOrEqual(0);
        expect(held.x + LAPTOP_SPRITE[0].length).toBeLessThanOrEqual(GRID_SIZE);
        expect(held.y + LAPTOP_SPRITE.length).toBeLessThanOrEqual(GRID_SIZE);
      }
    }
  });

  it("put the eyes where the idle face really draws them", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes } = ANCHORS[species][stage];
        const face = SPECIES[species].faces.idle[stage];
        for (const eyeX of [eyes.leftX, eyes.rightX]) {
          // the 2x3 eye block is made of eye-dark 'k' and one white shine pixel 'w'
          const block: string[] = [];
          for (let dy = 0; dy < 3; dy += 1) for (let dx = 0; dx < 2; dx += 1) block.push(face[eyes.y + dy][eyeX + dx]);
          expect(block.every((key) => key === "k" || key === "w")).toBe(true);
          expect(block.filter((key) => key === "k").length).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
});

describe("glasses", () => {
  it("never cover the 2x3 eyes of the idle face, for both pets at every stage", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes } = ANCHORS[species][stage];
        const glasses = drawGlasses(eyes);
        for (const eyeX of [eyes.leftX, eyes.rightX]) {
          for (let dy = 0; dy < 3; dy += 1) {
            for (let dx = 0; dx < 2; dx += 1) expect(glasses[eyes.y + dy][eyeX + dx]).toBe(".");
          }
        }
      }
    }
  });

  it("frame each eye and join the lenses with a bridge as wide as the gap", () => {
    // Stage 1 has a 2 px gap between the eyes, later stages 4 px (the lenses' own sides are separate).
    const narrow = ANCHORS.monkey[1].eyes;
    const wide = ANCHORS.monkey[3].eyes;
    const bridge = (eyes: typeof narrow) => {
      const row = drawGlasses(eyes)[eyes.y + 1];
      return row.slice(eyes.leftX + 3, eyes.rightX - 1);
    };
    expect(bridge(narrow)).toBe("GG");
    expect(bridge(wide)).toBe("GGGG");
    // Each lens is a 4x5 ring: 14 frame pixels plus nothing inside, so two lenses + the bridge.
    expect(pixels(drawGlasses(narrow))).toHaveLength(14 * 2 + 2);
    expect(pixels(drawGlasses(wide))).toHaveLength(14 * 2 + 4);
  });

  it("use only the frame colour", () => {
    expect(new Set(pixels(drawGlasses(ANCHORS.cat[2].eyes)).map((p) => p.key))).toEqual(new Set(["G"]));
  });
});

describe("laptop", () => {
  it("never touches a face pixel, for both pets, every stage and every mood", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const laptop = drawLaptop(ANCHORS[species][stage].held);
        const laptopRows = pixels(laptop).map((p) => p.y);
        const top = Math.min(...laptopRows);
        for (const mood of MOODS) {
          const faceRows = pixels(SPECIES[species].faces[mood][stage]).map((p) => p.y);
          expect(Math.max(...faceRows)).toBeLessThan(top);
        }
      }
    }
  });

  it("is placed by the held anchor", () => {
    const held = { x: 5, y: 9 };
    const laptop = drawLaptop(held);
    expect(laptop[9].slice(5, 17)).toBe(LAPTOP_SPRITE[0]);
    expect(laptop[15].slice(5, 17)).toBe(LAPTOP_SPRITE[6]);
  });
});

describe("accessoryLayers", () => {
  const anchors = ANCHORS.monkey[1];

  it("is empty when nothing is worn", () => {
    expect(accessoryLayers(nothing, anchors)).toEqual({ behind: [], front: [] });
  });

  it("returns one layer per worn item, the held item before the glasses", () => {
    const worn = accessoryLayers({ ...nothing, glasses: "glasses_round", held: "laptop" }, anchors);
    expect(worn.behind).toEqual([]);
    expect(worn.front).toEqual([drawLaptop(anchors.held), drawGlasses(anchors.eyes)]);
  });

  it("ignores an asset key it does not know", () => {
    expect(accessoryLayers({ ...nothing, hat: "top_hat_from_the_future" }, anchors)).toEqual({ behind: [], front: [] });
  });

  it("ignores a known key filed in the wrong slot", () => {
    expect(accessoryLayers({ ...nothing, hat: "laptop" }, anchors)).toEqual({ behind: [], front: [] });
  });
});
