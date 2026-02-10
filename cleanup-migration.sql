-- =====================================================
-- Cleanup Script: Remove Partial History Migration
-- =====================================================
-- Run this FIRST, then run history-migration.sql

-- Drop all RPC functions
DROP FUNCTION IF EXISTS public.finish_round(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.join_round(TEXT);
DROP FUNCTION IF EXISTS public.register_round_participant(TEXT);
DROP FUNCTION IF EXISTS public.reopen_round(TEXT);
DROP FUNCTION IF EXISTS public.register_tournament_participant(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.load_tournament_history();

-- Drop policies (must drop before dropping tables)
DROP POLICY IF EXISTS "Users can see own" ON public.round_participants;
DROP POLICY IF EXISTS "Users can insert own" ON public.round_participants;
DROP POLICY IF EXISTS "Users can see own" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can insert own" ON public.tournament_participants;

-- Drop tables
DROP TABLE IF EXISTS public.round_participants CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;

-- Drop the partial unique index
DROP INDEX IF EXISTS rounds_share_code_active_unique;

-- Note: We're NOT dropping the timestamp columns from rounds table
-- because they may have useful data. The migration will handle them safely
-- with ADD COLUMN IF NOT EXISTS.
