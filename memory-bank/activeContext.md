# Active Context — Golf Tracker

## Current State
**Dev/staging environment is live.** Dual-environment workflow established.

## Just Shipped (2026-02-16)
- **Dev environment setup** — Separate Supabase project for dev/staging, Vercel preview deploys for `dev` branch
- **ErrorBoundary** — Crash recovery UI ("Something went wrong" + Reload button)
- **Toast notification system** — Infrastructure in place (no visible toasts yet, will wire up with error handling)
- **Score validation** — Rejects scores > 15 or < 1
- **Ryder Cup team colors** — Player names in tournament scoring "By Hole" view now display in team colors
- **Enhanced sharing** — Round shares include game results and settlement details
- **Linked player indicators** — Players list shows "Linked" badge and home course

## Environment Setup
- **Branches:** `main` = production, `dev` = staging
- **Vercel project:** `golf-tracker-app` (duplicate `golf-tracker` project deleted)
- **Vercel env vars:** Production vars → prod Supabase, Preview vars → dev Supabase
- **Dev Supabase:** `https://ocjhtvnsfdroovnumehk.supabase.co` — 9 test players, 3 courses, email confirmations disabled
- **Workflow:** All new work on `dev` → test on preview URL → merge to `main` for production

## What's Next
- Wire up toast notifications to error handling
- Continue testing dev environment features on preview URL
- Future: GHIN API integration for auto handicap sync

## Session Start Checklist
1. Read this file and `progress.md`
2. `git checkout dev` — ensure you're on the dev branch
3. Check git status for uncommitted work
4. Follow CLAUDE.md build/lint/deploy procedure for any changes
5. Update memory-bank files on every commit (see CLAUDE.md "AI Workflow & Memory Bank")

---

*Last Updated: 2026-02-16*
