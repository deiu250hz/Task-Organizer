-- Phase 6: the shop.
-- reward_events.item_id links a 'purchase' event to the item it paid for. That link is what makes
-- a purchase safe to retry: "was this item already paid for?" becomes a lookup in the ledger.
ALTER TABLE reward_events ADD COLUMN item_id INTEGER REFERENCES items(id);

INSERT INTO items (slot, name, price, min_level, asset_key) VALUES
  ('glasses', 'Round Glasses', 10, 1, 'glasses_round'),
  ('held',    'Laptop',        20, 1, 'laptop');
