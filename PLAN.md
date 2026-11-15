# Tasks Organizor — PLAN

Gamified desktop task widget for Windows: calendar on the left, task list in the middle, an evolving pixel-art monkey on the right. Completing tasks earns XP and coins; XP levels the monkey up and evolves it, coins buy accessories.

Last updated: 2026-11-13

## 1. Locked decisions

| Topic | Decision |
| --- | --- |
| Stack | Tauri 2, React, TypeScript, Vite, Tailwind CSS 4, Zustand, SQLite via `tauri-plugin-sql`, Vitest |
| Character | One fixed character: a retro pixel-art monkey. No character choice. |
| Art pipeline | Code-generated. Layered SVG pixel art in React components with `shape-rendering="crispEdges"`. No sprite sheets, no Rive, no external art files. |
| Dates | Tasks have dates only, stored as local `YYYY-MM-DD` strings. No time of day. |
| Overdue | No XP or coin penalty. An overdue task resets the streak once and makes the monkey `sad` until a task is completed. |
| Totals | XP and coins are never stored as counters. They are `SUM()` over an append-only ledger. |
| Division of labor | Agent: styling (Tailwind, theme tokens) and all pixel art. Andrei: all logic, including React components, plus Tauri/Rust config, SQL, repositories, store, `domain/`. See section 7. |

## 2. Architecture

Four layers. Each layer only calls the one below it.

```
UI (React components)          src/components/
        |  reads state, calls actions
Store (Zustand)                src/store/
        |  orchestrates: domain rule -> repository -> set state
Domain (pure TypeScript)       src/domain/        <- no React, no Tauri, no I/O
Repositories (SQL)             src/repositories/  <- only place that imports the SQL plugin
        |
Tauri shell (Rust) + SQLite    src-tauri/
```

### Boundary rules

| Layer | May import | Must not import |
| --- | --- | --- |
| `components/` | `store/`, `domain/` (types and pure helpers), other components | `repositories/`, `@tauri-apps/plugin-sql` |
| `store/` | `domain/`, `repositories/`, `platform/` | React components |
| `domain/` | `date-fns`, other `domain/` files | React, Zustand, `@tauri-apps/*`, `repositories/`, `store/` |
| `repositories/` | `@tauri-apps/plugin-sql`, `domain/` types | React, `store/`, `components/` |
| `platform/` (Phases 7 and 8) | `@tauri-apps/plugin-notification`, `-dialog`, `-fs` and `@tauri-apps/api/path` (system features other than SQL) | React, `store/`, `components/`, `domain/` |

`platform/` is to system features (notifications, file dialogs, files) what `repositories/` is to SQL: one thin wrapper per feature, called only by the store. `notifier.ts` never throws (a missing toast is harmless); `files.ts` throws errors with readable messages (a backup that silently failed would look like one that worked). The title bar's window buttons call `@tauri-apps/api/window` directly; that predates `platform/` and stays as reference code.

Two extra rules that keep the domain testable:

- Domain functions never read the clock. `today: ISODate` (and `localHour` where needed) are parameters. The store supplies them.
- Domain functions never throw for expected cases (not enough coins, item locked). They return a result value.

### Folder structure

