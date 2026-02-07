# Golf Round Tracker

## Project Overview

Golf Round Tracker is a mobile-first React web application for tracking 4-player golf rounds with real-time betting, handicap calculations, and financial settlement. Built as a single-file monolith (~1,228 lines), it handles the complete lifecycle of a golf round: player/course management, game setup, hole-by-hole scoring, live bet tracking, and post-round P&L settlement.

### Key Features
- **4-player round management** with per-player tee selection and automatic course handicap calculation
- **Four game formats**: Stroke Play (individual + 2v2), Match Play, Skins (with carry-over), and 6-6-6
- **Real-time P&L tracking** with optimized settlement calculations (minimized transactions)
- **Hole-by-hole scoring** with two views: individual hole entry and full scorecard
- **Course database** with multi-tee support (rating, slope, par, handicap per hole)
- **Round history** with full replay, P&L review, and round reopening
- **Offline-capable** via localStorage persistence

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18+ (functional components, hooks) |
| **State** | `useState`, `useEffect`, `useMemo` — no external state library |
| **Styling** | Custom CSS injected via `<style>` tag (template literal), inline styles with theme object |
| **Fonts** | Playfair Display (headings), DM Sans (body) via Google Fonts |
| **Storage** | `localStorage` with JSON serialization |
| **Icons** | Inline SVG components |
| **Build** | Intended for Vite + React (see migration guide) |
| **Tailwind** | Installed but not yet utilized — custom CSS classes currently used |

---

## Current State

- **Version**: Phase 3 (final monolith)
- **File**: `golf-tracker-phase3.jsx`
- **Lines**: 1,228
- **Feature completeness**: Core gameplay loop is complete — create round, score, settle bets, save history
- **Architecture**: Single-file React component exporting `App` as default
- **Status**: Pre-migration — a `CLAUDE-CODE-PROMPT.md` exists with instructions for splitting into a multi-file Vite project

---

## Data Architecture

All data persists in `localStorage` with the prefix `gt3-`. The storage layer uses two helper functions:

