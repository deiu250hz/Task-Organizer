-- Preferences, not game progress: which pet the player chose, and later other small settings.
-- XP and coins stay derived from reward_events; nothing here is a counter.
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
