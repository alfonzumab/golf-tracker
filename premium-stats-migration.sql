-- Premium Stats Migration
-- Adds subscription_tier column to profiles table for Phase 1 premium analytics gate
--
-- Run in Supabase SQL Editor on dev first, then production after testing.
--
-- To grant premium access manually:
--   UPDATE public.profiles SET subscription_tier = 'premium' WHERE email = 'your@email.com';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
CHECK (subscription_tier IN ('free', 'premium'));
