# Active Context — Golf Tracker

## Current State
**Premium Stats & Analytics Phase 1 shipped to `dev`.** Awaiting Supabase migration + test.

## Just Built (2026-02-21)
- **Premium Stats page** — `/stats` route (Stats.jsx) with hero card + 5 collapsible analytics cards
  - Hero: lifetime earnings, round count, win/loss streak, earnings sparkline
  - Scoring: gross/net avg, score distribution (eagle/birdie/par/bogey/dbl), front/back 9, best/worst round
  - Games: profitability by game type (net, win rate, avg per game)
  - Skins: total skins won, biggest carry, top hole, by-course breakdown
  - Head-to-Head: top opponents by rounds + net earnings
  - Courses: earnings + scoring avg per course
- **PremiumGate.jsx** — Blurs premium cards + floating overlay with lock icon + "Coming Soon" for free users
- **statsCalc.js** — Pure calculation engine; handles regular rounds + tournament groups
- **Profile "View Full Stats" button** — Added to earnings tab
- **premium-stats-migration.sql** — `subscription_tier TEXT DEFAULT 'free'` on profiles table

## Status
Tested and working on dev. Ready to promote to production when desired.

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