```
tasks-organizor/
├─ PLAN.md
├─ CLAUDE.md
├─ index.html
├─ package.json
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                      # three-panel grid, wires store to panels
│  ├─ index.css                    # @import "tailwindcss"; theme tokens
│  ├─ components/                  # AGENT
│  │  ├─ layout/                   # TitleBar, Panel, SettingsMenu + SettingsPanel + BackupSection (Phases 7 and 8); CompactView is deferred
│  │  ├─ calendar/                 # CalendarPanel (react-day-picker), dateAdapters.ts (the only Date <-> ISODate conversion)
│  │  ├─ tasks/                    # TaskPanel, TaskRow, QuickAdd
│  │  ├─ shop/                     # ShopPanel, ItemCard (Phase 6)
│  │  └─ character/
│  │     ├─ Character.tsx          # implements CharacterProps
│  │     ├─ PanelTabs.tsx          # Stats | Shop tabs under the pet (Phase 6)
│  │     ├─ PixelSprite.tsx        # string grid + palette -> <rect>s
│  │     ├─ composeLayers.ts       # stacks body, face, accessories into one grid
│  │     ├─ oneShotTiming.ts       # one-shot durations shared by the CSS and the safety timeout
│  │     ├─ useCharacterMachine.ts # animation state machine (UI-only)
│  │     ├─ species/               # one folder per pet; the registry in index.ts maps Species to its art
│  │     │  ├─ types.ts            # Species, Palette, Grid, SpeciesArt, GRID_SIZE
│  │     │  ├─ index.ts            # SPECIES registry
│  │     │  └─ monkey/             # palette.ts, stages/stage1..4.ts (bodies), faces/idle|happy|sad|sleepy.ts (overlays per stage)
│  │     ├─ anchors.ts             # eye, held-item and hat positions per species and stage (Phases 6 and 9)
│  │     └─ accessories/           # palette.ts, paste.ts, glasses.ts, laptop.ts, index.ts registry by asset_key (Phase 6)
│  ├─ domain/                      # ANDREI
│  │  ├─ types.ts
│  │  ├─ config.ts                 # every tunable number lives here
│  │  ├─ dates.ts                  # ISODate helpers
│  │  ├─ tasks.ts                  # tasksInRange, anyTaskOn
│  │  ├─ rewards.ts                # rewardFor
│  │  ├─ levels.ts                 # levelFromXp, xpForLevel, stageForLevel
│  │  ├─ streak.ts                 # streakFrom
│  │  ├─ mood.ts                   # moodFor
│  │  ├─ shop.ts                   # canPurchase, equippedMap, shopEntries
│  │  ├─ reminders.ts              # reminderMessage, shouldRemind (Phase 7)
│  │  ├─ backup.ts                 # buildBackup, parseBackup (validation), file names, summaries (Phase 8)
│  │  └─ __tests__/
│  ├─ repositories/                # ANDREI
│  │  ├─ db.ts                     # single Database.load, shared handle
│  │  ├─ taskRepo.ts
│  │  ├─ rewardRepo.ts
│  │  ├─ shopRepo.ts
│  │  └─ backupRepo.ts             # readAll, replaceAll (Phase 8)
│  ├─ platform/                    # notifier.ts (notification plugin), files.ts (dialog and fs plugins): the only importers
│  └─ store/                       # ANDREI
│     ├─ useAppStore.ts
│     ├─ useNow.ts                 # the clock, refreshed every 30 s
│     ├─ useDayWatcher.ts          # asks the store to refresh when the real day changes (Phase 7)
│     ├─ selectors.ts              # useVisibleTasks, useHasTaskOn (derive with useMemo, stable slices only)
│     └─ __tests__/
└─ src-tauri/                      # ANDREI
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/                       # generated from source.png (the monkey's face), Phase 8
   ├─ migrations/001_init.sql ... 004_more_items.sql
   └─ src/lib.rs                   # plugin registration + migrations
```

## 3. Data model (SQLite)

`src-tauri/migrations/001_init.sql`

```sql
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
```

`src-tauri/migrations/002_settings.sql` (preferences, not progress; nothing here is a counter):

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

The chosen pet is saved under the key `species` (`monkey` or `cat`). A missing or unknown value means "not chosen yet" and shows the first-run picker.

`src-tauri/migrations/004_more_items.sql` adds ten more items (ids 3 to 12). Together with the two from 003 the catalogue is:

| id | asset_key | Name | Slot | Price | Level |
| --- | --- | --- | --- | --- | --- |
| 1 | `glasses_round` | Round Glasses | glasses | 10 | 1 |
| 2 | `laptop` | Laptop | held | 20 | 1 |
| 3 | `knit_beanie` | Knit Beanie | hat | 25 | 1 |
| 4 | `party_hat` | Party Hat | hat | 40 | 2 |
| 5 | `gold_crown` | Gold Crown | hat | 150 | 10 |
| 6 | `sunglasses` | Sunglasses | glasses | 40 | 3 |
| 7 | `monocle` | Monocle | glasses | 60 | 5 |
| 8 | `coffee_cup` | Coffee Cup | held | 20 | 1 |
| 9 | `clipboard` | Clipboard | held | 35 | 2 |
| 10 | `game_controller` | Game Controller | held | 70 | 5 |
| 11 | `night_sky` | Night Sky | background | 80 | 4 |
| 12 | `sunny_meadow` | Sunny Meadow | background | 100 | 6 |

Adding an item is a migration row plus a drawing registered under the same `asset_key` in `components/character/accessories/index.ts`; a test reads the migration files and fails if the two ever disagree (a missing drawing, a wrong slot, or a drawing with no row). Prices and levels are tuning values: changing one is a new migration.

`src-tauri/migrations/003_shop.sql` (Phase 6):

```sql
ALTER TABLE reward_events ADD COLUMN item_id INTEGER REFERENCES items(id);  -- which item a 'purchase' event paid for

INSERT INTO items (slot, name, price, min_level, asset_key) VALUES
  ('glasses', 'Round Glasses', 10, 1, 'glasses_round'),
  ('held',    'Laptop',        20, 1, 'laptop');
```

