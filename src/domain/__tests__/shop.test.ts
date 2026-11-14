import { describe, expect, it } from "vitest";
import { canPurchase, equippedMap, shopEntries } from "../shop";
import type { Item, OwnedItem } from "../types";

const glasses: Item = { id: 1, slot: "glasses", name: "Round Glasses", price: 10, minLevel: 1, assetKey: "glasses_round" };
const laptop: Item = { id: 2, slot: "held", name: "Laptop", price: 20, minLevel: 1, assetKey: "laptop" };
const fancy: Item = { id: 3, slot: "glasses", name: "Fancy", price: 50, minLevel: 5, assetKey: "glasses_fancy" };

describe("canPurchase", () => {
  it("allows an affordable, unlocked, unowned item", () => {
    expect(canPurchase(glasses, 50, 1, false)).toEqual({ ok: true });
  });

  it("allows it with exactly the price in coins", () => {
    expect(canPurchase(glasses, 10, 1, false)).toEqual({ ok: true });
  });

  it("refuses one coin short", () => {
    expect(canPurchase(glasses, 9, 1, false)).toEqual({ ok: false, reason: "coins" });
  });

  it("refuses below the required level and allows exactly at it", () => {
    expect(canPurchase(fancy, 100, 4, false)).toEqual({ ok: false, reason: "level" });
    expect(canPurchase(fancy, 100, 5, false)).toEqual({ ok: true });
  });

  it("refuses an owned item, even when level and coins would be fine", () => {
    expect(canPurchase(glasses, 100, 9, true)).toEqual({ ok: false, reason: "owned" });
  });

  it("reports owned before level, and level before coins", () => {
    expect(canPurchase(fancy, 0, 1, true)).toEqual({ ok: false, reason: "owned" });
    expect(canPurchase(fancy, 0, 1, false)).toEqual({ ok: false, reason: "level" });
  });
});

describe("equippedMap", () => {
  const items = [glasses, laptop, fancy];

  it("is empty when nothing is owned", () => {
    expect(equippedMap(items, [])).toEqual({ hat: null, glasses: null, held: null, background: null });
  });

  it("fills the slot of an equipped item", () => {
    const owned: OwnedItem[] = [{ itemId: 1, equipped: true }];
    expect(equippedMap(items, owned)).toEqual({ hat: null, glasses: "glasses_round", held: null, background: null });
  });

  it("fills two different slots", () => {
    const owned: OwnedItem[] = [
      { itemId: 1, equipped: true },
      { itemId: 2, equipped: true },
    ];
    const map = equippedMap(items, owned);
    expect(map.glasses).toBe("glasses_round");
    expect(map.held).toBe("laptop");
  });

  it("ignores owned items that are not equipped", () => {
    expect(equippedMap(items, [{ itemId: 2, equipped: false }]).held).toBeNull();
  });

  it("ignores an inventory row whose item is unknown", () => {
    expect(equippedMap(items, [{ itemId: 99, equipped: true }])).toEqual({
      hat: null,
      glasses: null,
      held: null,
      background: null,
    });
  });

  it("picks the lowest id when two equipped items share a slot, in any order", () => {
    const a: OwnedItem[] = [
      { itemId: 3, equipped: true },
      { itemId: 1, equipped: true },
    ];
    expect(equippedMap(items, a).glasses).toBe("glasses_round");
    expect(equippedMap(items, [...a].reverse()).glasses).toBe("glasses_round");
  });
});

describe("shopEntries", () => {
  const items = [glasses, laptop, fancy];

  it("keeps the order of the items", () => {
    expect(shopEntries(items, [], 0, 1).map((entry) => entry.item.id)).toEqual([1, 2, 3]);
  });

  it("offers Buy when affordable and shows the missing coins otherwise", () => {
    const entries = shopEntries(items, [], 15, 1);
    expect(entries[0]).toMatchObject({ state: "buy", missingCoins: 0 });
    expect(entries[1]).toMatchObject({ state: "locked-coins", missingCoins: 5 });
  });

  it("locks by level and reports the level needed", () => {
    const entry = shopEntries(items, [], 1000, 1)[2];
    expect(entry).toMatchObject({ state: "locked-level", requiredLevel: 5, missingCoins: 0 });
  });

  it("offers Equip or Unequip for owned items, never Buy", () => {
    const owned: OwnedItem[] = [
      { itemId: 1, equipped: true },
      { itemId: 2, equipped: false },
    ];
    const entries = shopEntries(items, owned, 1000, 9);
    expect(entries[0].state).toBe("unequip");
    expect(entries[1].state).toBe("equip");
  });

  it("keeps an owned item usable even when the player no longer has the coins", () => {
    expect(shopEntries(items, [{ itemId: 2, equipped: false }], 0, 1)[1].state).toBe("equip");
  });
});
