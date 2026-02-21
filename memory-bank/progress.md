# Golf Tracker — Progress & Memory Bank

## Recent Activity

| Commit | Summary |
|--------|---------|
| *(pending)* | Add Premium Stats & Analytics Phase 1 |
| `16a9e14` | Fix phone-number-migration.sql: remove destructive RLS policy changes |
| `082fafd` | Add SMS group text sharing for rounds and tournaments |
| `c48c736` | Add phone number field to user profiles |
| `d1d786b` | Add team color indicators to Ryder Cup tournament scoring |
| `3f63b12` | Enhance sharing: game results, settlements, and website link |
| `9aa21eb` | Update deployment workflow: add localhost testing step and SQL cleanup rules |
| `81ab81a` | Add linked player indicator and home course to Players list |
| `f2b2dac` | Fix earnings tab: per-player breakdown now matches lifetime total |
| `9f7e4b8` | Add earnings tab to Profile with lifetime earnings tracking |
| `d5c4691` | Improve tournament UX: auto-select linked player, cache history, fix lint |
| `4824cd5` | Fix Ryder Cup match creation: resolve player greying bug and streamline foursome workflow |
| `869335a` | Add handicap index editing to tournament setup |
| `8a4ebf9` | Auto-resume live tournaments cross-device |

## Completed Milestones

- Global shared DB with admin RLS (players, courses)
- User auth (email/password + Google OAuth) with profiles
- Tournament system (standard + Ryder Cup formats)
- Cross-device sync (rounds + tournaments)
- Round sharing via 6-char codes
- History with settlement details for rounds and tournaments
- Enhanced sharing: game results + settlements in share text, website link in join-code shares
- Profile page (display name, linked player, preferred course)
- Profile earnings tab (lifetime net earnings by opponent)
- PWA installable on Android/iOS
- Tournament handicap editing in lobby
- Tournament auto-resume cross-device
- SMS group text sharing (phone numbers in profiles, `sms:` URL for rounds and tournaments)
- Dev/staging environment (separate Supabase project, dual-branch workflow)
- ErrorBoundary crash recovery UI
- Score validation (rejects scores > 15 or < 1)
- Premium Stats & Analytics Phase 1 (Stats page, PremiumGate blur, statsCalc engine, DB migration)

## What's Left to Build

### In Progress (on `dev` branch)
- **Toast notifications** — Infrastructure built, needs to be wired to error handling

### Future Roadmap (not started)
- **GHIN API exploration**: Investigate USGA GHIN API for automatic handicap index sync

## Current Status

### Codebase Health
- **Build:** Passing (Vite + React 19)
- **Lint:** Passing (ESLint v9+ flat config)
- **Deployment:** Vercel auto-deploy — `main` → production, `dev` → preview
- **Branches:** `main` (production), `dev` (staging/feature work)
- **Vercel project:** `golf-tracker-app`

### Known Bugs
- None currently tracked

---

*Last Updated: 2026-02-17*
