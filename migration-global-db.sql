-- ============================================================
-- Migration: Global Player/Course DB + User Profiles + Favorites
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create is_admin() helper function (now that profiles table exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Profiles RLS: users can read/update their own row, admin can read all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Non-admins cannot change their own role
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR public.is_admin()
    )
  );

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- 4. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create user_favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON public.user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Modify players table: add is_active, make global
-- First add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.players ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Make user_id nullable since players are now global
ALTER TABLE public.players ALTER COLUMN user_id DROP NOT NULL;

-- Drop old RLS policies on players (they filter by user_id)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'players' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.players', pol.policyname);
  END LOOP;
END $$;

-- New RLS policies for players: global read, admin-only write
CREATE POLICY "Anyone authenticated can read players"
  ON public.players FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert players"
  ON public.players FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update players"
  ON public.players FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete players"
  ON public.players FOR DELETE
  USING (public.is_admin());

-- 8. Modify courses table: add is_active, make global
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Make user_id nullable since courses are now global
ALTER TABLE public.courses ALTER COLUMN user_id DROP NOT NULL;

-- Drop old RLS policies on courses
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'courses' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', pol.policyname);
  END LOOP;
END $$;

-- New RLS policies for courses: global read, admin-only write
CREATE POLICY "Anyone authenticated can read courses"
  ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert courses"
  ON public.courses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update courses"
  ON public.courses FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete courses"
  ON public.courses FOR DELETE
  USING (public.is_admin());

-- 9. Create profiles for existing users (backfill)
INSERT INTO public.profiles (id, email, display_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 10. Data migration: deduplicate players into global table
-- NOTE: This step is optional and should only be run if you have duplicate players
-- from the old user-scoped system. Review your data first before running.
--
-- Example deduplication query (run manually after reviewing):
-- DELETE FROM public.players a USING (
--   SELECT MIN(ctid) as ctid, name
--   FROM public.players
--   GROUP BY name HAVING COUNT(*) > 1
-- ) b
-- WHERE a.name = b.name AND a.ctid <> b.ctid;

-- NOTE: After running this migration, you need to manually:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_ADMIN_EMAIL';
-- Replace YOUR_ADMIN_EMAIL with the admin's actual email address.

-- Optional: drop user_id column from players/courses after confirming migration
-- (Keep it for now as a safety net — the RLS policies no longer reference it)

-- 11. Migrate favorite flags to user_favorites table
-- NOTE: Favorites are now handled by the user_favorites table created in step 5.
-- If you had favorites stored in a different way previously, migrate them here.
-- For now, this step is commented out since no 'favorite' column exists in players table.

-- INSERT INTO public.user_favorites (user_id, player_id)
-- SELECT DISTINCT p.user_id, p.id
-- FROM public.players p
-- WHERE p.favorite = true
--   AND p.user_id IS NOT NULL
-- ON CONFLICT (user_id, player_id) DO NOTHING;
