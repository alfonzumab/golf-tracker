# Active Context — Golf Tracker

## Current State
**Landing page live at settleup-golf.com. App at app.settleup-golf.com. Dev database fully seeded with rich test data.**

## Recently Shipped (2026-02-21)
- **Landing page** (`landing/index.html`): hero, how it works, free vs premium table, bottom CTA → app.settleup-golf.com
- **Two Vercel projects**: `settleup-landing` (root dir: `landing/`) → settleup-golf.com + www; `golf-tracker-app` → app.settleup-golf.com
- **Cloudflare**: Added CNAME record for `app` subdomain pointing to Vercel
- **Supabase**: Site URL updated to https://app.settleup-golf.com/ + redirect URL added
- **Android PWA install banner**: Moved to prominent green gradient block above auth card in Auth.jsx; iOS version kept in form with manual instructions
- **Phase 1.5 enhancements** (statsCalc.js + Stats.jsx + Nav.jsx + Home.jsx + App.jsx):
  - Time period filter — Lifetime / per-year pills (no YTD; current year is effectively YTD)
  - Scoring by par type — Par 3/4/5 average scores with hole counts
  - Scoring by course — Course dropdown filter; distribution bars + avgs update reactively
  - Recent form indicator — Hot/Cold/Neutral with avg comparison
  - Skins per-hole-per-course — Chip tags showing which holes won at each course
  - Partner tracking — H2H card shows best/worst partner (team games: stroke/match/vegas 2v2, sixes pairs)
  - Records card — 7th premium card: biggest win/loss, win/loss streaks, current streak, recent form
  - Home stats teaser — Always at top of Home page; mini card with Earnings/Rounds/Streak
  - Stats nav icon — Bar chart icon in Nav between History and Profile
- **UX refinements** (all on production):
  - Stats teaser card moved to very top of Home page
  - Earnings tab removed from Profile (Stats tab replaces it entirely)
  - Net Earnings by Player card added to Stats page (uses h2h.allOpponentsByNet)
  - YTD pill removed from period filter; year buttons serve as per-year filter
  - `key={period}` on ScoringCard forces remount + resets courseFilter on period change
- **Codebase cleanup**:
  - Deleted: `PROJECT.md`, `CLAUDE-CODE-PROMPT.md`, `plan-protectedDbUserAccounts.prompt.md`, `README.md`, `plan.md`
  - Deleted: `src/App.css`, `src/index.css`, `src/assets/react.svg` (unused Vite scaffold)
  - Archived all applied SQL migrations to `migrations/archive/`

## Environment Setup
- **Branches:** `main` = production, `dev` = staging
- **Vercel project:** `golf-tracker-app`
- **Dev Supabase:** `https://ocjhtvnsfdroovnumehk.supabase.co`
- **Workflow:** All new work on `dev` → test on preview URL → merge to `main`

## What's Next
- Phase 2: Stripe Checkout + Vercel `/api` serverless for real payments
- Wire up toast notifications to error handling
- Future: GHIN API integration

## Session Start Checklist
1. Read this file and `progress.md`
2. `git checkout dev` — ensure you're on the dev branch
3. Check git status for uncommitted work
4. Follow CLAUDE.md build/lint/deploy procedure for any changes

---

*Last Updated: 2026-02-21 (session 2)*