`item_id` is what makes a purchase retry-safe: "was this item already paid for?" is a lookup in the ledger (see section 5). It is NULL for every other kind of event. Prices are testing values and live in the database, so changing one is a new migration, not a code change. The two items fit both pets.

Notes on the schema:

- No time-of-day field exists on tasks. `created_at` columns are audit timestamps and never drive behaviour, with one deliberate exception: the time of the last `task_done` event (`rewardRepo.lastCompletionAt`) decides how long the pet stays happy after a completed task (Phase 5). It is compared in epoch milliseconds, so time zones and DST do not matter.
- `day` on `reward_events` is written by the app in local time. Streak and "completed today" queries group by `day`, so SQL never converts time zones.
- `ISODate` strings compare correctly as text, so `start_date <= :day AND end_date >= :day` works without date functions.
- A task is overdue when `status = 'active' AND end_date < :today`.
- `streak_reset` events carry `xp = 0, coins = 0`. They exist so the streak is derivable from the ledger alone.

### Key queries

| Need | Query shape |
| --- | --- |
| Tasks on a day or range | `WHERE start_date <= :to AND end_date >= :from AND status != 'archived'` |
| Totals | `SELECT COALESCE(SUM(xp),0) AS xp, COALESCE(SUM(coins),0) AS coins FROM reward_events` |
| Active days for streak | `SELECT DISTINCT day FROM reward_events WHERE reason = 'task_done' AND id > COALESCE((SELECT MAX(id) FROM reward_events WHERE reason = 'streak_reset'), 0) ORDER BY day DESC` (cut by ledger order, not by day, so a task completed on the same day as a reset still counts) |
| Newly overdue | `WHERE status = 'active' AND end_date < :today AND overdue_flagged = 0` |

## 4. Domain layer

### Types (`domain/types.ts`)

```ts
export type ISODate = string;                 // local 'YYYY-MM-DD'
export type Difficulty = 1 | 2 | 3;
export type TaskStatus = 'active' | 'done' | 'archived';
export type Slot = 'hat' | 'glasses' | 'held' | 'background';
export type Stage = 1 | 2 | 3 | 4;
export type Mood = 'idle' | 'happy' | 'sad' | 'sleepy';
export type OneShot = 'celebrate' | 'levelUp' | 'evolve' | 'equip';

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  startDate: ISODate;
  endDate: ISODate;
  difficulty: Difficulty;
  status: TaskStatus;
  overdueFlagged: boolean;
  completedOn: ISODate | null;
}

export interface NewTask {
  title: string;
  notes?: string;
  startDate: ISODate;
  endDate: ISODate;
  difficulty: Difficulty;
}

/** Days picked in the calendar, inclusive; from <= to, a single day has from === to. */
export interface DateSelection { from: ISODate; to: ISODate; }

export interface Reward { xp: number; coins: number; }
export interface Totals { xp: number; coins: number; }

export interface Item {
  id: number;
  slot: Slot;
  name: string;
  price: number;
  minLevel: number;
  assetKey: string;
}

export interface OwnedItem { itemId: number; equipped: boolean; }
export type Equipped = Record<Slot, string | null>;   // slot -> assetKey
```

### Function contracts (signatures only; implementation is Andrei's)

