# Tasks Organizor

A gamified desktop task manager for Windows. Plan tasks on a calendar, complete them to earn XP and coins, and watch a retro pixel-art monkey level up, evolve and wear the accessories you buy.

> **Status:** early development (Phase 0 of 9). Features listed below are planned unless marked done in the [roadmap](#roadmap).

## Features

- **Calendar panel** — select a single day or a range of days and add tasks to them; days with tasks are marked.
- **Task panel** — active, upcoming and completed tasks, with easy / medium / hard difficulty.
- **Rewards** — each completed task earns XP and coins, with a bonus for daily streaks.
- **Evolving character** — the monkey levels up with XP and changes form at levels 5, 10 and 25.
- **Moods** — the monkey is idle, happy, sleepy or sad. An overdue task resets your streak and makes it sad until you complete something; you never lose XP or coins.
- **Shop** — spend coins on hats, glasses, held items and backgrounds.
- **Widget mode** — tray icon, compact always-on-top view, reminders and start with Windows.
- **Local only** — all data stays in one SQLite file on your machine.

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop shell | [Tauri 2](https://v2.tauri.app/) (Rust, WebView2) |
| UI | React, TypeScript, Vite |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Calendar | react-day-picker, date-fns |
| Storage | SQLite via `tauri-plugin-sql` |
| Character art | SVG pixel art generated in code (`shape-rendering="crispEdges"`) |
| Tests | Vitest |

## Architecture

```
components/  ->  store/  ->  domain/        (pure TypeScript game rules)
                        ->  repositories/  ->  SQLite
```

- The UI never talks to the database; it reads state and calls actions on the Zustand store.
- `domain/` holds every XP, level, streak, mood and shop rule as pure functions, with no React, Tauri or I/O imports, so it is fully unit-tested.
- XP and coins are never stored as counters. They are sums over an append-only `reward_events` ledger.

The full design, schema and interfaces are in [`PLAN.md`](PLAN.md).

## Getting started

### Prerequisites (Windows)

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) LTS
- Microsoft C++ Build Tools with the "Desktop development with C++" workload
- WebView2 (preinstalled on Windows 11)

### Run

```bash
git clone https://github.com/<your-username>/tasks-organizor.git
cd tasks-organizor
npm install
npm run tauri dev
```

The first build compiles the Rust side and takes a few minutes.

### Other commands

```bash
npm test               # unit tests (Vitest)
npx tsc --noEmit       # type check
npm run tauri build    # build the Windows installer
```

## Project structure

```
src/
  components/     React UI and the pixel-art character
  store/          Zustand store (actions orchestrate domain + repositories)
  domain/         Pure game rules and their tests
  repositories/   SQL access, the only code that touches the database
src-tauri/
  migrations/     Numbered SQL migrations
  capabilities/   Tauri permission files
  src/lib.rs      Plugin registration
```

## Roadmap

- [ ] 0. Toolchain and scaffold
- [ ] 1. Window shell and three-panel layout
- [ ] 2. SQLite storage and task CRUD
- [ ] 3. Calendar with day and range selection
- [ ] 4. Gamification engine: XP, levels, streaks
- [ ] 5. Pixel-art monkey: 4 evolution stages, moods, animations
- [ ] 6. Coin shop and accessories
- [ ] 7. Widget behaviour: tray, compact mode, reminders, autostart
- [ ] 8. Packaging and installer
- [ ] 9. Stretch: recurring tasks, weekly stats, themes

## Contributing

This is a personal learning project, so the core logic is written by hand on purpose. Bug reports and suggestions are welcome as issues.

## License

Not yet chosen.
