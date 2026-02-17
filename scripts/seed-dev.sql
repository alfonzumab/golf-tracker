-- Seed script for SettleUp Golf app development environment
-- This script populates a fresh Supabase instance with realistic test data
-- Run this after migrations to set up players, courses, rounds, and tournaments

-- IMPORTANT: This script is for development only. Do not run on production.

-- =====================================================
-- 1. Players (9 total: 8 active, 1 inactive)
-- Realistic names with varied handicap indexes (0 to 30+)
-- =====================================================
INSERT INTO public.players (id, name, index, is_active)
VALUES
  ('player1', 'Mike Johnson', 8.2, true),
  ('player2', 'Dave Williams', 15.7, true),
  ('player3', 'Tom Brown', 3.5, true),
  ('player4', 'Chris Miller', 22.1, true),
  ('player5', 'Steve Davis', 10.4, true),
  ('player6', 'Brian Wilson', 18.9, true),
  ('player7', 'James Taylor', 0.0, true),
  ('player8', 'Robert Clark', 28.3, true),
  ('player9', 'Gary Thompson', 12.6, false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    index = EXCLUDED.index,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- 2. Courses (3 total, Western NY area)
-- Each with multiple tee options (Blue, White, Red) including rating, slope, pars, and handicap rankings
-- =====================================================
INSERT INTO public.courses (id, name, city, tees, is_active)
VALUES
  ('course1', 'Ravenwood Golf Club', 'Victor, NY', '[
    {"name": "Blue", "rating": 72.5, "slope": 135, "pars": [4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [5,11,17,1,7,15,9,3,13,6,18,10,2,8,16,12,4,14]},
    {"name": "White", "rating": 70.1, "slope": 129, "pars": [4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [5,11,17,1,7,15,9,3,13,6,18,10,2,8,16,12,4,14]},
    {"name": "Red", "rating": 67.8, "slope": 122, "pars": [4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [5,11,17,1,7,15,9,3,13,6,18,10,2,8,16,12,4,14]}
  ]', true),
  ('course2', 'Bristol Harbour Golf Club', 'Canandaigua, NY', '[
    {"name": "Blue", "rating": 71.9, "slope": 133, "pars": [4,4,3,5,4,3,4,5,4,4,3,5,4,3,4,5,4,4], "handicaps": [7,3,15,9,1,17,5,11,13,6,18,10,2,16,8,12,4,14]},
    {"name": "White", "rating": 69.5, "slope": 127, "pars": [4,4,3,5,4,3,4,5,4,4,3,5,4,3,4,5,4,4], "handicaps": [7,3,15,9,1,17,5,11,13,6,18,10,2,16,8,12,4,14]},
    {"name": "Red", "rating": 66.2, "slope": 119, "pars": [4,4,3,5,4,3,4,5,4,4,3,5,4,3,4,5,4,4], "handicaps": [7,3,15,9,1,17,5,11,13,6,18,10,2,16,8,12,4,14]}
  ]', true),
  ('course3', 'Greystone Golf Club', 'Walworth, NY', '[
    {"name": "Blue", "rating": 73.2, "slope": 138, "pars": [5,4,3,4,5,3,4,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [9,5,17,1,11,15,7,3,13,6,18,10,2,8,16,12,4,14]},
    {"name": "White", "rating": 70.8, "slope": 130, "pars": [5,4,3,4,5,3,4,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [9,5,17,1,11,15,7,3,13,6,18,10,2,8,16,12,4,14]},
    {"name": "Red", "rating": 68.0, "slope": 123, "pars": [5,4,3,4,5,3,4,4,4,4,3,5,4,4,3,5,4,4], "handicaps": [9,5,17,1,11,15,7,3,13,6,18,10,2,8,16,12,4,14]}
  ]', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    city = EXCLUDED.city,
    tees = EXCLUDED.tees,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- 3. Sample Completed Round
-- 4 players, 18-hole scores, games (stroke play + skins), finished with share code
-- Assumes a host user with UUID 'host-user-uuid' for simplicity (adjust as needed)
-- =====================================================
INSERT INTO public.rounds (id, user_id, date, course, players, games, is_current, share_code, created_at, updated_at)
VALUES (
  'round1',
  'host-user-uuid',
  '2026-02-10',
  (SELECT course FROM (SELECT jsonb_array_elements(tees) AS course FROM public.courses WHERE id = 'course1') AS sub WHERE (course->>'name') = 'Blue'),
  '[
    {"id": "player1", "name": "Mike Johnson", "index": 8.2, "scores": [4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4], "courseHandicap": 9, "strokeHoles": [1,0,0,1,1,0,1,1,0,1,0,1,1,1,0,0,1,0]},
    {"id": "player2", "name": "Dave Williams", "index": 15.7, "scores": [5,6,4,5,5,3,6,5,5,5,4,6,5,5,3,6,5,5], "courseHandicap": 17, "strokeHoles": [1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1]},
    {"id": "player3", "name": "Tom Brown", "index": 3.5, "scores": [4,5,3,4,4,2,5,4,4,4,3,5,4,4,3,5,4,4], "courseHandicap": 4, "strokeHoles": [0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0]},
    {"id": "player4", "name": "Chris Miller", "index": 22.1, "scores": [6,7,5,6,6,4,7,6,6,6,5,7,6,6,4,7,6,6], "courseHandicap": 24, "strokeHoles": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]}
  ]',
  '[
    {"type": "stroke", "wagerFront": 10, "wagerBack": 10, "wagerOverall": 10},
    {"type": "skins", "wager": 5}
  ]',
  false,
  'ABCD12',
  '2026-02-10 08:00:00-05',
  '2026-02-10 13:30:00-05'
) ON CONFLICT (id, user_id) DO UPDATE
SET date = EXCLUDED.date,
    course = EXCLUDED.course,
    players = EXCLUDED.players,
    games = EXCLUDED.games,
    is_current = EXCLUDED.is_current,
    share_code = EXCLUDED.share_code,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- 4. Sample Tournament (Standard Format)
-- 8 players, 2 groups of 4, status 'live', some scores (first 9 holes), share code set
-- =====================================================
INSERT INTO public.tournaments (id, share_code, host_user_id, name, date, course, tee_name, groups, tournament_games, status, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'WXYZ89',
  'host-user-uuid',
  'Winter Classic 2026',
  '2026-02-15',
  (SELECT course FROM (SELECT jsonb_array_elements(tees) AS course FROM public.courses WHERE id = 'course2') AS sub WHERE (course->>'name') = 'White'),
  'White',
  '[
    {
      "players": [
        {"id": "player1", "name": "Mike Johnson", "index": 8.2, "scores": [4,5,3,4,4,3,5,4,4,null,null,null,null,null,null,null,null,null], "courseHandicap": 9, "strokeHoles": [1,1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,1,0]},
        {"id": "player2", "name": "Dave Williams", "index": 15.7, "scores": [5,6,4,5,5,3,6,5,5,null,null,null,null,null,null,null,null,null], "courseHandicap": 17, "strokeHoles": [1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1]},
        {"id": "player3", "name": "Tom Brown", "index": 3.5, "scores": [4,5,3,4,4,2,5,4,4,null,null,null,null,null,null,null,null,null], "courseHandicap": 4, "strokeHoles": [0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0]},
        {"id": "player4", "name": "Chris Miller", "index": 22.1, "scores": [6,7,5,6,6,4,7,6,6,null,null,null,null,null,null,null,null,null], "courseHandicap": 24, "strokeHoles": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]}
      ],
      "games": [{"type": "stroke", "wagerFront": 10, "wagerBack": 10, "wagerOverall": 10}]
    },
    {
      "players": [
        {"id": "player5", "name": "Steve Davis", "index": 10.4, "scores": [5,5,4,5,5,3,6,5,5,null,null,null,null,null,null,null,null,null], "courseHandicap": 11, "strokeHoles": [1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1,1,0]},
        {"id": "player6", "name": "Brian Wilson", "index": 18.9, "scores": [6,6,5,6,6,4,7,6,6,null,null,null,null,null,null,null,null,null], "courseHandicap": 20, "strokeHoles": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
        {"id": "player7", "name": "James Taylor", "index": 0.0, "scores": [4,4,3,4,4,3,5,4,4,null,null,null,null,null,null,null,null,null], "courseHandicap": 0, "strokeHoles": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
        {"id": "player8", "name": "Robert Clark", "index": 28.3, "scores": [7,7,6,7,7,5,8,7,7,null,null,null,null,null,null,null,null,null], "courseHandicap": 31, "strokeHoles": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]}
      ],
      "games": [{"type": "stroke", "wagerFront": 10, "wagerBack": 10, "wagerOverall": 10}]
    }
  ]',
  '[{"type": "skins", "wager": 5}]',
  'live',
  '2026-02-15 07:00:00-05',
  '2026-02-15 10:00:00-05'
) ON CONFLICT (id) DO UPDATE
SET share_code = EXCLUDED.share_code,
    host_user_id = EXCLUDED.host_user_id,
    name = EXCLUDED.name,
    date = EXCLUDED.date,
    course = EXCLUDED.course,
    tee_name = EXCLUDED.tee_name,
    groups = EXCLUDED.groups,
    tournament_games = EXCLUDED.tournament_games,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- Done! Test data seeded for development.
-- =====================================================
