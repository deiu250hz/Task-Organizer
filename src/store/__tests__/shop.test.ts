import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Item, OwnedItem } from "../../domain/types";
import { rewardRepo } from "../../repositories/rewardRepo";
import { shopRepo } from "../../repositories/shopRepo";
import { useAppStore } from "../useAppStore";

vi.mock("../../repositories/shopRepo", () => ({
  shopRepo: { listItems: vi.fn(), listOwned: vi.fn(), purchase: vi.fn(), setEquipped: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: {
    totals: vi.fn(),
    activeDaysSinceLastReset: vi.fn(),
    completedCount: vi.fn(),
    lastCompletionAt: vi.fn(),
  },
}));

const TODAY = "2026-11-14";
const glasses: Item = { id: 1, slot: "glasses", name: "Round Glasses", price: 10, minLevel: 1, assetKey: "glasses_round" };
const laptop: Item = { id: 2, slot: "held", name: "Laptop", price: 20, minLevel: 1, assetKey: "laptop" };
const fancy: Item = { id: 3, slot: "glasses", name: "Fancy", price: 5, minLevel: 9, assetKey: "glasses_fancy" };

const purchase = vi.mocked(shopRepo.purchase);
const setEquipped = vi.mocked(shopRepo.setEquipped);
const listOwned = vi.mocked(shopRepo.listOwned);
const totals = vi.mocked(rewardRepo.totals);

// A tiny stand-in for the database: the repositories read and write these variables.
let ledgerCoins = 0;
let inventory: OwnedItem[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  ledgerCoins = 50;
  inventory = [];
  vi.mocked(shopRepo.listItems).mockResolvedValue([glasses, laptop, fancy]);
  listOwned.mockImplementation(async () => inventory.map((entry) => ({ ...entry })));
  purchase.mockImplementation(async (item) => {
    ledgerCoins -= item.price;
    inventory.push({ itemId: item.id, equipped: false });
  });
  setEquipped.mockImplementation(async (id, equipped) => {
    inventory = inventory.map((entry) => (entry.itemId === id ? { ...entry, equipped } : entry));
  });
  totals.mockImplementation(async () => ({ xp: 0, coins: ledgerCoins }));
  vi.mocked(rewardRepo.activeDaysSinceLastReset).mockResolvedValue([]);
  vi.mocked(rewardRepo.lastCompletionAt).mockResolvedValue(null);
  useAppStore.setState({
    today: TODAY,
    totals: { xp: 0, coins: 50 },
    items: [glasses, laptop, fancy],
    owned: [],
    oneShots: [],
    error: null,
  });
});

describe("loadShop", () => {
  it("reads the items and the inventory", async () => {
    inventory = [{ itemId: 2, equipped: true }];
    useAppStore.setState({ items: [], owned: [] });
    await useAppStore.getState().loadShop();
    expect(useAppStore.getState().items).toHaveLength(3);
    expect(useAppStore.getState().owned).toEqual([{ itemId: 2, equipped: true }]);
  });

  it("records an error when a repository fails", async () => {
    vi.mocked(shopRepo.listItems).mockRejectedValue("db locked");
    await useAppStore.getState().loadShop();
    expect(useAppStore.getState().error).toBe("db locked");
  });
});