```
sv(key, data)  — saves JSON to localStorage["gt3-" + key]
ld(key, fallback) — loads/parses from localStorage, returns fallback on miss or error
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `gt3-players` | `Array<Player>` | Player roster (name, handicap index) |
| `gt3-courses` | `Array<Course>` | Course database with tee data |
| `gt3-selectedCourse` | `string` | ID of the last-selected course |
| `gt3-currentRound` | `Round \| null` | Active in-progress round |
| `gt3-rounds` | `Array<Round>` | Completed round history |

### Data Structures

**Player** (roster):
```json
{ "id": "timestamp", "name": "John Doe", "index": 12.5 }
```

**Course**:
```json
{
  "id": "timestamp",
  "name": "Pine Valley",
  "city": "Pine Valley, NJ",
  "tees": [{
    "name": "White",
    "rating": 72.3,
    "slope": 135,
    "pars": [4, 4, 3, 5, ...],       // 18 values
    "handicaps": [1, 3, 5, 7, ...]    // 18 values (hole handicap rankings)
  }]
}
```

**Round Player** (in-round, enriched from roster):
```json
{
  "id": "...", "name": "...", "index": 12.5,
  "tee": "White",
  "teeData": { "name": "...", "rating": 72.3, "slope": 135, "pars": [...], "handicaps": [...] },
  "courseHandicap": 14,
  "strokeHoles": [0, 1, 0, 1, ...],   // strokes received per hole
  "scores": [4, null, 5, ...],         // null = not yet scored
  "colorIdx": 0                        // 0-3, maps to player color
}
```

**Round**:
```json
{
  "id": "timestamp",
  "date": "Sat, Jan 15, 2025",
  "course": { "name": "...", "city": "..." },
  "players": [RoundPlayer, RoundPlayer, RoundPlayer, RoundPlayer],
  "games": [Game, ...]
}
```

---

## Game Formats Supported

### 1. Stroke Play
- **Individual**: Each player vs. field. Lowest score (gross or net) wins the pot.
- **2v2 Teams**: Best-ball format. Teams compete on front 9, back 9, and overall 18 with separate wagers.
- Supports gross or net scoring.
- Wager: `$/player` (individual) or `$/front/$/back/$/overall` (2v2).

### 2. Match Play (2v2 Best Ball)
- Hole-by-hole competition between two teams.
- Best net score per team on each hole determines the hole winner.
- Separate wagers for front 9, back 9, and overall 18-hole match.
- Live status shows "X UP (Y left)" or final result.

### 3. Skins
- Individual competition — lowest score on a hole wins the skin.
- Ties either push (no winner) or carry over to the next hole.
- Pot split proportionally based on skins won.
- Supports net or gross scoring.
- Detailed hole-by-hole skin tracking with carry indicators.

### 4. 6-6-6 (Sixes)
- 18 holes split into three 6-hole segments with rotating 2v2 pairings.
- Pairings are randomly generated (3 of 6 possible unique pairings selected and shuffled).
- Each segment can use match play or stroke play format.
- Wager per segment per person.
- Live display shows the active segment's pairing and score.

---

## Key Features Detail

### Handicap System
- **Course Handicap** = `Index * (Slope / 113) + (Rating - Par)`, rounded
- **Stroke Allocation**: Strokes distributed across holes based on hole handicap ranking. For handicaps > 18, additional strokes wrap around. Negative handicaps (scratch/plus players) work as "giving" strokes.
- Stroke dots displayed on scorecard (single dot = 1 stroke, double dot = 2+).

### P&L & Settlement Engine
- The `calcAll()` function processes all active games and produces:
  - **Per-game results** with titles, details, status, and payouts
  - **Player balances** (net +/- across all games)
  - **Optimized settlements** — minimized payment transactions using a debtor/creditor matching algorithm
- Settlement is displayed as "Player A pays Player B $X.XX"
- Currency formatting: `+$5.00` (winning) / `-$5.00` (losing)

### Scoring Interface
- **Hole View**: Large +/- buttons per player, Par quick-set, clear button. Shows leaderboard, live bets, and hole navigator.
- **Card View**: Traditional scorecard layout (front 9 / back 9) with color-coded scores (eagle=blue, birdie=green, bogey=gold, double+=red). Tapping a cell jumps to that hole.
- Auto-advances to next hole when all 4 players have scored.

### Round History
- Completed rounds saved with full player data, scores, and game configurations.
- History view shows course, date, player scores, and P&L summary.
- Can drill into any round for full detail view with settlements.
- **Reopen Round**: Load a completed round back as the active round.

---

## Design System

### Color Theme (`T` object)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0b1a10` | Page background (very dark green) |
| `card` | `#0f2518` | Card/surface background |
| `cardHi` | `#143020` | Card hover/active state |
| `inp` | `#081510` | Input field background |
| `acc` | `#2ecc71` | Primary accent (green) |
| `accD` | `#1a7a42` | Accent dark variant |
| `accB` | `#4ade80` | Accent bright (headings, active states) |
| `gold` | `#f0c040` | Warnings, bogeys, stroke indicators |
| `red` | `#ef4444` | Errors, losses, double bogey+ |
| `blue` | `#60a5fa` | Eagles, informational |
| `txt` | `#e8f5e9` | Primary text (light green-white) |
| `dim` | `#6b9b7a` | Secondary/muted text |
| `bdr` | `#1a3a25` | Border color |

### Player Colors
| Index | Color | Hex |
|-------|-------|-----|
| P1 | Green | `#4ade80` |
| P2 | Blue | `#60a5fa` |
| P3 | Gold | `#f0c040` |
| P4 | Pink | `#f472b6` |

### Typography
- **Headings**: Playfair Display (serif), 600-700 weight
- **Body**: DM Sans (sans-serif), 300-700 weight, optical size 9-40

### Layout
- **Mobile-first**: Max-width 480px, centered
- **Fixed navigation**: Bottom tab bar with 4-6 tabs (contextual — Score/Bets only show during active round)
- **Sticky header**: Blurred backdrop, contextual back button and actions
- **Cards**: Rounded corners (12px), dark green surfaces with subtle borders
- **Animations**: Fade-in on page transitions (0.2s ease)
- **Safe area**: Bottom nav respects `env(safe-area-inset-bottom)` for notched devices

---

## Component Architecture

