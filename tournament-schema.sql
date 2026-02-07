-- Tournament Mode Schema and RPC Functions
-- Run this in Supabase SQL Editor

-- 1. Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  course JSONB NOT NULL,
  tee_name TEXT NOT NULL,
  groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  tournament_games JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_config JSONB,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'live', 'finished')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for tournaments
-- Host can do everything with their tournament
CREATE POLICY "Host has full access to their tournaments"
  ON tournaments
  FOR ALL
  USING (host_user_id = auth.uid());

-- Anyone can read tournaments by share code (for joining)
CREATE POLICY "Anyone can read tournaments by share code"
  ON tournaments
  FOR SELECT
  USING (true);

-- 4. Get tournament by share code (RPC)
CREATE OR REPLACE FUNCTION get_tournament(p_code TEXT)
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
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.share_code,
    t.host_user_id,
    t.name,
    t.date,
    t.course,
    t.tee_name,
    t.groups,
    t.tournament_games,
    t.team_config,
    t.status
  FROM tournaments t
  WHERE t.share_code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Save/update tournament (RPC)
CREATE OR REPLACE FUNCTION save_tournament(p_tournament JSONB)
RETURNS void AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := UPPER(p_tournament->>'share_code');

  UPDATE tournaments
  SET
    name = p_tournament->>'name',
    date = p_tournament->>'date',
    course = p_tournament->'course',
    tee_name = p_tournament->>'tee_name',
    groups = p_tournament->'groups',
    tournament_games = COALESCE(p_tournament->'tournament_games', '{}'::jsonb),
    team_config = p_tournament->'team_config',
    updated_at = now()
  WHERE share_code = v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update tournament status (RPC)
CREATE OR REPLACE FUNCTION update_tournament_status(p_code TEXT, p_status TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tournaments
  SET
    status = p_status,
    updated_at = now()
  WHERE share_code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update individual score (RPC)
CREATE OR REPLACE FUNCTION update_tournament_score(
  p_code TEXT,
  p_group_idx INT,
  p_player_idx INT,
  p_hole_idx INT,
  p_score INT
)
RETURNS void AS $$
DECLARE
  v_groups JSONB;
BEGIN
  -- Fetch current groups
  SELECT groups INTO v_groups FROM tournaments WHERE share_code = UPPER(p_code);

  -- Update the specific score using jsonb_set with array indexing
  v_groups := jsonb_set(
    v_groups,
    ARRAY[p_group_idx::text, 'players', p_player_idx::text, 'scores', p_hole_idx::text],
    to_jsonb(p_score)
  );

  -- Save back
  UPDATE tournaments
  SET
    groups = v_groups,
    updated_at = now()
  WHERE share_code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Tournament mode schema is ready.
