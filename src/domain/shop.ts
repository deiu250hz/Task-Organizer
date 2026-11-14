// Shop rules. Pure: no clock, no I/O. Coins and level are parameters.
import type { Equipped, Item, OwnedItem, Slot } from "./types";

export type PurchaseCheck = { ok: true } | { ok: false; reason: "owned" | "level" | "coins" };

/** Can the player buy this item now? Reasons are checked in a fixed order: owned, level, coins. */
export function canPurchase(item: Item, coins: number, level: number, owned: boolean): PurchaseCheck {
  if (owned) return { ok: false, reason: "owned" };
  if (level < item.minLevel) return { ok: false, reason: "level" };
  if (coins < item.price) return { ok: false, reason: "coins" };
  return { ok: true };
}

const EMPTY_EQUIPPED: Equipped = { hat: null, glasses: null, held: null, background: null };

/**
 * Which asset is worn in each slot. Items that are not owned, or owned but not equipped, are ignored.
 * If two equipped items share a slot (should not happen, the repository prevents it) the lowest
 * item id wins, so the result never depends on the order of the arrays.
 */
export function equippedMap(items: Item[], owned: OwnedItem[]): Equipped {
  const result: Equipped = { ...EMPTY_EQUIPPED };
  const chosenId: Partial<Record<Slot, number>> = {};
  for (const entry of owned) {
    if (!entry.equipped) continue;
    const item = items.find((candidate) => candidate.id === entry.itemId);
    if (item === undefined) continue;
    const current = chosenId[item.slot];
    if (current === undefined || item.id < current) {
      chosenId[item.slot] = item.id;
      result[item.slot] = item.assetKey;
    }
  }
  return result;
}

export type ShopState = "buy" | "locked-level" | "locked-coins" | "equip" | "unequip";

export interface ShopEntry {
  item: Item;
  state: ShopState;
  /** Coins still missing for a "locked-coins" item, otherwise 0. */
  missingCoins: number;
  /** The level an item needs (always filled, so the UI can say "Unlocks at level N"). */
  requiredLevel: number;
}

/** What each shop card should show and offer, in the order of `items`. */
export function shopEntries(items: Item[], owned: OwnedItem[], coins: number, level: number): ShopEntry[] {
  return items.map((item) => {
    const own = owned.find((entry) => entry.itemId === item.id);
    const base = { item, requiredLevel: item.minLevel };
    if (own !== undefined) {
      return { ...base, state: own.equipped ? "unequip" : "equip", missingCoins: 0 } satisfies ShopEntry;
    }
    const check = canPurchase(item, coins, level, false);
    if (check.ok) return { ...base, state: "buy", missingCoins: 0 } satisfies ShopEntry;
    if (check.reason === "level") return { ...base, state: "locked-level", missingCoins: 0 } satisfies ShopEntry;
    return { ...base, state: "locked-coins", missingCoins: item.price - coins } satisfies ShopEntry;
  });
}
