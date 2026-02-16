# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Vite dev server with HMR (localhost:5173)
npm run build    # Production build to /dist
npm run lint     # ESLint (flat config, v9+)
npm run preview  # Preview production build
```

No test framework is configured. Production deploys automatically via Vercel on push to `main` (configured in `vercel.json`).

ESLint flat config (v9+) allows unused variables matching `^[A-Z_]` (so `GT`, `PC`, `TT` constants won't trigger errors). **Run `npm run build` and `npm run lint` before pushing** — Vercel auto-deploys on push to `main` and a broken build takes the production app down.

**Deployment procedure (MANDATORY — follow every step exactly):**

When the user says "deploy", "push", "ship it", or similar, execute these steps in order:

1. **Build** — Run `npm run build`. If it fails, fix all errors and re-run until it succeeds. Do NOT proceed with errors.
2. **Lint** — Run `npm run lint`. If it fails, fix all errors and re-run until it succeeds. Do NOT proceed with errors. Common lint issues:
   - `setState in effect`: Move the logic out of `useEffect` into the render body or a callback
   - `accessed before declared`: Reorder declarations or inline the logic
   - `unused vars`: Prefix with `_` and uppercase first letter (e.g., `_Foursomes`) to match the `^[A-Z_]` ignore pattern
3. **Test on localhost** — Run `npm run dev` and remind the user to test the changes on `localhost:5173` before deploying to production. Wait for user confirmation before proceeding.
4. **Stage files** — Run `git add` with specific file paths. Never use `git add -A` or `git add .`. Do NOT stage `.env`, `.env.local`, or any credential files.
5. **Commit** — Create a descriptive commit message summarizing what changed and why. Always append this trailer:
   ```
   Co-Authored-By: Claude <model> <noreply@anthropic.com>
   ```
   Replace `<model>` with your actual model name (e.g., `Opus 4.6`, `Sonnet 4.5`).
6. **Update Memory Bank** — After committing, update `memory-bank/progress.md` and `memory-bank/activeContext.md`:
   - Add the commit hash and a one-line summary to `Recent Activity` in `progress.md`
   - Move any completed tasks from "What's Left" to "Completed" in `progress.md`
   - Update `activeContext.md` with what was just shipped and what comes next
7. **Push** — Run `git push origin main`. This triggers Vercel auto-deployment (30-60 seconds to live).
8. **Confirm** — Tell the user the push succeeded and summarize what was deployed.

**Critical rules:**
- Build + lint MUST both pass before committing. A broken push takes the production app down.
- If build or lint fails, fix the issue, then restart from step 1.
- User must test on localhost before pushing to production.
- Never use `--no-verify`, `--force`, or skip any step.
- The production branch is `main`. Never force-push to `main`.

## Architecture

Mobile-first (480px max-width) golf round tracker ("SideAction Golf") with real-time betting/settlement and multi-group tournament mode. React 19 with Vite, no TypeScript. Supabase for auth and cloud storage. PWA-enabled (installable via Add to Home Screen).

### Auth & Data Flow

`src/App.jsx` manages the auth lifecycle:
- `session === undefined` → loading spinner
- `session === null` → render `<Auth />` (login/signup with email/password + Google OAuth)
- `session` truthy → render the app, load data from Supabase

On login, data loads from Supabase with localStorage as write-through cache. Players and courses are now **global shared data** protected by admin-only write access via RLS. Regular users can only modify their personal favorites. Guest players exist only for the current round session.

**Profile System:** Each user has a profile with `linked_player_id` (optional) that references a global player. When set, TournamentSetup auto-selects this player on step 2. Profiles also store `display_name` and `role` ('user' or 'admin').

### Persistence Pattern

Components never call storage functions directly. `App.jsx` provides wrapper functions that:
1. Update React state
2. Write to localStorage via `sv()` (instant UI)
3. Write to Supabase async (cloud persistence)

Three storage modules:
- `src/utils/storage.js` — rounds, global players/courses (admin-only writes), user favorites, profile. `saveCurrentRound()` has 1.5s debounce. `joinRound(code)` calls `join_round` RPC. Round lifecycle RPCs: `finishRound()`, `reopenRound()`, `registerRoundParticipant()`. Admin functions use global queries; user functions only modify favorites.
- `src/utils/tournamentStorage.js` — tournament CRUD via Supabase RPCs. Includes `loadTournamentHistory()`, `reopenTournament()`, `registerTournamentParticipant()` for multi-user history tracking.
- **Global Data Model**: Players and courses are shared across all users. Admin users can add/edit/delete via `adminSavePlayers()`/`adminSaveCourses()`. Regular users see read-only lists and can toggle favorites via `savePlayersFavorites()`. Soft deletes use `is_active = false`.

### Cross-Device Sync

A 10-second poller syncs active rounds. A 60-second poller syncs global players/courses for non-admin users. **Critical invariant:** Supabase is always the source of truth. Admin changes to players/courses propagate via polling. Regular users cannot accidentally delete global data.

### Round Sharing & History

Rounds have a 6-char `shareCode`. Other users can join a shared round via `joinRound(code)` RPC, which copies the round into their own `rounds` table. Same character set as tournament codes (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`).

