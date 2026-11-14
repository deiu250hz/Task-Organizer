CREATE TABLE tasks (
  id             INTEGER PRIMARY KEY,
  title          TEXT    NOT NULL,
  notes          TEXT,
  start_date     TEXT    NOT NULL,              -- local 'YYYY-MM-DD'
  end_date       TEXT    NOT NULL,              -- = start_date for one-day tasks
  difficulty     INTEGER NOT NULL CHECK (difficulty IN (1, 2, 3)),
  status         TEXT    NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'done', 'archived')),
  overdue_flagged INTEGER NOT NULL DEFAULT 0,   -- 1 once its streak reset was applied
  completed_on   TEXT,                          -- local 'YYYY-MM-DD', NULL until done
  created_at     TEXT    NOT NULL,              -- UTC ISO timestamp, audit only
  CHECK (end_date >= start_date)
);

CREATE TABLE reward_events (                    -- append-only ledger
  id         INTEGER PRIMARY KEY,
  task_id    INTEGER REFERENCES tasks(id),
  xp         INTEGER NOT NULL,                  -- >= 0
  coins      INTEGER NOT NULL,                  -- negative for purchases
  reason     TEXT    NOT NULL
             CHECK (reason IN ('task_done', 'purchase', 'streak_reset')),
  day        TEXT    NOT NULL,                  -- local 'YYYY-MM-DD' the event belongs to
  created_at TEXT    NOT NULL                   -- UTC ISO timestamp, audit only
);

CREATE TABLE items (
  id        INTEGER PRIMARY KEY,
  slot      TEXT    NOT NULL CHECK (slot IN ('hat', 'glasses', 'held', 'background')),
  name      TEXT    NOT NULL,
  price     INTEGER NOT NULL CHECK (price >= 0),
  min_level INTEGER NOT NULL DEFAULT 1,
  asset_key TEXT    NOT NULL UNIQUE             -- maps to components/character/accessories/
);

CREATE TABLE inventory (
  item_id      INTEGER PRIMARY KEY REFERENCES items(id),
  purchased_on TEXT    NOT NULL,                -- local 'YYYY-MM-DD'
  equipped     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tasks_dates   ON tasks(start_date, end_date);
CREATE INDEX idx_tasks_status  ON tasks(status, end_date);
CREATE INDEX idx_rewards_day   ON reward_events(day);
