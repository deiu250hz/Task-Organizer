import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Equipped, Mood, Stage } from "../../../domain/types";
import { Character, type CharacterProps } from "../Character";
// Vite's ?raw suffix imports a file's text, so the test can read the source without node types.
import characterSource from "../Character.tsx?raw";

const noAccessories: Equipped = { hat: null, glasses: null, held: null, background: null };

function html(overrides: Partial<CharacterProps> = {}): string {
  return renderToStaticMarkup(
    <Character
      species="monkey"
      stage={1}
      mood="idle"
      equipped={noAccessories}
      oneShot={null}
      onOneShotDone={() => undefined}
      {...overrides}
    />,
  );
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("Character", () => {
  it("draws one sprite for a pet that is not animating a one-shot", () => {
    expect(count(html(), "<svg")).toBe(1);
  });

  it("marks the mood so the matching loop animation applies", () => {
    for (const mood of ["idle", "happy", "sad", "sleepy"] as Mood[]) {
      expect(html({ mood })).toContain(`data-mood="${mood}"`);
    }
  });

  it("describes the pet to screen readers", () => {
    expect(html({ stage: 3, mood: "happy" })).toContain('aria-label="monkey, stage 3, feeling happy"');
  });

  it("draws every stage with different pixels", () => {
    const drawn = ([1, 2, 3, 4] as Stage[]).map((stage) => html({ stage }));
    expect(new Set(drawn).size).toBe(4);
  });

  it("draws every mood with different pixels", () => {
    const drawn = (["idle", "happy", "sad", "sleepy"] as Mood[]).map((mood) => html({ mood }));
    expect(new Set(drawn).size).toBe(4);
  });

  it("defaults to 192 px, six screen pixels per sprite pixel", () => {
    const out = html();
    expect(out).toContain("width:192px");
    expect(out).toContain("--px:6px");
  });

  it("scales by a multiple of 32 when asked for another size", () => {
    const out = html({ size: 64 });
    expect(out).toContain("width:64px");
    expect(out).toContain("--px:2px");
    expect(out).toContain('width="64"');
  });
});

describe("Character one-shots", () => {
  it("marks the playing one-shot and its length", () => {
    const out = html({ oneShot: { id: 1, kind: "celebrate" } });
    expect(out).toContain('data-shot="celebrate"');
    expect(out).toContain('data-kind="celebrate"');
    expect(out).toContain("--shot-ms:900ms");
  });

  it("shows no one-shot marker when nothing is playing", () => {
    const out = html();
    expect(out).not.toContain("data-shot");
    expect(out).not.toContain("data-kind");
  });

  it("draws the old and the new stage during an evolve", () => {
    const out = html({ stage: 1, oneShot: { id: 2, kind: "evolve", toStage: 2 } });
    expect(count(out, "<svg")).toBe(2);
    expect(out).toContain("pet-evolve-out");
    expect(out).toContain("pet-evolve-in");
  });

  it("draws a single sprite for other one-shots", () => {
    for (const kind of ["celebrate", "levelUp", "equip"] as const) {
      expect(count(html({ oneShot: { id: 3, kind } }), "<svg")).toBe(1);
    }
  });

  it("keeps showing the held mood while a one-shot plays", () => {
    // On the first render the held mood is the mood it started with.
    expect(html({ mood: "sad", oneShot: { id: 4, kind: "celebrate" } })).toContain('data-mood="sad"');
  });
});

describe("Character boundaries", () => {
  it("imports nothing from store/ or repositories/ (CLAUDE.md rule 6)", () => {
    const imports = characterSource.split("\n").filter((line: string) => line.startsWith("import"));
    expect(imports.length).toBeGreaterThan(3); // the filter found the import lines
    for (const line of imports) {
      expect(line).not.toMatch(/store|repositories/);
    }
  });
});