When a round is finished (`finishRound` RPC), participants are tracked in `round_participants` so all players see the round in their history. `History.jsx` displays both round and tournament history with settlement details, sharing via native share API/clipboard, and the ability to reopen finished rounds/tournaments.

### State Management

All app state lives in `src/App.jsx` via `useState` hooks. No context/Redux — props drilled to children. The component tree is shallow (max 3 levels).

**Page routing** is a string state (`pg`):
- Regular pages: `home`, `players`, `courses`, `setup`, `score`, `bets`, `hist`
- Tournament pages: `thub`, `tsetup`, `tjoin`, `tlobby`, `tscore`, `tboard`

Convention: tournament pages start with `t`. The expression `pg.startsWith('t')` determines whether tournament nav is shown.

### Tournament Mode

Multi-group tournament system with cross-device sync via Supabase. All tournament components live in `src/components/tournament/`.

- **TournamentHub** — entry point: create new or join with 6-char share code
- **TournamentSetup** — multi-step wizard with two flows:
  - **Standard** (4 steps): basics → players (min 4) → groups (2-4 per group, min 2 groups) → skins
  - **Ryder Cup** (6 steps): basics + format → players (even count) → team assignment → match creation → foursome assignment → skins
- **TournamentJoin** — fetches tournament by code, user picks their group/player
- **TournamentLobby** — share code display, group roster, host can edit player handicaps/reorder groups (setup phase only), host starts tournament
- **TournamentScore** — group scorecard (hole view + card view), mirrors `Scoring.jsx` patterns. Player picker shown if `playerInfo` is null.
- **TournamentBoard** — cross-group leaderboard sorted by to-par; Ryder Cup shows team scoreboard + match results
- **TournamentNav** — 3-tab bottom nav (Lobby/Score/Board)