```ts
// dates.ts
toISODate(d: Date): ISODate                       // from LOCAL fields, never toISOString()
addDays(day: ISODate, n: number): ISODate         // calendar arithmetic via date-fns; DST-safe
isBetween(day: ISODate, from: ISODate, to: ISODate): boolean          // inclusive
rangesOverlap(aFrom: ISODate, aTo: ISODate, bFrom: ISODate, bTo: ISODate): boolean   // inclusive
formatDayRange(from: ISODate, to: ISODate): string                    // "16 Nov", "16 – 18 Nov"

// tasks.ts
tasksInRange(tasks: Task[], from: ISODate, to: ISODate): Task[]       // tasks overlapping the range
anyTaskOn(tasks: Task[], day: ISODate): boolean                       // drives the calendar dots
canStartOn(startDate: ISODate, today: ISODate): boolean               // a new task must start today or later
canDelete(task: Task): boolean                                        // only ACTIVE tasks can be deleted (archived)

// species.ts
SPECIES = ['monkey', 'cat'] as const;  type Species;  SPECIES_LABEL: Record<Species, string>
isSpecies(value: unknown): value is Species                           // guards the saved choice

// rewards.ts
rewardFor(difficulty: Difficulty, streakDays: number): Reward

// levels.ts
xpForLevel(level: number): number                 // XP needed to go from level to level + 1
levelFromXp(totalXp: number): { level: number; intoLevel: number; needed: number }
stageForLevel(level: number): Stage

// streak.ts
streakFrom(activeDaysDesc: ISODate[], today: ISODate): number

// mood.ts
moodFor(input: {
  overdueCount: number;                         // active tasks that ended before today
  completedToday: number;
  activeDueToday: number;                       // active tasks whose dates include today (today's list)
  localHour: number;
  minutesSinceLastCompletion: number | null;    // null = nothing ever completed; negative counts as just now
}): Mood

// oneShots.ts
oneShotsFor(prevLevel: number, nextLevel: number): { kind: OneShot; toStage?: Stage }[]
// always [celebrate]; + levelUp if the level rose; + evolve (toStage) if the stage rose. Fixed order.

// shop.ts
canPurchase(item: Item, coins: number, level: number, owned: boolean):
  { ok: true } | { ok: false; reason: 'owned' | 'level' | 'coins' }   // checked in that order
equippedMap(items: Item[], owned: OwnedItem[]): Equipped              // slot -> assetKey; lowest id wins if two share a slot
shopEntries(items: Item[], owned: OwnedItem[], coins: number, level: number): ShopEntry[]
// ShopEntry = { item, state: 'buy' | 'locked-level' | 'locked-coins' | 'equip' | 'unequip', missingCoins, requiredLevel }
```

### Rules (starting values, all in `domain/config.ts`)

| Rule | Value |
| --- | --- |
| Base reward | Easy 10 XP / 5 coins, medium 25 / 10, hard 50 / 25 |
| Streak bonus | +10% XP per streak day, capped at +50%. Coins get no bonus. |
| XP for next level | `round(100 * level^1.5)` |
| Evolution stages | Stage 1 at level 1, stage 2 at level 5, stage 3 at level 10, stage 4 at level 25 |
| Streak | Consecutive local days with at least one `task_done`, counted back from today or yesterday, counting only `task_done` rows added after the last `streak_reset` (ledger order). The streak shown in the UI includes today; the XP bonus uses the streak before today, so every task completed on the same day gets the same bonus. |
| Sleepy hour | 22 |
| Happy window | 60 minutes after the last completed task (`HAPPY_AFTER_COMPLETION_MINUTES`) |

### Mood priority

First match wins:

