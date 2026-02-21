# Active Context — Golf Tracker

## Current State
**Premium Stats Phase 1.5 shipped to `dev`.** Ready to test on Vercel preview URL.

## Just Built (2026-02-21)
- **Phase 1.5 enhancements** to statsCalc.js + Stats.jsx:
  - **Time period filter** — Lifetime / YTD / per-year pills at top of Stats page
  - **Scoring by par type** — Par 3/4/5 average scores (holes count)
  - **Scoring by course** — Course dropdown filter; distribution bars + avgs update reactively
  - **Recent form indicator** — Hot/Cold/Neutral with avg comparison
  - **Skins per-hole-per-course** — Chip tags showing holes won at each course
  - **Partner tracking** — H2H card shows best/worst partner (team games: stroke/match/vegas 2v2, sixes pairs)
  - **Records card** — 6th premium card: biggest win/loss, win/loss streaks, current streak, recent form
  - **Home stats teaser** — Mini card with Earnings/Rounds/Streak; navigates to Stats page
  - **Stats nav icon** — Bar chart icon added to Nav between History and Profile
  - **Back button** — Stats page back always goes to home (reachable from both nav + profile)

## Status
Committed on dev (1d59c10). Test on Vercel preview URL.

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

*Last Updated: 2026-02-21*
