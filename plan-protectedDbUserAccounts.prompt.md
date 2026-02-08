# Plan: Protected Player/Course DB + User Accounts with Auth

**TL;DR**: Move players and courses from per-user tables to a **shared global database** protected by admin-only write access via Supabase RLS. Add a `profiles` table with a `role` column to distinguish admin from regular users. Enhance auth with Google OAuth alongside existing email/password. Regular users get their own favorites, round history, and the ability to add session-only guest players. Handicap index overrides happen at round/tournament setup time and persist only for that round. This eliminates accidental player/course deletions by removing write access from the client-side diff-sync logic entirely for non-admin users.

## Steps

### 1. New Database Schema — Supabase Migrations

- **Create `profiles` table**: `id` (UUID, FK to `auth.users`), `email`, `display_name`, `role` (TEXT, default `'user'`, values: `'user'` | `'admin'`), `created_at`. Add a trigger on `auth.users` insert to auto-create a profile row with role `'user'`.
- **Create `user_favorites` table**: `user_id` (UUID, FK to `auth.users`), `player_id` (TEXT, FK to `players.id`), composite PK on both. This replaces the per-player `favorite` boolean.
- **Modify `players` table**: Remove `user_id` column. Add `is_active` (BOOL, default true) for soft-delete instead of hard delete. All players become global. Remove the old per-user RLS policies.
- **Modify `courses` table**: Remove `user_id` column. Add `is_active` (BOOL, default true) for soft-delete. All courses become global. Remove the old per-user RLS policies.
- **New RLS policies for `players`**: SELECT allowed for all authenticated users. INSERT/UPDATE/DELETE restricted to users where `profiles.role = 'admin'` (via a helper function `is_admin()` that checks the profiles table).
- **New RLS policies for `courses`**: Same pattern — all authenticated can SELECT, only admin can write.
- **New RLS policies for `profiles`**: Users can SELECT/UPDATE their own row. Only admin can UPDATE the `role` column.
- **`rounds` table** stays per-user (no changes to schema, only the `players` JSON column now embeds a snapshot including any HCP overrides).
- **Create `is_admin()` SQL function**: `SECURITY DEFINER` function that returns `true` if `auth.uid()` has role `'admin'` in `profiles`.

### 2. Enable Google OAuth — Supabase Dashboard Config

