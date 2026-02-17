-- Phone Number Migration
-- Adds phone_number to profiles with strict privacy RLS

-- 1. Add column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Drop existing RLS policies on profiles that might conflict, then recreate with phone_number privacy
-- Users can read their OWN full profile (including phone_number)
-- Other users should NOT be able to read phone_number

-- Drop the broad select policy if it exists and replace with a self-only one
DO $$
BEGIN
  -- Try dropping existing policies that allow broad read
  BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own profile (protects phone_number from other users)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own profile
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. RPC function to get phone numbers for specific participant IDs
-- Only returns phones for the requested user IDs (for sharing flow)
CREATE OR REPLACE FUNCTION public.get_participant_phones(p_participant_ids UUID[])
RETURNS TABLE(user_id UUID, phone_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only authenticated users can call this
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT p.id AS user_id, p.phone_number
    FROM public.profiles p
    WHERE p.id = ANY(p_participant_ids)
      AND p.phone_number IS NOT NULL
      AND p.phone_number != '';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_participant_phones(UUID[]) TO authenticated;
