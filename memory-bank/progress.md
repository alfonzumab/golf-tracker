# Golf Tracker — Progress & Memory Bank

## Recent Activity

| Commit | Summary |
|--------|---------|
| (pending) | Fix Home page instant load: cache profile + tournament in localStorage, parallelize tournament history |
| `9f44ecc` | Make Android PWA install prompt prominent on auth screen |
| `c0a291e` | Add landing page (landing/index.html) + Vercel config |
| `fd2f562` | Codebase cleanup: delete legacy files, archive migrations, update docs |
| `0f62b9f` | Fix Stats period filter: key ScoringCard on period to reset course dropdown |
| `1159309` | UX refinements: home teaser top, remove profile earnings tab, net earnings card, no YTD pill |
| `2c3c78a` | Update memory bank: dev features merged to production |
| `1d59c10` | Add Premium Stats Phase 1.5: time filter, par type, skins by hole, partner tracking, records, nav icon |
| `5494267` | Add Premium Stats & Analytics Phase 1 |
| `16a9e14` | Fix phone-number-migration.sql: remove destructive RLS policy changes |
| `082fafd` | Add SMS group text sharing for rounds and tournaments |
| `c48c736` | Add phone number field to user profiles |
| `d1d786b` | Add team color indicators to Ryder Cup tournament scoring |
| `3f63b12` | Enhance sharing: game results, settlements, and website link |
| `9aa21eb` | Update deployment workflow: add localhost testing step and SQL cleanup rules |

## Completed Milestones

- Global shared DB with admin RLS (players, courses)
- User auth (email/password + Google OAuth) with profiles
- Tournament system (standard + Ryder Cup formats)
- Cross-device sync (rounds + tournaments)
- Round sharing via 6-char codes
- History with settlement details for rounds and tournaments
- Enhanced sharing: game results + settlements in share text, website link in join-code shares
- Profile page (display name, linked player, preferred course, phone number)
- PWA installable on Android/iOS
- Tournament handicap editing in lobby
- Tournament auto-resume cross-device
- SMS group text sharing (phone numbers in profiles, `sms:` URL for rounds and tournaments)
- Dev/staging environment (separate Supabase project, dual-branch workflow)
- ErrorBoundary crash recovery UI
- Score validation (rejects scores > 15 or < 1)
- Premium Stats & Analytics Phase 1 (Stats page, PremiumGate blur, statsCalc engine, DB migration)
- Premium Stats Phase 1.5 (time period filter, scoring by par type + course, skins by hole/course, partner tracking, Records card, Net Earnings card, Home teaser at top, Stats nav icon)
- UX refinements: earnings tab removed from Profile, YTD pill removed, period filter resets course dropdown
- Codebase cleanup: deleted legacy files + Vite scaffold, archived all SQL migrations, updated CLAUDE.md
- Landing page at settleup-golf.com (landing/index.html — hero, how it works, free vs premium table, CTA)
- App moved to app.settleup-golf.com (Vercel domain reassignment + Cloudflare CNAME for app subdomain)
- Two Vercel projects from one repo: `golf-tracker-app` → app subdomain, `settleup-landing` → root domain
- Android PWA install banner: prominent green gradient block above auth card (not buried in form)
- Dev database seeded: `seed-dev.sql` — 12 players, 4 courses, 40 finished rounds, 3 tournaments (Spring Scramble, Summer Classic, Ryder Cup 2026), all game types covered, Stats page fully exercised

## What's Left to Build

### Future Roadmap (not started)
- **Phase 2 payments**: Stripe Checkout + Vercel `/api` serverless for real money premium unlock
- **Toast notifications**: Infrastructure built, needs to be wired to error handling
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

*Last Updated: 2026-02-21*