- In Supabase Dashboard → Authentication → Providers → Enable Google.
- Configure Google Cloud Console: create OAuth 2.0 credentials, set redirect URI to `https://<supabase-project>.supabase.co/auth/v1/callback`.
- No code dependency changes needed — Supabase JS SDK handles it natively via `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### 3. Update Auth Component — `src/components/Auth.jsx`

- Add a "Sign in with Google" button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- Keep existing email/password login and signup flows.
- Style the Google button per the app's existing theme system (`T` object).
- After successful signup (either method), the database trigger auto-creates a `profiles` row.

### 4. Refactor Storage Layer — `src/utils/storage.js`

- **`loadPlayers()`**: Remove `.eq('user_id', user.id)`. Load ALL active players: `.eq('is_active', true).order('name')`. Also load user's favorites from `user_favorites` and merge the `favorite` boolean onto each player object client-side.
- **`savePlayers()`**: **Remove entirely for non-admin users.** Replace with `savePlayersFavorites(playerIds)` that upserts/deletes from `user_favorites` only.
- **New `adminSavePlayers(players)`**: Admin-only function that upserts to the global `players` table. Keep the existing diff logic but scoped globally (no `user_id` filter). The RLS policy enforces admin-only access, so even if called by a non-admin, Supabase rejects it.
- **`loadCourses()`**: Remove `.eq('user_id', user.id)`. Load ALL active courses: `.eq('is_active', true).order('name')`.
- **`saveCourses()`**: **Remove for non-admin users.** Replace with admin-only `adminSaveCourses()`.
- **`saveSelectedCourse()`**: Keep as-is (user preference).
- **Rounds functions**: Keep per-user, no changes needed.
- **Remove `importLocalData()`**: No longer needed since players/courses are global. Could optionally import rounds on first login.
- **New `loadProfile()`**: Fetch current user's profile including role.
- **New `saveProfile(updates)`**: Update display_name, etc.

### 5. Update App State & Data Flow — `src/App.jsx`

- Add `profile` state (holds `{ role, display_name, ... }`).
- Load profile on session change alongside players/courses.
- Derive `isAdmin = profile?.role === 'admin'` and pass down as prop.
- **`handleSetPlayers`**: If admin → call `adminSavePlayers()`. If user → only save favorites via `savePlayersFavorites()`. Never allow non-admin writes to the players table.
- **`handleSetCourses`**: If admin → call `adminSaveCourses()`. If user → no-op (read-only).
- Remove the triple-write pattern for players/courses for regular users; they only write favorites.
- Add polling for players/courses (lightweight, maybe 60s interval) so global changes propagate.

### 6. Update Players Component — `src/components/Players.jsx`

- **Admin view**: Full CRUD as today — add, edit name/index, soft-delete (set `is_active = false`), restore. Add an "Inactive Players" section showing soft-deleted players with a restore button.
- **User view**: Read-only list. Can toggle ⭐ favorite (writes to `user_favorites`). Can search/filter. No add/edit/delete buttons visible.
- Conditionally render admin controls based on `isAdmin` prop.

### 7. Update Courses Component — `src/components/Courses.jsx`

- **Admin view**: Full CRUD — add courses, edit tees/pars/handicaps, soft-delete, restore.
- **User view**: Read-only. Can browse courses and tee details. No edit/delete buttons.
- Same `isAdmin` conditional rendering.

### 8. Guest Players for Rounds — `src/components/Home.jsx`

- Add an "Add Guest" button in the player selection area (visible to all users).
- Guest player creation: inline form for name + handicap index. Creates a temporary object `{ id: 'guest-' + crypto.randomUUID(), name, index, isGuest: true }`.
- Guest players are **not** saved to the `players` table. They exist only in the round's `players` JSON array.
- Guest players appear in the player picker with a "Guest" badge during that round setup.
- After the round is finalized, the guest data lives in the round's history but never pollutes the global player DB.
- Optional: store recent guests in localStorage for convenience (last 5 guests, key `gt3-recentGuests`).

### 9. Handicap Index Override at Round Setup — `src/components/Home.jsx`

- In the player selection area, after selecting a player, show their current index from the global DB.
- Add an editable index field next to each selected player. Pre-filled with the global value, but any user can change it.
- The override value is what gets embedded in the round's `players` JSON — it does NOT update the global `players` table (only admin changes master via Players management).
- This already partially works since `p.index` is spread into the round player object; we just need to make the field editable in the selection UI.

### 10. User Profile & History — `src/components/History.jsx`

- History remains per-user (each user sees only their own rounds) — no changes needed to the current per-user round storage.
- Add a small profile section accessible from `Nav.jsx` showing the user's display name, email, and a logout button.
- User's favorite players appear first in all player selection lists.

### 11. Data Migration Strategy

- Write a one-time migration script (can be a Supabase SQL migration or a Node script):
  1. Identify the admin user's `user_id` from the current `players` table.
  2. Copy all players from that user's records to the new global `players` table (remove `user_id`, add `is_active = true`).
  3. Do the same for courses.
  4. For other users who had duplicate player entries, map their player names to the global IDs and create `user_favorites` entries.
  5. Migrate existing rounds: no change needed (they embed player data as JSON snapshots).
- Set the admin user's profile role to `'admin'`.

### 12. Update CLAUDE.md

- Document the new shared data model, admin/user role distinction, RLS policies, Google OAuth setup, guest player pattern, and favorites system.

## Verification

- **Auth**: Test email/password signup, email/password login, Google OAuth login. Verify profile is auto-created with role `'user'`.
- **Admin CRUD**: Log in as admin → add/edit/soft-delete players and courses → verify changes appear for other users.
- **User read-only**: Log in as regular user → verify no add/edit/delete buttons on players/courses → verify can toggle favorites.
- **Guest players**: As any user, create a round with a guest player → complete round → verify guest is in history but NOT in global players list.
- **HCP override**: Select a player, change their index in round setup → verify round uses the override → verify global player index unchanged.
- **Accidental deletion prevention**: As admin, try to delete a player → verify soft-delete (is_active=false) → verify player still exists in DB → verify admin can restore.
- **RLS enforcement**: Use Supabase SQL editor as a non-admin user to attempt INSERT/UPDATE/DELETE on players/courses → verify rejection.
- **Cross-device sync**: Log in on two devices → admin adds a player → verify it appears on the other device within polling interval.

## Key Decisions

- **Soft-delete over hard-delete**: Chose `is_active` flag to prevent permanent data loss; admin can restore.
- **Shared global DB over per-user copies**: Simplifies data model, eliminates the diff-sync deletion bug entirely for regular users, single source of truth.
- **Session-only guests over persisted guests**: Keeps the global DB clean; recent guests cached in localStorage for convenience.
- **Profiles table for roles over env var**: More scalable, queryable in RLS policies, no redeployment needed to change roles.
- **User can update HCP freely (no admin approval)**: Override at round setup, does not modify the master record — only admin changes master via Players management.
