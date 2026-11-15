import { describe, expect, it } from "vitest";
import type { Equipped, Mood, Stage } from "../../../../domain/types";
import { ANCHORS } from "../../anchors";
import { SPECIES, type Species } from "../../species";
import { GRID_SIZE, type Grid } from "../../species/types";
import { ACCESSORIES, ACCESSORY_PALETTE, accessoryLayers } from "..";
// Vite's ?raw suffix imports a file's text, so the test can read the migrations without node types.
import migration003 from "../../../../../src-tauri/migrations/003_shop.sql?raw";
import migration004 from "../../../../../src-tauri/migrations/004_more_items.sql?raw";

// The items seeded by migrations 003 and 004, and the rules every item must keep.

const SPECIES_LIST = ["monkey", "cat"] as const satisfies readonly Species[];
const STAGES = [1, 2, 3, 4] as const satisfies readonly Stage[];
const MOODS = ["idle", "happy", "sad", "sleepy"] as const satisfies readonly Mood[];
const nothing: Equipped = { hat: null, glasses: null, held: null, background: null };

const keysOf = (slot: string) => Object.keys(ACCESSORIES).filter((key) => ACCESSORIES[key].slot === slot);
const HATS = keysOf("hat");
const HELD = keysOf("held");
const BACKGROUNDS = keysOf("background");

function pixels(grid: Grid): { x: number; y: number; key: string }[] {
  const found: { x: number; y: number; key: string }[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) if (row[x] !== ".") found.push({ x, y, key: row[x] });
  });
  return found;
}
const count = (grid: Grid) => pixels(grid).length;

describe("the registry and the migrations agree", () => {
  // ('hat', 'Knit Beanie', 25, 1, 'knit_beanie')
  const pattern = /\('(\w+)',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'(\w+)'\)/g;
  const rows = [...migration003.matchAll(pattern), ...migration004.matchAll(pattern)].map((m) => ({
    slot: m[1],
    name: m[2],
    price: Number(m[3]),
    level: Number(m[4]),
    key: m[5],
  }));

  it("finds all twelve seeded items", () => {
    expect(rows).toHaveLength(12);
  });

  it("has a drawing, in the same slot, for every seeded asset key", () => {
    for (const row of rows) {
      expect(ACCESSORIES[row.key], row.key).toBeDefined();
      expect(ACCESSORIES[row.key].slot, row.key).toBe(row.slot);
    }
  });

  it("has a seeded row for every drawing", () => {
    expect(Object.keys(ACCESSORIES).sort()).toEqual(rows.map((row) => row.key).sort());
  });

  it("uses unique asset keys, positive prices and levels from 1", () => {
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.price, row.name).toBeGreaterThan(0);
      expect(row.level, row.name).toBeGreaterThanOrEqual(1);
    }
  });

  it("offers the planned number of items per slot", () => {
    expect(HATS).toHaveLength(3);
    expect(keysOf("glasses")).toHaveLength(3); // round glasses, sunglasses, monocle
    expect(HELD).toHaveLength(4); // laptop, coffee cup, clipboard, controller
    expect(BACKGROUNDS).toHaveLength(2);
  });
});

describe("every accessory", () => {
  it("is 32 x 32 and uses only keys of the accessory palette", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const [key, art] of Object.entries(ACCESSORIES)) {
          const layer = art.layer(ANCHORS[species][stage]);
          expect(layer, key).toHaveLength(GRID_SIZE);
          expect(layer.every((row) => row.length === GRID_SIZE), key).toBe(true);
          for (const pixel of pixels(layer)) {
            expect(ACCESSORY_PALETTE, `${key} uses ${pixel.key}`).toHaveProperty(pixel.key);
          }
        }
      }
    }
  });

  it("draws something for every species and stage", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const [key, art] of Object.entries(ACCESSORIES)) {
          expect(count(art.layer(ANCHORS[species][stage])), key).toBeGreaterThan(0);
        }
      }
    }
  });

  it("has a shop icon whose colours are all in the palette", () => {
    for (const [key, art] of Object.entries(ACCESSORIES)) {
      for (const pixel of pixels(art.icon)) {
        expect(ACCESSORY_PALETTE, `${key} icon uses ${pixel.key}`).toHaveProperty(pixel.key);
      }
    }
  });
});

