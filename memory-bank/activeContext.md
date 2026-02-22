# Active Context — Golf Tracker

## Current State
**Stripe subscription integration implemented. Needs Stripe account setup + env vars + DB migration before going live.**

## Recently Shipped (2026-02-21, session 4 — Stripe integration)
- **Stripe subscription flow**: Full Checkout → webhook → profile update pipeline
  - `api/create-checkout.js` — JWT-verified, creates Stripe customer + checkout session
  - `api/stripe-webhook.js` — verifies Stripe signature, sets `subscription_tier = 'premium'` on `checkout.session.completed`, resets to `free` on `customer.subscription.deleted`
  - `api/create-portal.js` — opens Stripe billing portal for premium users
  - `src/components/Upgrade.jsx` — upgrade page with monthly ($1.49) and annual ($9.99) cards
  - `PremiumGate.jsx` — "Coming Soon" → "Upgrade to Premium" clickable button with `onNavigate`
  - `Stats.jsx` — passes `onNavigate` down to PremiumGate
  - `Profile.jsx` — Subscription card shows Free/Premium badge + Upgrade/Manage buttons
  - `App.jsx` — routes `upgrade` page, handles `?upgraded=1` and `?upgrade=1` URL params, shows toast on success
  - `eslint.config.js` — added Node.js globals block for `api/` directory
  - `migrations/stripe-customer-migration.sql` — adds `stripe_customer_id` + `stripe_subscription_id` columns
- **Pricing**: $1.49/month, $9.99/year (44% savings)
- **Pending manual steps**: Stripe account setup, products/prices, webhook registration, Vercel env vars, run DB migration

## Recently Shipped (2026-02-21, session 3)
- **Home page instant load fix**: Cached `profile` and `tournament` in localStorage so all three Home cards (Round in Progress, Your Stats, Active Tournament) render immediately on refresh instead of waiting 600-900ms
  - `storage.js`: `loadProfile()` now calls `sv('profile', data)` before returning
  - `App.jsx`: `profile` and `tournament` initialized from `ld()` (lazy useState)
  - `App.jsx`: `loadTournamentHistory()` moved into the main `Promise.all` (was serial after)
  - `App.jsx`: `sv('tournament', ...)` added everywhere `setTournament` is called with Supabase data; `sv('tournament', null)` on leave/finish
  - `App.jsx`: `handleUpdateProfile` now caches the merged profile object in localStorage

## Recently Shipped (2026-02-21, session 2)
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
- Stripe setup: create Stripe account, products, prices, webhook endpoint, add env vars to Vercel
- Run `migrations/stripe-customer-migration.sql` on both dev and production Supabase
- Test with Stripe test card 4242 4242 4242 4242 on preview URL
- Future: GHIN API integration

## Session Start Checklist
1. Read this file and `progress.md`
2. `git checkout dev` — ensure you're on the dev branch
3. Check git status for uncommitted work
4. Follow CLAUDE.md build/lint/deploy procedure for any changes

---

*Last Updated: 2026-02-21 (session 2)*