Tournament data flows: `App.jsx` holds `tournament` state, `tournamentGuest` for player identity (persisted via `saveGuestInfo`). Score updates go through `handleTournamentScoreUpdate` → local state update + debounced RPC. Polling every 10s when tournament is live (keeps local scores for user's group, merges others from server).

Share codes use `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no ambiguous chars: 0/O, 1/I/L).

### Calculation Engine (`src/utils/calc.js`)

Pure functions with no React dependencies. `calcAll(games, players)` returns `{ results, settlements, balances }`. Requires exactly 4 players. Five game calculators: `cStroke`, `cMatch`, `cSkins`, `cSixes`, `cVegas` — each returns the same `{ title, details, status, payouts, wager }` shape. **Do not modify calculation logic** without thorough testing — the payout math is correct and interdependent.

**Game mode detection** (stroke & match support two formats each):
- Stroke: `g.team1` exists → 2v2 best-ball; absent → individual (all 4 compete). Both use `wagerFront`/`wagerBack`/`wagerOverall`.
- Match: `g.matchups` exists → individual 1v1 pairs (e.g. `[[0,1],[2,3]]`); absent → 2v2 best-ball with `team1`/`team2`. Both use `wagerFront`/`wagerBack`/`wagerOverall`.

**Special result shapes:**
- Vegas: Returns `vegasData: { team1TotalPoints, team2TotalPoints, t1N, t2N }` + `holeResults` array for hole-by-hole table rendering. Wager is per team; payouts are split 4 ways (2 losers × 2 winners), so divide net points by 4, not 2.
- 6-6-6: Returns `segmentScores` array with team matchup details for each 6-hole segment
- Skins: Returns `holeResults` array with winner info (`w` = winner index, `v` = skin value) for hole-by-hole table

### Game Detail Rendering Consistency

**Critical Rule:** All game detail rendering (6-6-6 segments, Vegas tables, Skins tables, Match/Stroke details, payouts) must be **identical** across regular rounds and tournament views. When adding new game types or modifying detail views, update both:
- `src/components/Bets.jsx` — regular round bets tab
- `src/components/tournament/TournamentScore.jsx` BV() section — tournament group games

**Rendering pattern:**
1. **Vegas & 6-6-6**: Rich visuals (team summaries, segment cards, hole-by-hole tables) shown by default, with expandable payouts section below
2. **All games**: "Tap for details" / "Hide" toggle at bottom of card
3. **Expandable sections**: Payouts breakdown, skins hole-by-hole table (when applicable)
4. **State management**: Use `exp` (Bets.jsx) or `expGame` (TournamentScore.jsx) to track which game card is expanded

Do not create separate duplicate rendering for the same game type — combine rich visuals and expandable details into a single card.

### Tournament Calculation Engine (`src/utils/tournamentCalc.js`)

`calcTournamentSkins(config, players)` — N-player skins calculator for tournament-wide skins (across all groups). Does NOT use `calcAll` which requires exactly 4 players. Used by TournamentScore's Bets view for tournament-level skins display.

`calcMatchPlay(players, matchType)` — Match play calculator for a single Ryder Cup group. Players ordered: team1 first, then team2. `matchType` is `"singles"` (2 players) or `"bestball"` (4 players, best net per pair). Returns `{ t1Won, t2Won, played, remaining, lead, absLead, clinched, finished, statusText, statusTeam, points }`. Status text values: `"AS"` (all square), `"X UP"`, `"DORMIE"`, `"X & Y"` (clinched), `"HALVED"`. Points: `[1,0]` win, `[0,1]` loss, `[0.5,0.5]` halve — only assigned when `finished` is true.

`calcRyderCupStandings(tournament)` — Aggregates all match results. Returns `{ team1Points, team2Points, matchResults, totalMatches }`.

### Golf Math (`src/utils/golf.js`)

`calcCH` → `getStrokes` pipeline: Player's handicap index → course handicap (via slope/rating) → per-hole stroke allocation array. `enrichPlayer(player, teeData)` computes courseHandicap + strokeHoles from a raw player object — used by both tournament scoring and leaderboard. Also: `fmt$()` for currency display, `scoreClass()` for score-to-par CSS classes, `sixPairs()` for random 6-6-6 team generation.

### Supabase Schema

**Global tables** (RLS — all authenticated users can read, admin-only write):
- `players` — id (TEXT PK), name, index, is_active (BOOLEAN, default true)
- `courses` — id (TEXT PK), name, city, tees (JSONB), is_active (BOOLEAN, default true)

**User-scoped tables**:
- `rounds` — composite PK (id, user_id), date, course (JSONB), players (JSONB), games (JSONB), is_current (BOOLEAN), share_code (TEXT, unique)
- `user_preferences` — user_id (PK), selected_course_id
- `user_favorites` — user_id, player_id (composite PK) — replaces per-player favorite flags
- `profiles` — id (UUID FK to auth.users), email, display_name, role ('user'|'admin')

**Shared table** (cross-user, RLS allows read by share code):
- `tournaments` — id (UUID PK), share_code (TEXT, unique), host_user_id, name, date, course (JSONB), tee_name, groups (JSONB), tournament_games (JSONB), team_config (JSONB), format (TEXT: 'standard'|'rydercup'), status (TEXT: 'setup'|'live'|'finished')

**Participant tracking tables** (multi-user history):
- `round_participants` — user_id, round_id (composite PK) — tracks who played in shared rounds
- `tournament_participants` — user_id, tournament_id (composite PK) — tracks who played in tournaments

**RPC functions**: `get_tournament(p_code)`, `save_tournament(p_tournament)`, `update_tournament_status(p_code, p_status)`, `update_tournament_score(p_code, p_group_idx, p_player_idx, p_hole_idx, p_score)`, `update_group_games(p_code, p_group_idx, p_games)`, `join_round(p_code)`, `finish_round(p_round_id, p_share_code)`, `register_round_participant(p_round_id)`, `reopen_round(p_round_id)`, `load_tournament_history()`. The score/games RPCs use `FOR UPDATE` row locking to prevent concurrent write races on the `groups` JSONB column.

### Theme & Styling

- `src/theme.js` exports `T` (color tokens), `GT` (game type enum), `PC` (4 player colors), `TT` (team colors: `a`/`aD` = blue Team A, `b`/`bD` = pink Team B)
- `src/styles.css` is static CSS with hardcoded hex values (originally a JS template literal resolved against `T`). Note: `src/App.css` and `src/index.css` are unused Vite scaffold files (not imported anywhere).
- Components use both CSS classes and inline styles referencing `T` object
- Fonts: Playfair Display (headings), DM Sans (body) — loaded via `index.html`
- CSS class convention: short abbreviated names (`.cd` = card, `.pg` = page, `.bp` = button primary, `.fx` = flex, `.mb10` = margin-bottom 10px)
- Design system minimums: body font 15px, inputs 15px, buttons min-height 48px, score buttons 52×52px, all tap targets ≥44px. Do not introduce font sizes below 11px.

### Round Data Model

A round has exactly 4 players (can include guest players). Each round-player is enriched with: `tee`, `teeData`, `courseHandicap`, `strokeHoles`, `scores`. Handicap index can be overridden at round setup (temporary, doesn't modify global player data). Guest players (`isGuest: true`) exist only in the round's `players` JSON and are not saved globally.

### Tournament Data Model

A tournament has multiple groups, each with 2-4 players. Each tournament player has `{id, name, index, scores: [null x 18]}`. Players are enriched on-the-fly via `enrichPlayer()` in scoring/leaderboard components. The `groups` JSONB stores the full player/score state; individual score updates go through the `update_tournament_score` RPC which patches a single cell.

**Ryder Cup additions:** `format: 'rydercup'` and `teamConfig: { teams: [{name, color, playerIds}], matches: [{type, t1, t2, groupIdx}] }`. Each match maps to one group — `t1`/`t2` are arrays of indices into each team's players. Groups are built in order: team1 players first, then team2 (e.g., singles = `[t1player, t2player]`, bestball = `[t1p1, t1p2, t2p1, t2p2]`).

### PWA

Installable via "Add to Home Screen" on Android/iOS. Launches fullscreen (`display: standalone`) with dark green status bar. Setup:
- `public/manifest.json` — app metadata, icon references
- `public/sw.js` — service worker with fetch handler (required for PWA install), no offline caching
- `public/icons/` — SVG + PNG icons (192/512, regular + maskable)
- `src/main.jsx` — registers service worker on load
- `index.html` — manifest link, apple-mobile-web-app meta tags, theme-color

## Environment

Requires `.env.local` with:
```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase publishable key>
```

**Database Migrations** (run in Supabase SQL Editor, in order):
- `migration-global-db.sql` — global players/courses with admin RLS, profiles table, user_favorites
- `tournament-schema.sql` — tournaments table, RPC functions with row locking
- `history-migration.sql` — round_participants, tournament_participants tables + history RPCs (finish_round, register_round_participant, reopen_round, load_tournament_history)
- `player-links-migration.sql` — player_links view exposing linked_player_id + preferred_course_id

After migration, manually set admin role: `UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';`

**SQL File Management:**
- After a migration is successfully applied to production, move it to `migrations/archive/` folder to keep the root directory clean
- One-time utility scripts (fixes, cleanups) should be deleted after use or archived with a dated filename (e.g., `fix-duplicate-rounds-2026-02-16.sql`)
- Active migrations needed for fresh deployments stay in root; everything else gets archived or deleted

**Legacy files** (outdated, do not use as reference): `PROJECT.md`, `CLAUDE-CODE-PROMPT.md`, `protected-db-migration.sql` (empty) — describe the pre-migration single-file monolith.

## AI Workflow & Memory Bank

The `memory-bank/` directory tracks project state across sessions. **Every AI tool** (Claude Code CLI, Cline in VS Code, Claude Code in VS Code, etc.) must follow these rules:

- **Session Start:** Always read `memory-bank/progress.md` and `memory-bank/activeContext.md` to understand current status before doing work.
- **Task Management:** Before starting any plan, verify the next step against the open tasks in `progress.md`.
- **On Every Commit:** Update `memory-bank/progress.md` (add commit hash + summary to Recent Activity, move completed tasks) and `memory-bank/activeContext.md` (what was shipped, what's next). Include the memory-bank files in the commit.
- **Session End / Handoff:** If ending a session without committing, still update memory-bank files so the next session picks up where you left off.
- **Duplicate Prevention:** Do not re-examine or modify files marked as "Completed" in `progress.md` unless explicitly instructed.
