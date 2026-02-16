# Active Context — Golf Tracker

## Current State
**Maintenance mode** — all planned features complete, production app is live.

## Just Shipped (2026-02-16)
- **Deployment workflow improvements** — CLAUDE.md now requires localhost testing before pushing to production; added SQL file cleanup rules (archive migrations after applying, delete one-time scripts)
- **Linked player indicators** — Players list now shows "Linked" badge and home course for players linked to user accounts (uses new `player_links` view in Supabase)
- **Earnings tab bug fix** — per-player breakdown now uses settlement flows instead of balance comparisons, so the sum matches the lifetime total
- **Earnings tab** on Profile page — lifetime net earnings + per-opponent breakdown
- **Memory bank instructions** updated in CLAUDE.md so all AI tools (Cline, Claude Code CLI, VS Code extension) auto-update progress on every commit

## What's Next
No immediate tasks. User may request:
- Bug fixes as they come up during use
- Minor UI polish or enhancements
- Future: development database setup (separate Supabase project)
- Future: GHIN API integration for auto handicap sync

## Session Start Checklist
1. Read this file and `progress.md`
2. Check git status for uncommitted work
3. Follow CLAUDE.md build/lint/deploy procedure for any changes
4. Update memory-bank files on every commit (see CLAUDE.md "AI Workflow & Memory Bank")

---

*Last Updated: 2026-02-15*