describe("hats", () => {
  it("are at most 4 rows tall, the room the stage 4 monkey has above its eyes", () => {
    for (const key of HATS) expect(ACCESSORIES[key].icon.length, key).toBeLessThanOrEqual(4);
  });

  it("sit with their bottom row two rows above the eyes, in every species and stage", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes, hat } = ANCHORS[species][stage];
        expect(hat.x).toBe(16);
        expect(hat.bottomY).toBe(eyes.y - 2);
      }
    }
  });

  it("are never clipped by the edge of the picture (every pixel of the drawing is drawn)", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const key of HATS) {
          const layer = ACCESSORIES[key].layer(ANCHORS[species][stage]);
          expect(count(layer), `${key} ${species} ${stage}`).toBe(count(ACCESSORIES[key].icon));
        }
      }
    }
  });

  it("end above the glasses frame, so a hat and glasses never touch", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes } = ANCHORS[species][stage];
        for (const key of HATS) {
          const lowest = Math.max(...pixels(ACCESSORIES[key].layer(ANCHORS[species][stage])).map((p) => p.y));
          expect(lowest, `${key} ${species} ${stage}`).toBeLessThan(eyes.y - 1);
        }
      }
    }
  });

  it("never cover a pixel of the idle face, which has nothing above the glasses frame", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const face = pixels(SPECIES[species].faces.idle[stage]);
        for (const key of HATS) {
          const hat = new Set(pixels(ACCESSORIES[key].layer(ANCHORS[species][stage])).map((p) => `${p.x},${p.y}`));
          for (const pixel of face) {
            expect(hat.has(`${pixel.x},${pixel.y}`), `${key} ${species} ${stage} at ${pixel.x},${pixel.y}`).toBe(false);
          }
        }
      }
    }
  });

  it("are centred on the middle of the head", () => {
    for (const key of HATS) {
      const xs = pixels(ACCESSORIES[key].layer(ANCHORS.monkey[1])).map((p) => p.x);
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(Math.abs(middle - 16), key).toBeLessThanOrEqual(1);
    }
  });
});

describe("held items", () => {
  it("fit the 12 pixel slot of the laptop", () => {
    for (const key of HELD) expect(ACCESSORIES[key].icon[0].length, key).toBeLessThanOrEqual(12);
  });

  it("never touch a face pixel, in any mood, for both pets at every stage", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const key of HELD) {
          const top = Math.min(...pixels(ACCESSORIES[key].layer(ANCHORS[species][stage])).map((p) => p.y));
          for (const mood of MOODS) {
            const lowestFace = Math.max(...pixels(SPECIES[species].faces[mood][stage]).map((p) => p.y));
            expect(lowestFace, `${key} ${species} ${stage} ${mood}`).toBeLessThan(top);
          }
        }
      }
    }
  });

  it("start on the held anchor's row and are never clipped", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        for (const key of HELD) {
          const layer = ACCESSORIES[key].layer(ANCHORS[species][stage]);
          expect(Math.min(...pixels(layer).map((p) => p.y)), key).toBe(ANCHORS[species][stage].held.y);
          expect(count(layer), `${key} ${species} ${stage}`).toBe(count(ACCESSORIES[key].icon));
        }
      }
    }
  });

  it("are centred in the slot", () => {
    for (const key of HELD) {
      const xs = pixels(ACCESSORIES[key].layer(ANCHORS.cat[2])).map((p) => p.x);
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(Math.abs(middle - 15.5), key).toBeLessThanOrEqual(1);
    }
  });
});

