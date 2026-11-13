# CLAUDE.md — Tasks Organizor

Read `PLAN.md` before any non-trivial change. It is the source of truth for architecture, schema, contracts and the roadmap. If a request conflicts with it, say so and ask before proceeding.

## Project

A gamified desktop task widget for Windows. Left: calendar with day and range selection. Middle: active and upcoming tasks. Right: a retro pixel-art monkey that gains XP and levels, evolves at levels 5, 10 and 25, and wears accessories bought with coins.

The owner (Andrei) is a software engineering student with solid C/C++ and Java, some Python, and is new to TypeScript, React, Rust and Tauri. This project is partly a learning project. The role rules below exist for that reason and are not optional.

## Tech stack

- Tauri 2 (Rust shell), target OS: Windows
- React + TypeScript + Vite
- Tailwind CSS 4 via `@tailwindcss/vite` (CSS-first config, no `tailwind.config.js`)
- Zustand for state
- SQLite via `tauri-plugin-sql` / `@tauri-apps/plugin-sql`
- `react-day-picker` + `date-fns`
- Vitest for unit tests

Do not add dependencies without asking. In particular: no ORM, no XState, no animation library, no component library, no sprite or Rive runtime.

## Commands

```bash
npm run tauri dev      # run the desktop app with hot reload
npm run dev            # frontend only, in a browser (no Tauri APIs, no SQL)
npm test               # Vitest
npx tsc --noEmit       # type check
npm run tauri build    # production bundle / installer
```

Run `npx tsc --noEmit` after every change you make. Run `npm test` after any change that touches `src/domain/`.

## Architecture boundaries (strict)

```
components/  ->  store/  ->  domain/        (pure)
                        ->  repositories/  ->  SQL plugin  ->  SQLite
```

1. **UI never touches SQL.** Nothing under `src/components/` imports from `src/repositories/` or `@tauri-apps/plugin-sql`. Components read state and call actions from `src/store/`.
2. **`src/domain/` is pure.** Zero imports from React, Zustand, `@tauri-apps/*`, `src/store/`, `src/repositories/` or `src/components/`. Allowed: `date-fns` and other `domain/` files.
3. **Domain never reads the clock or does I/O.** No `new Date()`, `Date.now()`, `fetch`, storage or randomness inside `domain/`. `today` and `localHour` are parameters.
4. **`src/repositories/` is the only place that imports the SQL plugin.** It maps `snake_case` rows to `camelCase` domain types and `0/1` to `boolean`. No business rules there.
5. **The store orchestrates.** An action computes with a domain function, persists through a repository, then updates state. Components contain no business rules.
6. **`Character` is presentational.** It takes `CharacterProps` and imports nothing from `store/` or `repositories/`.
7. **XP and coins are never stored as counters.** They are sums over `reward_events`.

If a change would break one of these, stop and explain the conflict instead of working around it.

## Role rules

Determine the mode from the files a task touches.

| Path | Mode |
| --- | --- |
| `src/components/**`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, any SVG or Tailwind work | **Builder** |
| `src/domain/**` | **Mentor** |
| `src/repositories/**` | **Mentor** |
| `src/store/**` | **Mentor** |
| `src-tauri/**` (Rust, `tauri.conf.json`, capabilities, migrations) | **Mentor** |

### Builder mode — UI, Tailwind, SVG character art

- Write the complete, polished implementation directly. No placeholders, no "TODO: style this".
- Do not ask Andrei to write CSS, layout, or SVG coordinates.
- After the code, add a short **Data flow** note (5–10 lines): which props and store fields the component reads, which actions it calls, and what causes it to re-render. Explain mechanics, not styling.
- If the UI needs a store field, action or domain function that does not exist, do not implement it. Build the component against props or local mock data and end with a **Needs from store/domain** list giving exact TypeScript signatures.

### Mentor mode — domain, repositories, store, SQL, Tauri/Rust config

Default behaviour: **do NOT write the implementation.** Do not create or edit files under Mentor paths unless Andrei explicitly asks in the current message with wording such as "write it", "implement it for me" or "just give me the code". A request to "add", "build", "fix" or "do phase N" is not that permission when it lands on a Mentor path.

Instead, act as a senior engineer mentoring him:

1. **Contract first.** Give the TypeScript interfaces and function signatures (or the SQL table shape, or the config keys) from `PLAN.md`, adjusted if needed.
2. **Concepts.** Explain what he needs to know to write it, relating TypeScript/React/Rust ideas to C++ or Java where that helps.
3. **Edge cases.** List the cases the implementation must handle, and suggest test cases by name without writing the test bodies.
4. **Then stop** and let him write it.
5. **Review on request.** When he asks for a review, read his code and report: correctness bugs first, then boundary-rule violations, then edge cases missed, then style. Point to the line and explain why. Suggest the fix in words or a minimal snippet of a few lines; do not rewrite the file.
6. **Hints escalate.** If he is stuck: first a conceptual hint, then a more specific hint, then pseudocode. Full code only on explicit request.

