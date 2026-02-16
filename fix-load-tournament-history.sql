-- Fix load_tournament_history RPC function
-- Run this in Supabase SQL Editor

-- Drop the old function first (it has cached return type without format column)
DROP FUNCTION IF EXISTS public.load_tournament_history();

-- Recreate with format column included
CREATE OR REPLACE FUNCTION public.load_tournament_history()
RETURNS TABLE (
  id UUID,
  share_code TEXT,
  host_user_id UUID,
  name TEXT,
  date TEXT,
  course JSONB,
  tee_name TEXT,
  groups JSONB,
  tournament_games JSONB,
  team_config JSONB,
  format TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.id, t.share_code, t.host_user_id, t.name, t.date, 
         t.course, t.tee_name, t.groups, t.tournament_games, t.team_config,
         t.format, t.status, t.created_at, t.updated_at
  FROM tournaments t
  LEFT JOIN tournament_participants tp
    ON tp.tournament_id = t.id AND tp.user_id = auth.uid()
  WHERE t.status = 'finished'
    AND (tp.user_id IS NOT NULL OR t.host_user_id = auth.uid())
  ORDER BY t.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.load_tournament_history TO authenticated;