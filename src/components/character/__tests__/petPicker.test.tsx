import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SPECIES } from "../../../domain/species";
import { CharacterPanel } from "../CharacterPanel";
import { PetPicker } from "../PetPicker";
import { renderWith } from "../../__tests__/renderWithStore";

const noop = () => undefined;
const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("PetPicker", () => {
  it("offers every pet with a preview and its name", () => {
    const html = renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />);
    expect(html).toContain("Choose your pet");
    expect(count(html, "<svg")).toBe(SPECIES.length);
    expect(html).toContain(">Monkey<");
    expect(html).toContain(">Cat<");
  });

  it("draws previews at 96 px, three sprite pixels per sprite pixel", () => {
    const html = renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />);
    expect(count(html, 'width="96"')).toBe(SPECIES.length);
  });

  it("marks no pet as current on the first run", () => {
    const html = renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />);
    expect(html).not.toContain("Current");
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("marks the pet in use as current", () => {
    const html = renderToStaticMarkup(<PetPicker current="cat" onChoose={noop} />);
    expect(html).toContain("Current");
    expect(html).toContain('aria-label="Cat, current pet"');
    expect(count(html, 'aria-pressed="true"')).toBe(1);
  });

  it("shows Cancel only when switching, never on the first run", () => {
    expect(renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />)).not.toContain("Cancel");
    expect(renderToStaticMarkup(<PetPicker current="monkey" onChoose={noop} onCancel={noop} />)).toContain("Cancel");
  });

  it("tells the player that progress carries over", () => {
    expect(renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />)).toContain(
      "Your level, XP and coins stay when you switch.",
    );
  });

  it("draws the two pets differently", () => {
    const html = renderToStaticMarkup(<PetPicker current={null} onChoose={noop} />);
    const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
    expect(svgs).toHaveLength(2);
    expect(svgs[0]).not.toBe(svgs[1]);
  });
});

describe("CharacterPanel and the pet choice", () => {
  it("shows the picker, and no pet, when none was chosen yet", () => {
    const html = renderWith({ species: null, settingsLoaded: true }, <CharacterPanel />);
    expect(html).toContain("Choose your pet");
    expect(html).not.toContain('class="pet"');
    expect(html).not.toContain("Change pet");
    expect(html).toContain(">Pet<");
  });

  it("shows neither the picker nor a pet until the saved choice has loaded", () => {
    const html = renderWith({ species: null, settingsLoaded: false }, <CharacterPanel />);
    expect(html).not.toContain("Choose your pet");
    expect(html).not.toContain('class="pet"');
    expect(html).toContain("h-48 w-48"); // an empty box the size of the pet
  });

  it("shows the monkey, a Change pet button and the right title for a monkey player", () => {
    const html = renderWith({ species: "monkey", settingsLoaded: true }, <CharacterPanel />);
    expect(html).toContain('class="pet"');
    // The mood comes from the real clock (sleepy late at night), so only species and stage are checked.
    expect(html).toContain('aria-label="monkey, stage 1, feeling');
    expect(html).toContain("Change pet");
    expect(html).not.toContain("Choose your pet");
    expect(html).toContain(">Monkey<");
  });

  it("shows the cat for a cat player", () => {
    const html = renderWith({ species: "cat", settingsLoaded: true }, <CharacterPanel />);
    expect(html).toContain('aria-label="cat, stage 1, feeling');
    expect(html).toContain(">Cat<");
  });

  it("keeps level, XP, coins and streak the same whichever pet is shown", () => {
    const state = { totals: { xp: 150, coins: 85 }, streak: 4, settingsLoaded: true };
    for (const species of ["monkey", "cat"] as const) {
      const html = renderWith({ ...state, species }, <CharacterPanel />);
      expect(html).toContain("LVL 2");
      expect(html).toContain("50 / 283 XP");
      expect(html).toContain('text-coin">85<');
      expect(html).toContain('text-streak">4 d<');
    }
  });

  it("still shows level, XP and the tiles while the picker is open", () => {
    const html = renderWith({ species: null, settingsLoaded: true, totals: { xp: 0, coins: 0 } }, <CharacterPanel />);
    expect(html).toContain("LVL 1");
    expect(html).toContain("0 / 100 XP");
  });
});