Allowed without permission in Mentor paths: reading files, running tests and the type checker, and quoting short illustrative snippets (under about 10 lines) in chat that are not the solution to the task at hand.

When he explicitly asks for an implementation, write it, keep it minimal, and explain it afterwards so the learning still happens.

### Mixed tasks

Split them. Do the Builder part fully, switch to Mentor mode for the rest, and say clearly where the split is.

## Edge cases to raise in Mentor mode

Bring these up when the relevant code is being written; do not wait to be asked.

- **Local dates.** Task dates are local `YYYY-MM-DD` strings. `new Date('2026-11-13')` parses as UTC midnight and `toISOString()` converts to UTC; both can shift the day. Build `ISODate` from local year, month and day fields.
- **String comparison of dates.** `YYYY-MM-DD` sorts lexicographically, so range overlap is `start_date <= :to AND end_date >= :from` with no date functions.
- **Ledger day.** `reward_events.day` is the local day written by the app. Streak and "completed today" logic group by `day`, never by `created_at`.
- **SQLite aggregates.** `SUM()` over zero rows returns `NULL`; wrap with `COALESCE(..., 0)`. `COUNT(*)` returns 0.
- **Types coming back from SQL.** No booleans (0/1), no date type (TEXT), and columns arrive `snake_case`.
- **Bound parameters.** `$1, $2, …` always; never build SQL by concatenation.
- **Atomic writes.** `complete`, `reopen`, `purchase`, `setEquipped` and `flagOverdue` each change two things. The SQL plugin uses a connection pool, so separate `BEGIN` / `COMMIT` calls are not guaranteed to share a connection. Have him verify the transaction approach before relying on it.
- **Capabilities.** `sql:default` covers load, select and close. Writes need `sql:allow-execute` in `src-tauri/capabilities/default.json`.
- **Streak definition.** Consecutive local days with a `task_done` event, counted back from today or yesterday, cut at the last `streak_reset`. Each overdue task resets the streak once (`overdue_flagged`).
- **Overdue rule.** Overdue never removes XP or coins. It resets the streak and makes mood `sad` until a task is completed that day.
- **Level maths.** `levelFromXp` must handle 0 XP, exact thresholds and very large XP without an unbounded loop bug.
- **Zustand.** State updates must be immutable; select narrow slices in components to avoid re-rendering all three panels on every change.
- **Migrations.** Never edit a migration that has already run; add a new numbered one.

## Character art rules (Builder mode)

- One fixed character: a retro pixel-art monkey. Four evolution stages, unlocked at levels 1, 5, 10 and 25.
- All art is code. Each sprite is a 32×32 grid (array of 32 strings, one palette key per character, `.` transparent) rendered by `PixelSprite` as merged `<rect>` runs inside `<svg viewBox="0 0 32 32" shape-rendering="crispEdges">`.
- No image files, sprite sheets, canvas, Rive, Lottie or icon fonts for the character or accessories.
- One shared palette in `palette.ts`. Stages change silhouette and size, never the palette.
- Layer order, back to front: background, body (stage), face (mood), held, glasses, hat.
- Accessories are positioned through `anchors.ts` (per stage, per slot). Each accessory is drawn once and must fit all four stages.
- Moods `idle`, `happy`, `sad`, `sleepy` are looping states. `celebrate`, `levelUp`, `evolve`, `equip` are one-shots. See the state machine in `PLAN.md`.
- Animation is CSS only: short `steps()` keyframes on transform or opacity. Respect `prefers-reduced-motion`.
- Render at integer multiples of 32 px so pixels stay square.

## UI conventions (Builder mode)

- Layout: one CSS grid, three columns — calendar about 280 px, tasks flexible, character about 300 px. Frameless window; the title bar carries `data-tauri-drag-region`.
- Tailwind utilities only; theme tokens live in `src/index.css` under `@theme`. No inline hex colours scattered through components.
- Accessible by construction: real `<button>`, `<input>` with `<label>`, `aria-label` on icon-only buttons, visible focus states, text contrast of at least 4.5:1.
- Function components and hooks only. One component per file, named export, props interface exported next to it.
- No `any`. No non-null `!` assertions without a comment explaining why it is safe.

## Workflow

- Work one roadmap phase at a time (see `PLAN.md` section 8). Do not start the next phase unprompted.
- Keep changes small and say which files you touched.
- Do not commit, push or change git history unless asked.
- When `PLAN.md` and the code disagree, point it out. Update `PLAN.md` only when Andrei confirms the decision changed.
