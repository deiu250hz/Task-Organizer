import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shopEntries, type ShopEntry } from "../../../domain/shop";
import type { Item, OwnedItem } from "../../../domain/types";
import { CharacterPanel } from "../../character/CharacterPanel";
import { PanelTabs } from "../../character/PanelTabs";
import { renderWith } from "../../__tests__/renderWithStore";
import { ItemCard } from "../ItemCard";
import { ShopPanel } from "../ShopPanel";

const glasses: Item = { id: 1, slot: "glasses", name: "Round Glasses", price: 10, minLevel: 1, assetKey: "glasses_round" };
const laptop: Item = { id: 2, slot: "held", name: "Laptop", price: 20, minLevel: 1, assetKey: "laptop" };
const fancy: Item = { id: 3, slot: "glasses", name: "Fancy", price: 50, minLevel: 5, assetKey: "glasses_fancy" };
const noop = () => undefined;
const count = (text: string, needle: string) => text.split(needle).length - 1;

function entryFor(item: Item, owned: OwnedItem[], coins: number, level: number): ShopEntry {
  return shopEntries([item], owned, coins, level)[0];
}

function card(entry: ShopEntry): string {
  return renderToStaticMarkup(<ItemCard entry={entry} onBuy={noop} onToggleEquip={noop} />);
}

describe("ItemCard", () => {
  it("offers an enabled Buy with the price for an affordable item", () => {
    const html = card(entryFor(glasses, [], 10, 1));
    expect(html).toContain("Round Glasses");
    expect(html).toContain('aria-label="Buy Round Glasses for 10 coins"');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain("Glasses");
    expect(html).toContain('text-coin">10<');
  });

  it("disables Buy and says how many coins are missing", () => {
    const html = card(entryFor(laptop, [], 15, 1));
    expect(html).toContain('disabled=""');
    expect(html).toContain("Need 5 more coins");
    expect(html).toContain('aria-describedby="shop-note-2"');
    expect(html).toContain('id="shop-note-2"');
  });

  it("uses the singular for one missing coin", () => {
    expect(card(entryFor(glasses, [], 9, 1))).toContain("Need 1 more coin<");
  });

  it("disables Buy and shows the level that unlocks the item", () => {
    const html = card(entryFor(fancy, [], 999, 2));
    expect(html).toContain('disabled=""');
    expect(html).toContain("Unlocks at level 5");
  });

  it("offers Equip for an owned item that is not worn, and no Buy", () => {
    const html = card(entryFor(laptop, [{ itemId: 2, equipped: false }], 0, 1));
    expect(html).toContain('aria-label="Equip Laptop"');
    expect(html).not.toContain("Buy");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("coins"); // no price once owned
  });

  it("offers Unequip and marks a worn item as equipped", () => {
    const html = card(entryFor(laptop, [{ itemId: 2, equipped: true }], 0, 1));
    expect(html).toContain('aria-label="Unequip Laptop"');
    expect(html).toContain("Equipped");
  });

  it("draws the item's icon, and none for an asset key it does not know", () => {
    expect(card(entryFor(laptop, [], 0, 1))).toContain("<svg");
    const unknown: Item = { ...laptop, assetKey: "from_the_future" };
    expect(card(entryFor(unknown, [], 0, 1))).not.toContain("<svg");
  });

  it("draws the icons at whole multiples of their width", () => {
    expect(card(entryFor(laptop, [], 0, 1))).toContain('width="48"'); // 12 px wide x 4
    expect(card(entryFor(glasses, [], 0, 1))).toContain('width="50"'); // 10 px wide x 5, as many as fit in 52 px
  });
});

describe("ItemCard icons of every size", () => {
  const sizes: [string, string][] = [
    ["knit_beanie", 'width="48" height="16"'], // 12 x 4 at x4
    ["party_hat", 'width="48" height="24"'], // 8 x 4 at x6
    ["gold_crown", 'width="44" height="16"'], // 11 x 4 at x4
    ["sunglasses", 'width="50" height="25"'], // 10 x 5 at x5
    ["monocle", 'width="50" height="30"'], // 10 x 6 at x5
    ["coffee_cup", 'width="45" height="30"'], // 9 x 6 at x5
    ["clipboard", 'width="48" height="48"'], // 8 x 8 at x6
    ["game_controller", 'width="48" height="24"'], // 12 x 6 at x4
    ["night_sky", 'width="48" height="48"'], // the 16 x 16 thumbnail at x3
    ["sunny_meadow", 'width="48" height="48"'],
  ];

  it("draws every icon crisp (a whole number of screen pixels per sprite pixel) and inside the 54 px box", () => {
    sizes.forEach(([assetKey, expected], i) => {
      const item: Item = { id: 100 + i, slot: "hat", name: assetKey, price: 10, minLevel: 1, assetKey };
      const html = card(entryFor(item, [], 0, 1));
      expect(html, assetKey).toContain(expected);
      const width = Number(/<svg width="(\d+)"/.exec(html)?.[1]);
      expect(width, assetKey).toBeLessThanOrEqual(52);
    });
  });
});

