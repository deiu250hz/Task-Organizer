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
    expect(card(entryFor(glasses, [], 0, 1))).toContain('width="40"'); // 10 px wide x 4
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

  it("says so when there is nothing for sale", () => {
    expect(renderWith({ items: [] }, <ShopPanel />)).toContain("Nothing for sale yet.");
  });

  it("does not show a task error in the shop", () => {
    expect(renderWith({ ...state, error: "disk full" }, <ShopPanel />)).not.toContain("disk full");
  });
});

describe("CharacterPanel with the shop", () => {
  const items = [glasses, laptop];

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
