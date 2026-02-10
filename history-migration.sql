-- =====================================================
-- History Migration: Round & Tournament Participants
-- =====================================================
-- Run this in Supabase SQL Editor
-- Creates participant tracking tables and RPCs for multi-user history

-- =====================================================
-- 1a. Round Participants Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.round_participants (
  round_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (round_id, user_id)
);

ALTER TABLE public.round_participants ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create fresh
DROP POLICY IF EXISTS "Users can see own" ON public.round_participants;
DROP POLICY IF EXISTS "Users can insert own" ON public.round_participants;

CREATE POLICY "Users can see own" ON public.round_participants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own" ON public.round_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 1b. Tournament Participants Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_idx INT,
  player_idx INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create fresh
DROP POLICY IF EXISTS "Users can see own" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can insert own" ON public.tournament_participants;

CREATE POLICY "Users can see own" ON public.tournament_participants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own" ON public.tournament_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 1c. Add timestamp columns to rounds table
-- =====================================================
-- Add created_at and updated_at columns if they don't exist
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill created_at/updated_at for existing rows (set to current time if null)
UPDATE public.rounds
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.rounds
SET updated_at = now()
WHERE updated_at IS NULL;

-- =====================================================
-- 1d. Remove rounds.share_code Unique Constraint
-- =====================================================
-- Drop the old unique constraint that prevented sharing
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_share_code_key;

-- We don't need a unique constraint on share_code because:
-- 1. Multiple users can share the same round (same share_code, different user_id)
-- 2. The composite PK (id, user_id) already ensures row uniqueness
-- 3. Share codes are 6-char random strings (collision probability ~1 in 2 billion)

-- =====================================================
-- 1e. Finish Round RPC (SECURITY DEFINER)
-- =====================================================
CREATE OR REPLACE FUNCTION public.finish_round(
  p_round_id TEXT,
  p_share_code TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_user_id UUID;
  v_round_data RECORD;
  v_participant RECORD;
  v_participants_saved INT := 0;
BEGIN
  -- Get the host's user ID
  v_host_user_id := auth.uid();
  IF v_host_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch the host's active round
  SELECT * INTO v_round_data
  FROM rounds
  WHERE id = p_round_id AND user_id = v_host_user_id AND is_current = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found or already finished';
  END IF;

  -- Mark host's round as finished
  UPDATE rounds
  SET is_current = false, updated_at = now()
  WHERE id = p_round_id AND user_id = v_host_user_id;

  -- Create copies for all participants (excluding host)
  FOR v_participant IN
    SELECT user_id FROM round_participants
    WHERE round_id = p_round_id AND user_id != v_host_user_id
  LOOP
    -- Insert or update participant's copy
    INSERT INTO rounds (
      id, user_id, date, course, players, games,
      is_current, share_code, created_at, updated_at
    )
    VALUES (
      v_round_data.id,
      v_participant.user_id,
      v_round_data.date,
      v_round_data.course,
      v_round_data.players,
      v_round_data.games,
      false, -- participants get finished copy
      v_round_data.share_code,
      v_round_data.created_at,
      now()
    )
    ON CONFLICT (id, user_id) DO UPDATE
    SET
      date = EXCLUDED.date,
      course = EXCLUDED.course,
      players = EXCLUDED.players,
      games = EXCLUDED.games,
      is_current = false,
      share_code = EXCLUDED.share_code,
      updated_at = now();

    v_participants_saved := v_participants_saved + 1;

    -- Clean up any stale active rounds for this participant
    DELETE FROM rounds
    WHERE user_id = v_participant.user_id
      AND id = p_round_id
      AND is_current = true;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'participants_saved', v_participants_saved
  );
END;
$$;

-- =====================================================
-- 1f. Update join_round RPC (add participant registration)
-- =====================================================
CREATE OR REPLACE FUNCTION public.join_round(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find active round with this share code
  SELECT * INTO v_round
  FROM rounds
  WHERE share_code = p_code AND is_current = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Round not found or already finished');
  END IF;

  -- Register as participant
  INSERT INTO round_participants (round_id, user_id)
  VALUES (v_round.id, v_user_id)
  ON CONFLICT (round_id, user_id) DO NOTHING;

  -- Create or update user's active copy
  INSERT INTO rounds (
    id, user_id, date, course, players, games,
    is_current, share_code, created_at, updated_at
  )
  VALUES (
    v_round.id,
    v_user_id,
    v_round.date,
    v_round.course,
    v_round.players,
    v_round.games,
    true,
    v_round.share_code,
    v_round.created_at,
    now()
  )
  ON CONFLICT (id, user_id) DO UPDATE
  SET
    date = EXCLUDED.date,
    course = EXCLUDED.course,
    players = EXCLUDED.players,
    games = EXCLUDED.games,
    is_current = true,
    share_code = EXCLUDED.share_code,
    updated_at = now();

  RETURN jsonb_build_object(
    'id', v_round.id,
    'date', v_round.date,
    'course', v_round.course,
    'players', v_round.players,
    'games', v_round.games,
    'share_code', v_round.share_code
  );
END;
$$;

-- =====================================================
-- 1g. Register Round Participant RPC
-- =====================================================
CREATE OR REPLACE FUNCTION public.register_round_participant(p_round_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO round_participants (round_id, user_id)
  VALUES (p_round_id, v_user_id)
  ON CONFLICT (round_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =====================================================
-- 1h. Reopen Round RPC
-- =====================================================
CREATE OR REPLACE FUNCTION public.reopen_round(p_round_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Set the user's copy of this round to active
  UPDATE rounds
  SET is_current = true, updated_at = now()
  WHERE id = p_round_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =====================================================
-- 1i. Register Tournament Participant RPC
-- =====================================================
CREATE OR REPLACE FUNCTION public.register_tournament_participant(
  p_tournament_id UUID,
  p_group_idx INT DEFAULT NULL,
  p_player_idx INT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO tournament_participants (tournament_id, user_id, group_idx, player_idx)
  VALUES (p_tournament_id, v_user_id, p_group_idx, p_player_idx)
  ON CONFLICT (tournament_id, user_id) DO UPDATE
  SET
    group_idx = EXCLUDED.group_idx,
    player_idx = EXCLUDED.player_idx,
    joined_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =====================================================
-- 1j. Load Tournament History RPC
-- =====================================================
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
  SELECT DISTINCT t.*
  FROM tournaments t
  LEFT JOIN tournament_participants tp
    ON tp.tournament_id = t.id AND tp.user_id = auth.uid()
  WHERE t.status = 'finished'
    AND (tp.user_id IS NOT NULL OR t.host_user_id = auth.uid())
  ORDER BY t.updated_at DESC;
END;
$$;

-- =====================================================
-- Grant execute permissions on RPCs
-- =====================================================
GRANT EXECUTE ON FUNCTION public.finish_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_round_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_tournament_history TO authenticated;
