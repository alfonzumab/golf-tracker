-- ============================================================
-- Dev Environment: Full Schema (Fresh Install)
-- Creates all tables, RLS, RPCs from scratch
-- ============================================================

-- 1. Base tables (players, courses, rounds)
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "index" NUMERIC,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  tees JSONB,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.rounds (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT,
  course JSONB,
  players JSONB,
  games JSONB,
  is_current BOOLEAN DEFAULT true,
  share_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_course_id TEXT
);

-- 2. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  linked_player_id TEXT,
  preferred_course_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_id)
);

-- 4. Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  course JSONB NOT NULL,
  tee_name TEXT NOT NULL,
  groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  tournament_games JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_config JSONB,
  format TEXT DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'live', 'finished')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Participant tracking
CREATE TABLE IF NOT EXISTS public.round_participants (
  round_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_idx INT,
  player_idx INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Players: global read, admin write
CREATE POLICY "read_players" ON public.players FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_players" ON public.players FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_players" ON public.players FOR UPDATE USING (public.is_admin());
CREATE POLICY "delete_players" ON public.players FOR DELETE USING (public.is_admin());

-- Courses: global read, admin write
CREATE POLICY "read_courses" ON public.courses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert_courses" ON public.courses FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_courses" ON public.courses FOR UPDATE USING (public.is_admin());
CREATE POLICY "delete_courses" ON public.courses FOR DELETE USING (public.is_admin());

-- Rounds: user owns their rows
CREATE POLICY "read_own_rounds" ON public.rounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_rounds" ON public.rounds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_rounds" ON public.rounds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_rounds" ON public.rounds FOR DELETE USING (auth.uid() = user_id);

-- Profiles
CREATE POLICY "read_own_profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_read_profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- User favorites
CREATE POLICY "manage_own_favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User preferences
CREATE POLICY "manage_own_prefs" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tournaments
CREATE POLICY "host_full_access" ON public.tournaments FOR ALL USING (host_user_id = auth.uid());
CREATE POLICY "read_tournaments" ON public.tournaments FOR SELECT USING (true);

-- Participants
CREATE POLICY "rp_read_own" ON public.round_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rp_insert_own" ON public.round_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_read_own" ON public.tournament_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tp_insert_own" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Player links view
-- ============================================================
CREATE OR REPLACE VIEW public.player_links AS
SELECT linked_player_id, preferred_course_id
FROM public.profiles
WHERE linked_player_id IS NOT NULL;

GRANT SELECT ON public.player_links TO authenticated;

-- ============================================================
-- RPCs (Tournaments)
-- ============================================================
CREATE OR REPLACE FUNCTION get_tournament(p_code TEXT)
RETURNS TABLE (id UUID, share_code TEXT, host_user_id UUID, name TEXT, date TEXT, course JSONB, tee_name TEXT, groups JSONB, tournament_games JSONB, team_config JSONB, status TEXT)
AS $$ BEGIN RETURN QUERY SELECT t.id, t.share_code, t.host_user_id, t.name, t.date, t.course, t.tee_name, t.groups, t.tournament_games, t.team_config, t.status FROM tournaments t WHERE t.share_code = UPPER(p_code); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION save_tournament(p_tournament JSONB)
RETURNS void AS $$ DECLARE v_code TEXT; BEGIN v_code := UPPER(p_tournament->>'share_code'); UPDATE tournaments SET name = p_tournament->>'name', date = p_tournament->>'date', course = p_tournament->'course', tee_name = p_tournament->>'tee_name', groups = p_tournament->'groups', tournament_games = COALESCE(p_tournament->'tournament_games', '[]'::jsonb), team_config = p_tournament->'team_config', updated_at = now() WHERE share_code = v_code; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_tournament_status(p_code TEXT, p_status TEXT)
RETURNS void AS $$ BEGIN UPDATE tournaments SET status = p_status, updated_at = now() WHERE share_code = UPPER(p_code); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_tournament_score(p_code TEXT, p_group_idx INT, p_player_idx INT, p_hole_idx INT, p_score INT)
RETURNS void AS $$ DECLARE v_groups JSONB; BEGIN SELECT groups INTO v_groups FROM tournaments WHERE share_code = UPPER(p_code) FOR UPDATE; v_groups := jsonb_set(v_groups, ARRAY[p_group_idx::text, 'players', p_player_idx::text, 'scores', p_hole_idx::text], to_jsonb(p_score)); UPDATE tournaments SET groups = v_groups, updated_at = now() WHERE share_code = UPPER(p_code); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_group_games(p_code TEXT, p_group_idx INT, p_games JSONB)
RETURNS void AS $$ DECLARE v_groups JSONB; BEGIN SELECT groups INTO v_groups FROM tournaments WHERE share_code = UPPER(p_code) FOR UPDATE; v_groups := jsonb_set(v_groups, ARRAY[p_group_idx::text, 'games'], p_games); UPDATE tournaments SET groups = v_groups, updated_at = now() WHERE share_code = UPPER(p_code); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPCs (Rounds)
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_round(p_code TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_round RECORD; v_user_id UUID; BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; SELECT * INTO v_round FROM rounds WHERE share_code = p_code AND is_current = true LIMIT 1; IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Round not found or already finished'); END IF; INSERT INTO round_participants (round_id, user_id) VALUES (v_round.id, v_user_id) ON CONFLICT (round_id, user_id) DO NOTHING; INSERT INTO rounds (id, user_id, date, course, players, games, is_current, share_code, created_at, updated_at) VALUES (v_round.id, v_user_id, v_round.date, v_round.course, v_round.players, v_round.games, true, v_round.share_code, v_round.created_at, now()) ON CONFLICT (id, user_id) DO UPDATE SET date = EXCLUDED.date, course = EXCLUDED.course, players = EXCLUDED.players, games = EXCLUDED.games, is_current = true, share_code = EXCLUDED.share_code, updated_at = now(); RETURN jsonb_build_object('id', v_round.id, 'date', v_round.date, 'course', v_round.course, 'players', v_round.players, 'games', v_round.games, 'share_code', v_round.share_code); END; $$;

CREATE OR REPLACE FUNCTION public.finish_round(p_round_id TEXT, p_share_code TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_host_user_id UUID; v_round_data RECORD; v_participant RECORD; v_participants_saved INT := 0; BEGIN v_host_user_id := auth.uid(); IF v_host_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; SELECT * INTO v_round_data FROM rounds WHERE id = p_round_id AND user_id = v_host_user_id AND is_current = true FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Round not found or already finished'; END IF; UPDATE rounds SET is_current = false, updated_at = now() WHERE id = p_round_id AND user_id = v_host_user_id; FOR v_participant IN SELECT user_id FROM round_participants WHERE round_id = p_round_id AND user_id != v_host_user_id LOOP INSERT INTO rounds (id, user_id, date, course, players, games, is_current, share_code, created_at, updated_at) VALUES (v_round_data.id, v_participant.user_id, v_round_data.date, v_round_data.course, v_round_data.players, v_round_data.games, false, v_round_data.share_code, v_round_data.created_at, now()) ON CONFLICT (id, user_id) DO UPDATE SET date = EXCLUDED.date, course = EXCLUDED.course, players = EXCLUDED.players, games = EXCLUDED.games, is_current = false, share_code = EXCLUDED.share_code, updated_at = now(); v_participants_saved := v_participants_saved + 1; END LOOP; RETURN jsonb_build_object('ok', true, 'participants_saved', v_participants_saved); END; $$;

CREATE OR REPLACE FUNCTION public.register_round_participant(p_round_id TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_user_id UUID; BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; INSERT INTO round_participants (round_id, user_id) VALUES (p_round_id, v_user_id) ON CONFLICT (round_id, user_id) DO NOTHING; RETURN jsonb_build_object('ok', true); END; $$;

CREATE OR REPLACE FUNCTION public.reopen_round(p_round_id TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_user_id UUID; BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; UPDATE rounds SET is_current = true, updated_at = now() WHERE id = p_round_id AND user_id = v_user_id; IF NOT FOUND THEN RAISE EXCEPTION 'Round not found'; END IF; RETURN jsonb_build_object('ok', true); END; $$;

CREATE OR REPLACE FUNCTION public.register_tournament_participant(p_tournament_id UUID, p_group_idx INT DEFAULT NULL, p_player_idx INT DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_user_id UUID; BEGIN v_user_id := auth.uid(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; INSERT INTO tournament_participants (tournament_id, user_id, group_idx, player_idx) VALUES (p_tournament_id, v_user_id, p_group_idx, p_player_idx) ON CONFLICT (tournament_id, user_id) DO UPDATE SET group_idx = EXCLUDED.group_idx, player_idx = EXCLUDED.player_idx, joined_at = now(); RETURN jsonb_build_object('ok', true); END; $$;

CREATE OR REPLACE FUNCTION public.load_tournament_history()
RETURNS TABLE (id UUID, share_code TEXT, host_user_id UUID, name TEXT, date TEXT, course JSONB, tee_name TEXT, groups JSONB, tournament_games JSONB, team_config JSONB, format TEXT, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY SELECT DISTINCT t.* FROM tournaments t LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id AND tp.user_id = auth.uid() WHERE t.status = 'finished' AND (tp.user_id IS NOT NULL OR t.host_user_id = auth.uid()) ORDER BY t.updated_at DESC; END; $$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_tournament TO authenticated;
GRANT EXECUTE ON FUNCTION save_tournament TO authenticated;
GRANT EXECUTE ON FUNCTION update_tournament_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_tournament_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_games TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_round_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_round TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_tournament_history TO authenticated;
