-- ============================================================
-- Migration: Player Links View
-- Exposes linked_player_id + preferred_course_id from profiles
-- without revealing sensitive user data (email, role, etc.)
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- Create a view that only exposes the player-link mapping
CREATE OR REPLACE VIEW public.player_links AS
SELECT linked_player_id, preferred_course_id
FROM public.profiles
WHERE linked_player_id IS NOT NULL;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.player_links TO authenticated;