1. `sad` — `overdueCount > 0` and `completedToday === 0`
2. `sleepy` — `completedToday === 0` and `localHour >= 22`
3. `happy` — within 60 minutes of the last completed task, OR `completedToday > 0` and `activeDueToday === 0` (today's whole list is done: happy for the rest of the day)
4. `idle` — otherwise

`activeDueToday` counts active tasks whose dates include today, so a 16-18 Nov task is still on the list on the 17th. The mood is derived from the tasks held in the store plus the clock (`usePetMood`), and refreshes every 30 seconds so the happy hour ends on its own.

### Overdue sweep

Runs on app start (`startup()`: load tasks, sweep, load progress, remind; memoized so StrictMode cannot run it twice) and, since Phase 7, whenever the local date changes while the app is open (`refreshDay()`, below).

1. Find tasks where `status = 'active' AND end_date < today AND overdue_flagged = 0` (derived from the tasks already in the store).
2. If any exist: insert one `streak_reset` event for `today`, then set `overdue_flagged = 1` on those tasks. In this order so a retry is safe: a duplicate reset leaves the streak unchanged because the streak is cut at the last reset.
3. Reload totals, streak and mood.

No task is ever created already overdue: **a new task must start today or later** (`canStartOn`, enforced in the store and shown in `QuickAdd`). The past is read-only for adding; past days in the calendar still show their tasks and let you complete the overdue ones. Any active task can be completed, including future ones.

Note on the mood: `sad` needs an overdue task AND nothing completed today. Completing something today (or within the last hour) makes the pet happy even while an older task is still overdue.

Each task resets the streak once. A task that stays overdue for a week does not reset it seven times, but it keeps `overdueCount > 0`, so the monkey turns `sad` again each morning until something is completed that day.

### Widget behaviour (Phase 7)

The app is meant to stay running in the tray for days.

- **Tray (Rust, `lib.rs`):** a tray icon with a right-click menu (Show, Quit); a left-click toggles the window. The X button hides the window (`CloseRequested` is cancelled and turned into `hide()`); only Quit exits. In `tauri dev`, closing the window therefore leaves the process running in the tray: use Quit or Ctrl+C.
- **Single instance (`tauri-plugin-single-instance`, registered first):** starting a second copy shows and focuses the first window and exits, so two processes never share the SQLite file.
- **New-day refresh:** the store's `today` is only assigned when tasks load, so a long-running app must move it. `useDayWatcher` (called from `App`) calls `refreshDay()` every 30 s and on window focus and visibility. `refreshDay()` does nothing while the real day equals `today`; otherwise it waits for `startup()`, then runs the startup sequence again in the same order (`loadTasks`, which sets `today`; `sweepOverdue`; `loadProgress`; `remindIfDue`). It stops after `loadTasks` if the day did not move (the reload failed), so it never sweeps or reminds from stale data, and it tries again at the next check. Simultaneous calls share one run. Any difference between the real day and `today` counts, including a clock moved backwards.
- **Reminder (`domain/reminders.ts`, `notification` plugin):** one system notification per day, sent when the app starts and on the first check of a new day: "3 tasks due today and 2 overdue." Due today and overdue are counted from the store's tasks after the sweep. Nothing is sent when both are 0, when the setting is off, or when one was already sent today. The day is saved only when the notification was really shown, so a denied or failed toast is retried at the next check instead of being lost. Settings keys: `reminders` (`"1"`/`"0"`, missing means on) and `lastReminderDay`.
- **Settings:** a gear in the title bar opens a small popover with the reminder checkbox and a Test reminder button (which ignores the setting and the daily limit and saves nothing).
- **Deferred:** autostart, window-state, global shortcut, the compact view, a reminder hour and repeat reminders.

### Packaging (Phase 8)

- **Installer:** `npm run tauri build` produces `src-tauri/target/release/bundle/nsis/Tasks Organizer_1.0.0_x64-setup.exe`, an NSIS installer (`bundle.targets: ["nsis"]`), per-user (`installMode: currentUser`, no administrator prompt), English only. It is **not code-signed**, so SmartScreen warns on the first run (More info, then Run anyway). WebView2 is downloaded by the installer when missing (`downloadBootstrapper`). Name "Tasks Organizer", version 1.0.0 (in `tauri.conf.json`, `package.json` and `Cargo.toml`); the `identifier` is unchanged so existing data stays where it is.
- **Data location:** `%APPDATA%\com.andre.task-organizer` holds `tasks.db` and `backups\` (the automatic safety copies). A development run and an installed copy share this folder, hence the same data. Uninstalling keeps it unless the box in the uninstaller is ticked.
- **CSP:** `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src ipc: http://ipc.localhost` for the packaged app (`'unsafe-inline'` styles because React writes inline styles). `devCsp` is `null` because Vite injects an inline script for hot reload. If a packaged build ever shows a blank window, the CSP is the first suspect (set `csp` to `null` to confirm).
- **Icon:** the stage 1 monkey's face on the app's dark tile with an accent border, drawn in code. Every size is a whole-number scale of the 32 px drawing, and the 16 px size is a separate, pooled version, so nothing is blurred. `src-tauri/icons/source.png` (1024 px) is the master: `npx tauri icon src-tauri/icons/source.png` regenerates the platform formats (delete the Android and iOS folders it also writes; the 32/128/256/512 px PNGs and `icon.ico` were then replaced by the crisp versions). `public/favicon.svg` is the same face for the browser.
- **Backup (JSON):** Settings, then Backup, has Export and Import. The file holds `{ app: "tasks-organizer", formatVersion: 1, exportedAt, tasks, rewardEvents, inventory, settings }`. Tasks of every status are included (archived ones too: the ledger points at them), the ledger is sorted by id and keeps its ids (the streak is cut by ledger id order), and the shop catalogue is not included (it comes from the migrations).
- **Import is validated, confirmed, and recoverable.** `parseBackup` checks the whole file before anything is touched (format and version, every field, duplicate ids, ledger rows that point at missing tasks or unknown items, a negative coin balance, invalid known settings; unknown settings are ignored). Then the player confirms, a safety copy of the current data is written to `backups\before-import-<timestamp>.json` (if that fails, nothing is imported), and `backupRepo.replaceAll` deletes and re-inserts every table with the original ids. Like the other two-step writes it is repeatable instead of transactional: after a failure halfway, importing the same file again ends in the same state, and the safety copy is a second way back. Afterwards the store reloads everything as at startup (restored overdue tasks get their one-time streak reset; no reminder is sent).
- **Deferred:** code signing, auto-update, a backup scheduler, autostart, window-state, global shortcut, compact view.

## 5. Repository contracts

```ts
// repositories/taskRepo.ts
export interface TaskRepo {
  listInRange(from: ISODate, to: ISODate): Promise<Task[]>;
  // listOverdueUnflagged and countOverdue are not implemented: the overdue sweep and the mood derive
  // them from the tasks already in the store (domain/tasks.ts: newlyOverdue, countOverdue).
  create(input: NewTask): Promise<Task>;
  update(id: number, patch: Partial<NewTask>): Promise<void>;
  /** Marks done AND writes the task_done ledger row. Must be atomic. */
  complete(id: number, reward: Reward, today: ISODate): Promise<void>;
  /** Back to active AND deletes that task's task_done row. Must be atomic. */
  reopen(id: number): Promise<void>;
  /** Soft delete. Guarded (AND status = 'active'): idempotent and never touches a done task or the ledger. */
  archive(id: number): Promise<void>;
  /** Inserts one streak_reset for today, THEN flags the tasks. Retry-safe (see repository rules). */
  flagOverdue(ids: number[], today: ISODate): Promise<void>;
}

// repositories/rewardRepo.ts
export interface RewardRepo {
  totals(): Promise<Totals>;
  activeDaysSinceLastReset(): Promise<ISODate[]>;   // DESC
  completedCount(day: ISODate): Promise<number>;   // available; the mood derives completedToday from the store instead
  /** Epoch ms of the newest task_done event, or null. Drives the pet's happy hour. */
  lastCompletionAt(): Promise<number | null>;
}

// repositories/settingsRepo.ts
export interface SettingsRepo {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;   // upsert
}

// repositories/shopRepo.ts
export interface ShopRepo {
  listItems(): Promise<Item[]>;
  listOwned(): Promise<OwnedItem[]>;
  /** Charges the price once (negative-coins purchase event naming the item), then gives it. Retry-safe, see below. */
  purchase(item: Item, today: ISODate): Promise<void>;
  /** Equipping first unequips whatever else is in the same slot. Unowned items are ignored. */
  setEquipped(itemId: number, equipped: boolean): Promise<void>;
}
```

`purchase` is two guarded statements, in this order (Phase 6): (1) insert the `purchase` event with `item_id`, `coins = -price`, only if no purchase event exists for that item and the ledger balance covers the price (the price is read from `items` inside the SQL, never from the caller); (2) `INSERT OR IGNORE` the inventory row only if a purchase event for the item exists. A failure between the two is repaired by calling `purchase` again (no second charge, the item is given), and a double click cannot charge twice or give the item for free. `setEquipped(id, true)` first unequips the other items of the same slot, but only when the target is really owned, so a bad id can never strip what is worn. The store checks `canPurchase` first, then verifies after reloading that the item is really owned.

Repository rules:

- Rows are `snake_case`, domain objects are `camelCase`. Mapping happens in the repository and nowhere else.
- SQLite has no boolean: map `0/1` to `boolean` in the repository.
- Always use bound parameters (`$1`, `$2`), never string concatenation.
- Atomic operations: the SQL plugin runs on a connection pool, so `BEGIN` and `COMMIT` sent as separate `execute()` calls may land on different connections (confirmed in the plugin source, `tauri-plugin-sql` 2.6.0: each `execute` acquires its own pooled connection). A `BEGIN ... COMMIT` inside one `execute` is also unsafe, because a failing statement can return the connection to the pool with the transaction still open.
- Decision (Phase 2): "must be atomic" is met with **ordered, idempotent, retry-safe writes** instead of one transaction. Each step is a single statement guarded so a retry finishes the work without repeating it. Example, `taskRepo.complete`: (1) insert the `task_done` row only if the task is active and has none yet, (2) mark the task done only if it is still active. If step 2 fails, calling `complete` again skips step 1 and finishes step 2, so the reward is paid once. Apply the same pattern to `reopen`, `purchase`, `setEquipped` and `flagOverdue`. A Rust command with a real sqlx transaction stays the fallback if a case cannot be made idempotent.

## 6. Character

### Props (`components/character/Character.tsx`)

```ts
export interface CharacterProps {
  species: Species;                   // which pet's art to draw; see components/character/species
  stage: Stage;                       // 1..4, the stage ON SCREEN (store.displayStage: it lags the level while an evolve is queued)
  mood: Mood;                         // 'idle' | 'happy' | 'sad' | 'sleepy', from moodFor(...)
  equipped: Equipped;                 // slot -> assetKey | null
  /** Head of the store's animation queue; null when nothing is pending. toStage is only for 'evolve'. */
  oneShot: { id: number; kind: OneShot; toStage?: Stage } | null;
  /** Called when the one-shot finishes so the store can dequeue it. */
  onOneShotDone: (id: number) => void;
  /** Rendered size in CSS px. Must be an integer multiple of the 32 px grid. */
  size?: number;                      // default 192
}
```

The component is purely presentational. It holds no game state and imports nothing from `store/` or `repositories/`.

### Pets

The player picks **one** pet (monkey or cat). XP, coins, streak and level belong to the player, not the pet, so switching never loses progress: the species is only the skin. Several pets at once, each with its own progress, would need a `pet_id` on `reward_events`, per-pet inventory and per-pet mood and animation state; that is deliberately out of scope.

- First run: `species` is null, so `CharacterPanel` shows `PetPicker`. After that a "Change pet" button reopens it. The picker stays hidden until the saved choice has loaded (`settingsLoaded`), so returning players never see it flash.
- The Orange Tabby cat: a chibi sitting cat. It only grows bigger and gains details by stage (stage 1 stripes and a collar with a bell, stage 2 blush, stage 3 eyelashes and a tail bow, stage 4 sparkly eyes, a cream tail tip and tufted ears). It never gets bulkier, and there is no ruff.
- Deleting a task archives it (`archived`): only active tasks, inline "Delete? Yes / No" confirmation, ledger untouched.

### State machine

Two kinds of state: a looping base state chosen by `mood`, and one-shot animations that interrupt it.

| State | Kind | Entered when | Exits to |
| --- | --- | --- | --- |
| `idle` | loop | `mood = idle` | — |
| `happy` | loop | `mood = happy` | — |
| `sad` | loop | `mood = sad` (overdue task, nothing completed today) | — |
| `sleepy` | loop | `mood = sleepy` | — |
| `celebrate` | one-shot | a task is completed | current mood loop |
| `levelUp` | one-shot | XP crosses a level threshold | current mood loop |
| `evolve` | one-shot | level reaches 5, 10 or 25 | mood loop, drawn with the next stage |
| `equip` | one-shot | an accessory is bought or changed | current mood loop |

- One-shots are queued in the store in this order: `celebrate`, then `levelUp`, then `evolve`.
- During `evolve` the component shows the old stage for the first half and the new stage for the second half.
- A mood change while a one-shot plays takes effect when the one-shot ends.
- `celebrate` is a one-shot, not a mood. After it ends the monkey returns to whatever `moodFor` now says, which is normally no longer `sad`.

### Pixel-art pipeline (agent-owned)

- Every sprite is a 32×32 grid written as an array of 32 strings; each character is a palette key, `.` is transparent.
- `PixelSprite` turns a grid plus a palette into `<rect>` elements (horizontal runs merged) inside an `<svg viewBox="0 0 32 32" shape-rendering="crispEdges">`.
- One shared palette file keeps fur, skin and outline colours identical across all four stages.
- Layer order, back to front: `background`, body (by stage), face (by mood), `held`, `glasses`, `hat`.
- `anchors.ts` stores, per species and per stage, where the eyes are (top row and the left column of each 2x3 eye) and where a held item goes (top-left corner, just under the chin). Each accessory is drawn once and placed from these numbers, so one drawing fits both pets and all four stages. The numbers come from the sprites, so re-check them (`accessories.test.ts` does) whenever a sprite changes. The `hat` anchor is `{ x: 16, bottomY }` with `bottomY` always two rows above the eyes (the glasses frame starts one row above), so hats and glasses never touch; a hat is at most 4 rows tall because the stage 4 monkey has only 4 rows above its eyes.
- Accessories (Phase 6): `glasses_round` draws a 4x5 frame around each eye (the eyes show through) and a bridge as wide as the gap between the eyes; `laptop` is a 12x7 grid pasted at the held anchor, always below every face pixel. Accessory palette keys are UPPERCASE and pet keys lowercase, so `Character` merges both into one palette without clashes. `accessoryLayers(equipped, anchors)` returns `{ behind, front }`; an unknown asset key (stale database) draws nothing. `PixelSprite` accepts grids of any size (the viewBox follows the grid), which the shop icons use.
- Item art (Phase 9): hats are drawn once and placed by the hat anchor (`hats.ts`), held items share the laptop's 12 px slot and sit just under the chin so they never touch the face (`heldItems.ts`), sunglasses cover the eyes completely and the monocle frames only the eye on the right of the picture (`glasses.ts`), and backgrounds are full 32x32 scenes (`backgrounds.ts`) with a 16x16 thumbnail for the shop card.
- **A background is a still layer behind the animated pet.** `Character` renders it in its own element (`.pet-backdrop`) outside the animated `.pet`, so the idle bob and the one-shot hops never move the scenery. The pet itself is drawn as body, face, held, glasses, hat.
- The shop sits under the pet in a Stats | Shop tab strip. The pet and the tabs stay in place and only the tab content scrolls. The shop groups its items under Hats, Glasses, Held items and Backgrounds (`groupBySlot`). Buying equips the item and plays the `equip` hop; equipping another item of the same slot swaps it; unequipping is silent.
- Animation is CSS only: two-frame loops using `steps()` on transform or opacity. No per-frame redraws in React.
- Stage progression reads as growth: stage 1 small, stage 4 the "buffed" monkey. Silhouette changes; palette does not.

## 7. Division of labor

| Area | Owner | Agent behaviour |
| --- | --- | --- |
| `src/components/**` logic and structure, `App.tsx`, `main.tsx` | Andrei | Mentor mode: props interface, store needs, concepts, edge cases, review |
| Styling: Tailwind classes, `index.css`, `@theme` tokens | Agent | Writes complete styling; changes only `className` and CSS in Andrei's components |
| `src/components/character/**` (sprites, palette, anchors, `PixelSprite`, faces, accessories, `Character`, `useCharacterMachine`) and its keyframes | Agent | Writes complete code, then explains the data flow |
| `src/domain/**` | Andrei | Mentor mode: signatures, concepts, edge cases, review |
| `src/repositories/**`, SQL migrations | Andrei | Mentor mode |
| `src/store/**` | Andrei | Mentor mode |
| `src-tauri/**` (Rust, config, capabilities) | Andrei | Mentor mode |

When pixel-art code needs a store action or domain function that does not exist yet, the agent builds against props or mock data and lists the exact signatures it needs. It does not implement them.

The Phase 0 and Phase 1 components were written by the agent before this split and serve as reference code. From Phase 2 on, Andrei writes the React components and the agent styles them. In the roadmap below, the "Agent builds" column now means: Andrei writes the component logic, the agent styles it; pixel-art items remain fully agent-built.

## 8. Roadmap

| # | Phase | Andrei builds (learning) | Agent builds | Done when |
| --- | --- | --- | --- | --- |
| 0 | Toolchain | Install Rust, C++ Build Tools, Node. Scaffold. Read `tauri.conf.json` and `capabilities/default.json`. | Tailwind wiring, base theme tokens | `npm run tauri dev` opens a window; a Tailwind class renders |
| 1 | Shell and static layout | Window options in `tauri.conf.json`: frameless, min size, title | TitleBar with drag region, three-panel grid, all panels with mock data | The app matches the mockup with fake data |
| 2 | Storage and task CRUD | Migration 001, plugin registration in `lib.rs`, `db.ts`, `taskRepo`, first store slice (`tasks`, `addTask`, `completeTask`) | TaskPanel, TaskRow, QuickAdd wired to the store | Tasks survive a restart |
| 3 | Calendar | `dates.ts` with tests, range query, `selection` state and actions | CalendarPanel: day and range selection, task dots | A task on 16–18 Nov shows on all three days |
| 4 | Gamification engine | `rewards`, `levels`, `streak` with Vitest tests; `rewardRepo`; ledger write inside `complete` | XP bar, level badge, coin and streak tiles | Tests pass; completing a task moves the XP bar |
| 5 | Character | `moodFor`, `stageForLevel`, overdue sweep, one-shot queue in the store | `PixelSprite`, four stage bodies, four faces, state machine, animations | Completing a task plays `celebrate`; an overdue task shows `sad`; level 5 evolves |
| 6 | Shop | `shopRepo`, `canPurchase`, seed items migration, purchase and equip actions | ShopPanel, accessory sprites, anchors | A bought item persists after restart and fits every stage of both pets (twelve items after the Phase 9 additions) |
| 7 | Widget behaviour | Tray, close-to-tray, single-instance and notification plugins; date-change refresh; daily reminder; settings popover. Autostart, window-state, global shortcut and CompactView moved to Phase 9. | SettingsMenu styling | The app lives in the tray and reminds of tasks due today |
| 8 | Package | NSIS bundle config, version and name, CSP, JSON backup export and import (dialog and fs plugins) | App icon (monkey face), favicon, visual polish pass (stronger control borders, scrollbars, selection) | Installs from one `.exe` on another machine |
| 9 | Stretch | Recurring tasks, weekly stats queries | Stats chart, themes, more accessories | Open |

Order rationale: phases 1–3 produce a usable task app before any game logic; phase 4 precedes the character because the character only reacts to values the engine produces.

## 9. Open items

- ~~Confirm the transaction approach for `tauri-plugin-sql` (Phase 2).~~ Decided: ordered, idempotent, retry-safe writes (see section 5, repository rules).
- Decide whether `reopen` stays in v1 or completed tasks are final.
- Tune `config.ts` after one week of real use.
