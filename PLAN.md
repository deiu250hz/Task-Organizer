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
| `store/` | `domain/`, `repositories/` | React components |
| `domain/` | `date-fns`, other `domain/` files | React, Zustand, `@tauri-apps/*`, `repositories/`, `store/` |
| `repositories/` | `@tauri-apps/plugin-sql`, `domain/` types | React, `store/`, `components/` |

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
│  │  ├─ layout/                   # TitleBar, Panel, CompactView
│  │  ├─ calendar/                 # CalendarPanel (react-day-picker), dateAdapters.ts (the only Date <-> ISODate conversion)
│  │  ├─ tasks/                    # TaskPanel, TaskRow, QuickAdd
│  │  ├─ shop/                     # ShopPanel, ItemCard
│  │  └─ character/
│  │     ├─ Character.tsx          # implements CharacterProps
│  │     ├─ PixelSprite.tsx        # string grid + palette -> <rect>s
│  │     ├─ composeLayers.ts       # stacks body, face, accessories into one grid
│  │     ├─ oneShotTiming.ts       # one-shot durations shared by the CSS and the safety timeout
│  │     ├─ useCharacterMachine.ts # animation state machine (UI-only)
│  │     ├─ species/               # one folder per pet; the registry in index.ts maps Species to its art
│  │     │  ├─ types.ts            # Species, Palette, Grid, SpeciesArt, GRID_SIZE
│  │     │  ├─ index.ts            # SPECIES registry
│  │     │  └─ monkey/             # palette.ts, stages/stage1..4.ts (bodies), faces/idle|happy|sad|sleepy.ts (overlays per stage)
│  │     ├─ anchors.ts             # slot anchor per stage (Phase 6)
│  │     └─ accessories/           # one file per item asset_key (Phase 6)
│  ├─ domain/                      # ANDREI
│  │  ├─ types.ts
│  │  ├─ config.ts                 # every tunable number lives here
│  │  ├─ dates.ts                  # ISODate helpers
│  │  ├─ tasks.ts                  # tasksInRange, anyTaskOn
│  │  ├─ rewards.ts                # rewardFor
│  │  ├─ levels.ts                 # levelFromXp, xpForLevel, stageForLevel
│  │  ├─ streak.ts                 # streakFrom
│  │  ├─ mood.ts                   # moodFor
│  │  ├─ shop.ts                   # canPurchase
│  │  └─ __tests__/
│  ├─ repositories/                # ANDREI
│  │  ├─ db.ts                     # single Database.load, shared handle
│  │  ├─ taskRepo.ts
│  │  ├─ rewardRepo.ts
│  │  └─ shopRepo.ts
│  └─ store/                       # ANDREI
│     ├─ useAppStore.ts
│     ├─ selectors.ts              # useVisibleTasks, useHasTaskOn (derive with useMemo, stable slices only)
│     └─ __tests__/
└─ src-tauri/                      # ANDREI
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ migrations/001_init.sql
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
  { ok: true } | { ok: false; reason: 'owned' | 'coins' | 'level' }
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

Runs on app start (`startup()`: load tasks, sweep, load progress; memoized so StrictMode cannot run it twice) and, from Phase 7, whenever the local date changes while the app is open. Until then, leaving the app open past midnight does not sweep until the next start.

1. Find tasks where `status = 'active' AND end_date < today AND overdue_flagged = 0` (derived from the tasks already in the store).
2. If any exist: insert one `streak_reset` event for `today`, then set `overdue_flagged = 1` on those tasks. In this order so a retry is safe: a duplicate reset leaves the streak unchanged because the streak is cut at the last reset.
3. Reload totals, streak and mood.

A task created already past its end date (for example logged for yesterday) is only being recorded late, not missed: it is flagged at creation without a reset. It still counts in `overdueCount`, so the pet is sad until something is completed.

Each task resets the streak once. A task that stays overdue for a week does not reset it seven times, but it keeps `overdueCount > 0`, so the monkey turns `sad` again each morning until something is completed that day.

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
  archive(id: number): Promise<void>;
  /** Inserts one streak_reset for today, THEN flags the tasks. Retry-safe (see repository rules). */
  flagOverdue(ids: number[], today: ISODate): Promise<void>;
  /** Flags tasks without a reset: a task created already past its end date is not a missed deadline. */
  markFlagged(ids: number[]): Promise<void>;
}

// repositories/rewardRepo.ts
export interface RewardRepo {
  totals(): Promise<Totals>;
  activeDaysSinceLastReset(): Promise<ISODate[]>;   // DESC
  completedCount(day: ISODate): Promise<number>;   // available; the mood derives completedToday from the store instead
  /** Epoch ms of the newest task_done event, or null. Drives the pet's happy hour. */
  lastCompletionAt(): Promise<number | null>;
}

// repositories/shopRepo.ts
export interface ShopRepo {
  listItems(): Promise<Item[]>;
  listOwned(): Promise<OwnedItem[]>;
  /** Inserts inventory row AND a negative-coins purchase event. Must be atomic. */
  purchase(item: Item, today: ISODate): Promise<void>;
  /** Unequips whatever else is in the same slot, then equips. Must be atomic. */
  setEquipped(itemId: number, equipped: boolean): Promise<void>;
}
```

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
- `anchors.ts` stores the head and hand position per stage, so one hat grid fits all four bodies.
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
| 6 | Shop | `shopRepo`, `canPurchase`, seed items migration, purchase and equip actions | ShopPanel, accessory sprites, anchors | A bought hat persists after restart and fits every stage |
| 7 | Widget behaviour | Tray, autostart, notification, window-state and global-shortcut plugins; date-change timer | CompactView, tray-friendly layouts | The app lives in the tray and reminds of tasks due today |
| 8 | Package | Icons, NSIS bundle config, JSON backup/export | Final visual polish pass | Installs from one `.exe` on another machine |
| 9 | Stretch | Recurring tasks, weekly stats queries | Stats chart, themes, more accessories | Open |

Order rationale: phases 1–3 produce a usable task app before any game logic; phase 4 precedes the character because the character only reacts to values the engine produces.

## 9. Open items

- ~~Confirm the transaction approach for `tauri-plugin-sql` (Phase 2).~~ Decided: ordered, idempotent, retry-safe writes (see section 5, repository rules).
- Decide whether `reopen` stays in v1 or completed tasks are final.
- Tune `config.ts` after one week of real use.