describe("purchaseItem", () => {
  it("charges, gives and wears the item, in that order", async () => {
    const ok = await useAppStore.getState().purchaseItem(1);
    expect(ok).toBe(true);
    expect(purchase).toHaveBeenCalledWith(glasses, TODAY);
    expect(setEquipped).toHaveBeenCalledWith(1, true);
    expect(purchase.mock.invocationCallOrder[0]).toBeLessThan(setEquipped.mock.invocationCallOrder[0]);
    expect(useAppStore.getState().owned).toEqual([{ itemId: 1, equipped: true }]);
  });

  it("re-reads the coins from the ledger instead of subtracting locally", async () => {
    await useAppStore.getState().purchaseItem(1);
    expect(totals).toHaveBeenCalled();
    expect(useAppStore.getState().totals.coins).toBe(40);
  });

  it("queues the equip hop", async () => {
    await useAppStore.getState().purchaseItem(1);
    expect(useAppStore.getState().oneShots.map((shot) => shot.kind)).toEqual(["equip"]);
  });

  it("works with exactly the price in coins", async () => {
    ledgerCoins = 10;
    useAppStore.setState({ totals: { xp: 0, coins: 10 } });
    expect(await useAppStore.getState().purchaseItem(1)).toBe(true);
    expect(useAppStore.getState().totals.coins).toBe(0);
  });

  it("refuses when coins are short and calls no repository", async () => {
    useAppStore.setState({ totals: { xp: 0, coins: 9 } });
    expect(await useAppStore.getState().purchaseItem(1)).toBe(false);
    expect(useAppStore.getState().error).toBe("Not enough coins");
    expect(purchase).not.toHaveBeenCalled();
    expect(setEquipped).not.toHaveBeenCalled();
  });

  it("refuses below the required level", async () => {
    expect(await useAppStore.getState().purchaseItem(3)).toBe(false);
    expect(useAppStore.getState().error).toBe("Reach level 9 to buy this");
    expect(purchase).not.toHaveBeenCalled();
  });

  it("refuses an item that is already owned", async () => {
    useAppStore.setState({ owned: [{ itemId: 1, equipped: false }] });
    expect(await useAppStore.getState().purchaseItem(1)).toBe(false);
    expect(useAppStore.getState().error).toBe("You already own this item");
    expect(purchase).not.toHaveBeenCalled();
  });

  it("refuses an unknown id", async () => {
    expect(await useAppStore.getState().purchaseItem(99)).toBe(false);
    expect(useAppStore.getState().error).toBe("Unknown item");
    expect(purchase).not.toHaveBeenCalled();
  });

  it("ignores a second click while the first purchase is still running", async () => {
    const first = useAppStore.getState().purchaseItem(1);
    const second = useAppStore.getState().purchaseItem(1);
    expect(await second).toBe(false);
    expect(await first).toBe(true);
    expect(purchase).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().oneShots).toHaveLength(1);
  });

  it("reports failure and no hop when the database did not give the item", async () => {
    purchase.mockResolvedValue(undefined); // the guarded SQL refused: nothing charged, nothing given
    expect(await useAppStore.getState().purchaseItem(1)).toBe(false);
    expect(useAppStore.getState().error).toBe("The purchase did not go through");
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("records the error and plays no hop when the repository fails", async () => {
    purchase.mockRejectedValue("disk full");
    expect(await useAppStore.getState().purchaseItem(1)).toBe(false);
    expect(useAppStore.getState().error).toBe("disk full");
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("lets the player try again after a failure", async () => {
    purchase.mockRejectedValueOnce("disk full");
    await useAppStore.getState().purchaseItem(1);
    expect(await useAppStore.getState().purchaseItem(1)).toBe(true);
  });

  it("swaps the worn item when two items share a slot", async () => {
    setEquipped.mockImplementation(async (id, equipped) => {
      const slot = [glasses, laptop, fancy].find((item) => item.id === id)?.slot;
      inventory = inventory.map((entry) => {
        const entrySlot = [glasses, laptop, fancy].find((item) => item.id === entry.itemId)?.slot;
        if (entry.itemId === id) return { ...entry, equipped };
        return equipped && entrySlot === slot ? { ...entry, equipped: false } : entry;
      });
    });
    inventory = [{ itemId: 3, equipped: true }];
    useAppStore.setState({ owned: [{ itemId: 3, equipped: true }] });
    await useAppStore.getState().purchaseItem(1);
    expect(useAppStore.getState().owned).toEqual([
      { itemId: 3, equipped: false },
      { itemId: 1, equipped: true },
    ]);
  });
});

describe("toggleEquip", () => {
  beforeEach(() => {
    inventory = [{ itemId: 1, equipped: false }];
    useAppStore.setState({ owned: [{ itemId: 1, equipped: false }] });
  });

  it("wears an owned item and queues the hop", async () => {
    await useAppStore.getState().toggleEquip(1);
    expect(setEquipped).toHaveBeenCalledWith(1, true);
    expect(useAppStore.getState().owned).toEqual([{ itemId: 1, equipped: true }]);
    expect(useAppStore.getState().oneShots.map((shot) => shot.kind)).toEqual(["equip"]);
  });

  it("takes a worn item off silently", async () => {
    inventory = [{ itemId: 1, equipped: true }];
    useAppStore.setState({ owned: [{ itemId: 1, equipped: true }] });
    await useAppStore.getState().toggleEquip(1);
    expect(setEquipped).toHaveBeenCalledWith(1, false);
    expect(useAppStore.getState().owned).toEqual([{ itemId: 1, equipped: false }]);
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("ignores an item that is not owned", async () => {
    await useAppStore.getState().toggleEquip(2);
    expect(setEquipped).not.toHaveBeenCalled();
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("ignores an unknown id", async () => {
    await useAppStore.getState().toggleEquip(99);
    expect(setEquipped).not.toHaveBeenCalled();
  });

  it("records the error and plays no hop when the repository fails", async () => {
    setEquipped.mockRejectedValue("disk full");
    await useAppStore.getState().toggleEquip(1);
    expect(useAppStore.getState().error).toBe("disk full");
    expect(useAppStore.getState().oneShots).toEqual([]);
  });
});
