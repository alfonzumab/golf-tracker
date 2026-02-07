# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # Production build to /dist
npm run lint     # ESLint (flat config, v9+)
npm run preview  # Preview production build
```

## Architecture

Mobile-first (480px max-width) golf round tracker for 4-player rounds with real-time betting and settlement. React 18+ with Vite, no TypeScript.

### State Management

All app state lives in `src/App.jsx` via `useState` hooks. No context/Redux — props are drilled to child components. The component tree is shallow (max 3 levels) so this is manageable.

**Page routing** is a string state (`pg`) with values: `home`, `players`, `courses`, `setup`, `score`, `bets`, `hist`.

### Storage Abstraction (`src/utils/storage.js`)

```js
sv(key, data)      // Save: localStorage.setItem("gt3-" + key, JSON.stringify(data))
ld(key, fallback)  // Load: JSON.parse(localStorage.getItem("gt3-" + key)) || fallback
```

All persistence goes through `sv()`/`ld()`. This layer is designed to be swapped for Supabase. Keys: `gt3-players`, `gt3-courses`, `gt3-selectedCourse`, `gt3-currentRound`, `gt3-rounds`.

### Calculation Engine (`src/utils/calc.js`)

Pure functions with no React dependencies. `calcAll(games, players)` returns `{ results, settlements, balances }`. Four game calculators: `cStroke`, `cMatch`, `cSkins`, `cSixes` — each returns the same interface shape. **Do not modify calculation logic** without thorough testing — the payout math is correct and interdependent.

### Golf Math (`src/utils/golf.js`)

`calcCH` → `getStrokes` pipeline: Player's handicap index → course handicap (via slope/rating) → per-hole stroke allocation array. Also: `fmt$()` for currency display, `scoreClass()` for score-to-par CSS classes, `sixPairs()` for random 6-6-6 team generation.

### Theme & Styling

- `src/theme.js` exports `T` (color tokens), `GT` (game type enum), `PC` (4 player colors)
- `src/styles.css` is a static CSS file with hardcoded hex values (originally a JS template literal resolved against `T`)
- Components use both CSS classes and inline styles referencing `T` object
- Fonts: Playfair Display (headings), DM Sans (body) — loaded via `index.html`
- CSS class convention: short abbreviated names (`.cd` = card, `.pg` = page, `.bp` = button primary, `.fx` = flex, `.mb10` = margin-bottom 10px)

### Round Data Model

A round always has exactly 4 players. Each round-player is enriched from the roster with: `tee`, `teeData` (pars/handicaps/rating/slope arrays), `courseHandicap`, `strokeHoles` (18-element array of strokes per hole), `scores` (18-element array, null = not scored). Course tee data is stored as JSONB-style nested objects (arrays of 18 values for pars and handicaps).

## Migration Context

The app was split from a single 1,228-line monolith (`golf-tracker-phase3.jsx`, still in root) into the current structure. The original file is the source of truth if behavior questions arise. Next planned phases: Supabase integration (auth + cloud DB), Vercel deployment, PWA.
