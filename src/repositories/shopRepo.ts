import type { ISODate, Item, OwnedItem, Slot } from "../domain/types";
import { getDb } from "./db";

// Contract from PLAN.md section 5.
export interface ShopRepo {
  listItems(): Promise<Item[]>;
  listOwned(): Promise<OwnedItem[]>;
  /** Charges the price once and gives the item. Safe to retry; see the comment on purchase. */
  purchase(item: Item, today: ISODate): Promise<void>;
  /** Equipping first unequips whatever else is worn in the same slot. Unowned items are ignored. */
  setEquipped(itemId: number, equipped: boolean): Promise<void>;
}

interface ItemRow {
  id: number;
  slot: string;
  name: string;
  price: number;
  min_level: number;
  asset_key: string;
}

interface OwnedRow {
  item_id: number;
  equipped: number;
}

function rowToItem(row: ItemRow): Item {
  return {
    id: row.id,
    // The table's CHECK constraint guarantees the slot value, so the cast is safe.
    slot: row.slot as Slot,
    name: row.name,
    price: row.price,
    minLevel: row.min_level,
    assetKey: row.asset_key,
  };
}

async function listItems(): Promise<Item[]> {
  const db = await getDb();
  const rows = await db.select<ItemRow[]>(
    "SELECT id, slot, name, price, min_level, asset_key FROM items ORDER BY id",
  );
  return rows.map(rowToItem);
}

async function listOwned(): Promise<OwnedItem[]> {
  const db = await getDb();
  const rows = await db.select<OwnedRow[]>("SELECT item_id, equipped FROM inventory ORDER BY item_id");
  return rows.map((row) => ({ itemId: row.item_id, equipped: row.equipped === 1 }));
}

/*
 * Same pattern as taskRepo.complete: two writes the plugin cannot make one transaction, so they
 * are ordered and guarded so that a retry is safe.
 *   1. charge: a negative-coins 'purchase' event that names the item (item_id), but only if this
 *      item was never paid for AND the balance covers the price. The price comes from the items
 *      table, not from the caller, so a stale or tampered `item` object cannot change what is charged.
 *   2. give: add the inventory row, but only if a purchase event for the item exists.
 * If step 2 fails, calling purchase() again skips the charge (already paid) and completes the
 * give, so the player is never charged twice and never gets an item for free. A double click does
 * the same: the second charge finds the first one and writes nothing.
 */
async function purchase(item: Item, today: ISODate): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO reward_events (task_id, xp, coins, reason, day, created_at, item_id)
     SELECT NULL, 0, -price, 'purchase', $2, $3, id FROM items
     WHERE id = $1
       AND NOT EXISTS (SELECT 1 FROM reward_events WHERE reason = 'purchase' AND item_id = $1)
       AND (SELECT COALESCE(SUM(coins), 0) FROM reward_events) >= price`,
    [item.id, today, new Date().toISOString()],
  );
  await db.execute(
    `INSERT OR IGNORE INTO inventory (item_id, purchased_on, equipped)
     SELECT $1, $2, 0
     WHERE EXISTS (SELECT 1 FROM reward_events WHERE reason = 'purchase' AND item_id = $1)`,
    [item.id, today],
  );
}

/*
 * Two writes again. Equipping first frees the slot (only when the target is really owned, so
 * a bad id can never strip a worn item), then sets the target. If the second write fails the
 * slot is simply empty, which is a valid state, and the user can equip again.
 */
async function setEquipped(itemId: number, equipped: boolean): Promise<void> {
  const db = await getDb();
  if (equipped) {
    await db.execute(
      `UPDATE inventory SET equipped = 0
       WHERE item_id != $1
         AND EXISTS (SELECT 1 FROM inventory WHERE item_id = $1)
         AND item_id IN (SELECT id FROM items WHERE slot = (SELECT slot FROM items WHERE id = $1))`,
      [itemId],
    );
  }
  await db.execute("UPDATE inventory SET equipped = $2 WHERE item_id = $1", [itemId, equipped ? 1 : 0]);
}

export const shopRepo: ShopRepo = { listItems, listOwned, purchase, setEquipped };