```
App (default export)
├── <style>{CSS}</style>          — Injected stylesheet
├── Header                        — Sticky top bar (inline in App)
├── Home                          — Course/player selection, round status
├── Players                       — CRUD for player roster
├── Courses                       — Course list
│   └── CourseEditor              — Modal: edit course name, city, tees, pars, handicaps
├── Setup                         — Game configuration (add/configure games before round)
├── Scoring                       — Active round scoring
│   ├── HV (Hole View)            — Individual hole scoring with leaderboard
│   └── CV (Card View)            — Full scorecard table
├── Bets                          — Live P&L, settlements, game details, skins grid
├── Hist (History)                — Round history list and detail view
├── Nav                           — Bottom navigation bar
├── Mdl (Modal)                   — Confirmation dialogs
└── Tog (Toggle)                  — Toggle switch component
```

### Utility Functions (pure, no React)
- `calcAll()`, `cStroke()`, `cMatch()`, `cSkins()`, `cSixes()` — Calculation engine
- `calcCH()` — Course handicap formula
- `getStrokes()` — Stroke allocation across 18 holes
- `sixPairs()` — Random 6-6-6 pairing generator
- `fmt$()` — Currency formatter with +/- sign
- `scoreClass()` — CSS class for score-to-par coloring
- `sv()`, `ld()` — localStorage read/write

---

## Development History

### Phase 1 — Foundation
- Basic round tracking with stroke play
- Player and course management
- localStorage persistence
- Scoring interface (hole view)

### Phase 2 — Betting Engine
- Added match play, skins, and 6-6-6 game formats
- P&L calculation engine with settlement optimization
- Bets page with live tracking
- Scorecard view (card mode)
- Skins hole-by-hole visualization

### Phase 3 — Polish & Completeness
- 2v2 team stroke play (best ball) with front/back/overall wagers
- 6-6-6 randomized pairings with persistent storage
- Active segment display for 6-6-6 on bets page
- Team swap UI for match and stroke formats
- Course editor improvements (add/delete tees)
- Round reopening from history
- Empty state screens with navigation prompts
- Refined UI/UX across all pages

---

## Outstanding Tasks / Future Enhancements

### Planned (from migration guide)
1. **Vite Migration** — Split monolith into multi-file component structure (see `CLAUDE-CODE-PROMPT.md`)
2. **Supabase Integration** — Replace localStorage with Supabase for cloud persistence
3. **Authentication** — Supabase email auth for per-user data isolation
4. **Vercel Deployment** — GitHub-connected auto-deploy
5. **PWA** — Service worker for offline mobile usage

### Potential Enhancements
- Tailwind CSS migration (installed but unused)
- Player statistics and trends across rounds
- Course statistics (scoring averages by hole)
- Nassaus and other bet formats
- Configurable player count (2-player, 3-player rounds)
- Score validation and warnings
- Export/share round results
- Dark/light theme toggle (currently dark-only)

---

## File Structure

```
golf-tracker/
├── golf-tracker-phase3.jsx    — Complete application (1,228 lines, single React component)
├── CLAUDE-CODE-PROMPT.md      — Migration guide for splitting into Vite project
└── PROJECT.md                 — This file
```

### Post-Migration Target Structure (from migration guide)

```
src/
├── App.jsx                    — Main app shell, state management, routing
├── main.jsx                   — Entry point
├── theme.js                   — T color constants
├── styles.css                 — Converted CSS
├── utils/
│   ├── calc.js                — calcAll, cStroke, cMatch, cSkins, cSixes
│   ├── golf.js                — calcCH, getStrokes, sixPairs, fmt$, scoreClass
│   └── storage.js             — sv(), ld() (swappable for Supabase)
└── components/
    ├── Nav.jsx                — Bottom navigation + icons
    ├── Modal.jsx              — Confirmation dialogs
    ├── Toggle.jsx             — Toggle switch
    ├── Home.jsx               — Home/round start page
    ├── Players.jsx            — Player management
    ├── Courses.jsx            — Course list + CourseEditor
    ├── Setup.jsx              — Game configuration
    ├── Scoring.jsx            — Hole view + card view
    ├── Bets.jsx               — P&L and settlement
    └── History.jsx            — Round history
```
