-- Ten more shop items: three hats, two pairs of glasses, three held items, two backgrounds.
-- asset_key must match a drawing in src/components/character/accessories (a test checks it).
-- They get ids 3 to 12 in this order; items 1 and 2 (003_shop.sql) are untouched.
INSERT INTO items (slot, name, price, min_level, asset_key) VALUES
  ('hat',        'Knit Beanie',     25, 1,  'knit_beanie'),
  ('hat',        'Party Hat',       40, 2,  'party_hat'),
  ('hat',        'Gold Crown',     150, 10, 'gold_crown'),
  ('glasses',    'Sunglasses',      40, 3,  'sunglasses'),
  ('glasses',    'Monocle',         60, 5,  'monocle'),
  ('held',       'Coffee Cup',      20, 1,  'coffee_cup'),
  ('held',       'Clipboard',       35, 2,  'clipboard'),
  ('held',       'Game Controller', 70, 5,  'game_controller'),
  ('background', 'Night Sky',       80, 4,  'night_sky'),
  ('background', 'Sunny Meadow',   100, 6,  'sunny_meadow');