describe("sunglasses and monocle", () => {
  const eyeBlock = (grid: Grid, x0: number, y: number) => {
    const cells: string[] = [];
    for (let dy = 0; dy < 3; dy += 1) for (let dx = 0; dx < 2; dx += 1) cells.push(grid[y + dy][x0 + dx]);
    return cells;
  };

  it("sunglasses cover both full eye blocks (the eyes are hidden by design)", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes } = ANCHORS[species][stage];
        const layer = ACCESSORIES.sunglasses.layer(ANCHORS[species][stage]);
        for (const x0 of [eyes.leftX, eyes.rightX]) {
          expect(eyeBlock(layer, x0, eyes.y).every((key) => key !== "."), `${species} ${stage}`).toBe(true);
        }
      }
    }
  });

  it("monocle frames only the eye on the right of the picture and leaves that eye visible", () => {
    for (const species of SPECIES_LIST) {
      for (const stage of STAGES) {
        const { eyes } = ANCHORS[species][stage];
        const layer = ACCESSORIES.monocle.layer(ANCHORS[species][stage]);
        expect(eyeBlock(layer, eyes.rightX, eyes.y).every((key) => key === "."), `${species} ${stage}`).toBe(true);
        for (let y = eyes.y - 1; y <= eyes.y + 3; y += 1) {
          for (let x = eyes.leftX - 1; x <= eyes.leftX + 2; x += 1) expect(layer[y][x]).toBe("."); // nothing at the other eye
        }
      }
    }
  });
});

describe("backgrounds", () => {
  it("are complete 32 x 32 scenes, with no transparent pixel", () => {
    for (const key of BACKGROUNDS) {
      const layer = ACCESSORIES[key].layer(ANCHORS.monkey[1]);
      expect(layer, key).toHaveLength(GRID_SIZE);
      expect(count(layer), key).toBe(GRID_SIZE * GRID_SIZE);
    }
  });

  it("are the same scene whatever the species and stage", () => {
    for (const key of BACKGROUNDS) {
      const first = ACCESSORIES[key].layer(ANCHORS.monkey[1]);
      for (const species of SPECIES_LIST) {
        for (const stage of STAGES) expect(ACCESSORIES[key].layer(ANCHORS[species][stage]), key).toEqual(first);
      }
    }
  });

  it("have a 16 x 16 thumbnail taken from the scene", () => {
    for (const key of BACKGROUNDS) {
      const { icon } = ACCESSORIES[key];
      const scene = ACCESSORIES[key].layer(ANCHORS.monkey[1]);
      expect(icon).toHaveLength(16);
      expect(icon.every((row) => row.length === 16)).toBe(true);
      expect(icon[3][5]).toBe(scene[6][10]);
    }
  });

  it("go behind the pet, never in front", () => {
    for (const key of BACKGROUNDS) {
      const worn = accessoryLayers({ ...nothing, background: key }, ANCHORS.cat[3]);
      expect(worn.behind).toHaveLength(1);
      expect(worn.front).toEqual([]);
    }
  });

  it("differ from each other", () => {
    const [a, b] = BACKGROUNDS.map((key) => ACCESSORIES[key].layer(ANCHORS.monkey[1]));
    expect(a).not.toEqual(b);
  });
});

describe("wearing several items", () => {
  it("draws one layer per slot in front (held, then glasses, then hat) with the background behind", () => {
    const equipped: Equipped = { background: "night_sky", held: "coffee_cup", glasses: "sunglasses", hat: "gold_crown" };
    const anchors = ANCHORS.cat[4];
    const worn = accessoryLayers(equipped, anchors);
    expect(worn.behind).toEqual([ACCESSORIES.night_sky.layer(anchors)]);
    expect(worn.front).toEqual([
      ACCESSORIES.coffee_cup.layer(anchors),
      ACCESSORIES.sunglasses.layer(anchors),
      ACCESSORIES.gold_crown.layer(anchors),
    ]);
  });

  it("ignores an item filed in a slot it does not belong to", () => {
    expect(accessoryLayers({ ...nothing, hat: "sunglasses", background: "gold_crown" }, ANCHORS.cat[1])).toEqual({
      behind: [],
      front: [],
    });
  });
});