describe("PanelTabs", () => {
  it("marks the active tab and keeps only it in the Tab order", () => {
    const html = renderToStaticMarkup(<PanelTabs active="shop" onChange={noop} />);
    expect(html).toContain('role="tablist"');
    expect(count(html, 'role="tab"')).toBe(2);
    expect(count(html, 'aria-selected="true"')).toBe(1);
    expect(count(html, 'tabindex="-1"')).toBe(1);
    expect(html).toMatch(/id="pet-tab-shop"[^>]*aria-selected="true"/);
  });

  it("points every tab at the content area", () => {
    expect(count(renderToStaticMarkup(<PanelTabs active="stats" onChange={noop} />), 'aria-controls="pet-tabpanel"')).toBe(2);
  });
});

describe("ShopPanel", () => {
  const state = { items: [glasses, laptop, fancy] };

  it("shows the coin balance and one card per item", () => {
    const html = renderWith({ ...state, totals: { xp: 0, coins: 25 } }, <ShopPanel />);
    expect(html).toContain('text-coin">25<');
    expect(count(html, "<li")).toBe(3);
  });

  it("reflects what the player can afford and what is owned", () => {
    const html = renderWith(
      { ...state, totals: { xp: 0, coins: 12 }, owned: [{ itemId: 2, equipped: true }] },
      <ShopPanel />,
    );
    expect(html).toContain('aria-label="Buy Round Glasses for 10 coins"'); // affordable
    expect(html).toContain('aria-label="Unequip Laptop"'); // owned and worn
    expect(html).toContain("Unlocks at level 5"); // fancy: locked by level
  });

  it("groups the items under a heading per slot, in a fixed order", () => {
    const beanie: Item = { id: 3, slot: "hat", name: "Knit Beanie", price: 25, minLevel: 1, assetKey: "knit_beanie" };
    const sky: Item = { id: 4, slot: "background", name: "Night Sky", price: 80, minLevel: 4, assetKey: "night_sky" };
    const html = renderWith({ items: [sky, laptop, glasses, beanie] }, <ShopPanel />);
    const headings = [...html.matchAll(/<h4[^>]*>([^<]+)<\/h4>/g)].map((m) => m[1]);
    expect(headings).toEqual(["Hats", "Glasses", "Held items", "Backgrounds"]);
    expect(count(html, "<li")).toBe(4);
    expect(count(html, "<section")).toBe(4);
  });

  it("leaves out the heading of a slot that has no items", () => {
    const html = renderWith({ items: [glasses] }, <ShopPanel />);
    expect(html).toContain(">Glasses<");
    expect(html).not.toContain(">Hats<");
    expect(html).not.toContain(">Backgrounds<");
  });

  it("links every group to its heading for screen readers", () => {
    const html = renderWith({ items: [glasses, laptop] }, <ShopPanel />);
    expect(html).toContain('aria-labelledby="shop-group-glasses"');
    expect(html).toContain('id="shop-group-glasses"');
    expect(html).toContain('aria-labelledby="shop-group-held"');
  });

  it("says so when there is nothing for sale", () => {
    expect(renderWith({ items: [] }, <ShopPanel />)).toContain("Nothing for sale yet.");
  });

  it("does not show a task error in the shop", () => {
    expect(renderWith({ ...state, error: "disk full" }, <ShopPanel />)).not.toContain("disk full");
  });
});

describe("CharacterPanel with the shop", () => {
  const items = [glasses, laptop];

  it("keeps the pet and the tabs outside the scrolling tab content", () => {
    const html = renderWith({ items }, <CharacterPanel />);
    expect(html).toContain("flex h-full min-h-0 flex-col");
    expect(html).toMatch(/id="pet-tabpanel"[^>]*class="[^"]*overflow-y-auto/);
  });

  it("opens on the Stats tab", () => {
    const html = renderWith({ items, totals: { xp: 0, coins: 5 } }, <CharacterPanel />);
    expect(html).toContain("LVL 1");
    expect(html).toContain('id="pet-tab-stats"');
    expect(html).not.toContain("Your coins");
  });

  it("dresses the pet in what is equipped", () => {
    const worn = renderWith({ items, owned: [{ itemId: 1, equipped: true }] }, <CharacterPanel />);
    const bare = renderWith({ items, owned: [{ itemId: 1, equipped: false }] }, <CharacterPanel />);
    expect(worn).toContain('fill="#3a78c2"');
    expect(bare).not.toContain('fill="#3a78c2"');
  });

  it("dresses the cat too", () => {
    const html = renderWith({ items, species: "cat", owned: [{ itemId: 2, equipped: true }] }, <CharacterPanel />);
    expect(html).toContain('fill="#1c1f2b"');
  });
});
