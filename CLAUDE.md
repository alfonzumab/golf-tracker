# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Vite dev server with HMR (localhost:5173)
npm run build    # Production build to /dist
npm run lint     # ESLint (flat config, v9+)
npm run preview  # Preview production build
```

No test framework is configured. Production deploys automatically via Vercel on push to `main`.

## Architecture

Mobile-first (480px max-width) golf round tracker for 4-player rounds with real-time betting and settlement. React 19 with Vite, no TypeScript. Supabase for auth and cloud storage.

### Auth & Data Flow

`src/App.jsx` manages the auth lifecycle:
- `session === undefined` → loading spinner
- `session === null` → render `<Auth />` (login/signup)
- `session` truthy → render the app, load data from Supabase

On login, `importLocalData()` migrates any existing localStorage data to Supabase (one-time). All subsequent data loads come from Supabase with localStorage as write-through cache.

### Persistence Pattern

Components never call storage functions directly. `App.jsx` provides wrapper functions (`handleSetPlayers`, `handleSetCourses`, `handleSetSelectedCourse`) that:
1. Update React state
2. Write to localStorage via `sv()` (instant UI)
3. Write to Supabase async (cloud persistence)

Score updates go through `saveCurrentRound()` which has a 1.5s debounce to batch rapid scoring taps.

### State Management

All app state lives in `src/App.jsx` via `useState` hooks. No context/Redux — props drilled to children. The component tree is shallow (max 3 levels).

**Page routing** is a string state (`pg`) with values: `home`, `players`, `courses`, `setup`, `score`, `bets`, `hist`.

### Calculation Engine (`src/utils/calc.js`)

Pure functions with no React dependencies. `calcAll(games, players)` returns `{ results, settlements, balances }`. Four game calculators: `cStroke`, `cMatch`, `cSkins`, `cSixes` — each returns the same interface shape. **Do not modify calculation logic** without thorough testing — the payout math is correct and interdependent.

### Golf Math (`src/utils/golf.js`)

`calcCH` → `getStrokes` pipeline: Player's handicap index → course handicap (via slope/rating) → per-hole stroke allocation array. Also: `fmt$()` for currency display, `scoreClass()` for score-to-par CSS classes, `sixPairs()` for random 6-6-6 team generation.

### Supabase Schema

Tables (all with RLS — each user sees only their own data):
- `players` — id (TEXT PK), user_id, name, index
- `courses` — id (TEXT PK), user_id, name, city, tees (JSONB)
- `rounds` — composite PK (id, user_id), date, course (JSONB), players (JSONB), games (JSONB), is_current (BOOLEAN)
- `user_preferences` — user_id (PK), selected_course_id

### Theme & Styling

- `src/theme.js` exports `T` (color tokens), `GT` (game type enum), `PC` (4 player colors)
- `src/styles.css` is static CSS with hardcoded hex values (originally a JS template literal resolved against `T`)
- Components use both CSS classes and inline styles referencing `T` object
- Fonts: Playfair Display (headings), DM Sans (body) — loaded via `index.html`
- CSS class convention: short abbreviated names (`.cd` = card, `.pg` = page, `.bp` = button primary, `.fx` = flex, `.mb10` = margin-bottom 10px)
- Design system minimums: body font 15px, inputs 15px, buttons min-height 48px, score buttons 52×52px, all tap targets ≥44px. Do not introduce font sizes below 11px.

### Round Data Model

A round always has exactly 4 players. Each round-player is enriched with: `tee`, `teeData` (pars/handicaps/rating/slope), `courseHandicap`, `strokeHoles` (18-element stroke allocation array), `scores` (18-element array, null = not scored). Course tee data is JSONB with arrays of 18 values for pars and handicaps.

## Environment

Requires `.env.local` with:
```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase publishable key>
```
Same vars are set in Vercel Environment Variables for production.
