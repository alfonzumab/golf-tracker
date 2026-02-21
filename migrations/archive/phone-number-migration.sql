-- Phone Number Migration
-- Adds phone_number to profiles WITHOUT breaking existing RLS policies
-- Existing policies already protect phone_number (users can only view/update their own profile)

-- 1. Add phone_number column (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. RPC function to get phone numbers for specific participant IDs
-- Only returns phones for the requested user IDs (for sharing flow)
-- SECURITY DEFINER bypasses RLS so it can look up other users' phones
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

-- After running, reload the schema cache:
-- NOTIFY pgrst, 'reload schema';
