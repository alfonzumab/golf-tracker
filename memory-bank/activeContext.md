# Active Context — Golf Tracker

## Current State
**All dev features merged to production.** Dual-environment workflow established.

## Just Deployed to Production (2026-02-17)
- **SMS group text sharing** — "Text" button on rounds and tournaments in History; fetches participant phone numbers via RPC, opens native SMS app with pre-filled recipients and results
- **Phone number in profiles** — Optional phone_number field with `get_participant_phones` RPC
- **ErrorBoundary** — Crash recovery UI ("Something went wrong" + Reload button)
- **Toast notification system** — Infrastructure in place (no visible toasts yet)
- **Score validation** — Rejects scores > 15 or < 1
- **Fixed phone-number-migration.sql** — Removed destructive RLS policy changes that broke profile saves

## Environment Setup
- **Branches:** `main` = production, `dev` = staging
- **Vercel project:** `golf-tracker-app` (duplicate `golf-tracker` project deleted)
- **Vercel env vars:** Production vars → prod Supabase, Preview vars → dev Supabase
- **Dev Supabase:** `https://ocjhtvnsfdroovnumehk.supabase.co` — 9 test players, 3 courses, email confirmations disabled
- **Workflow:** All new work on `dev` → test on preview URL → merge to `main` for production

## What's Next
- Wire up toast notifications to error handling
- Future: GHIN API integration for auto handicap sync

## Session Start Checklist
1. Read this file and `progress.md`
2. `git checkout dev` — ensure you're on the dev branch
3. Check git status for uncommitted work
4. Follow CLAUDE.md build/lint/deploy procedure for any changes
5. Update memory-bank files on every commit (see CLAUDE.md "AI Workflow & Memory Bank")

---

*Last Updated: 2026-02-17*
