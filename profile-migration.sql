-- Profile migration: add user profile fields
-- Run this against your Supabase database

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handicap_index numeric(4,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghin_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_course_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_player_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Enable RLS on profiles if not already
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to read their own profile  
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow all authenticated users to insert/update players (not just admins)
-- First, drop any restrictive policies on players table
DROP POLICY IF EXISTS "Only admins can manage players" ON players;

-- Create more permissive policies for players
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
CREATE POLICY "Authenticated users can update players" ON players
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update courses (not just admins)
DROP POLICY IF EXISTS "Only admins can manage courses" ON courses;

DROP POLICY IF EXISTS "Authenticated users can insert courses" ON courses;
CREATE POLICY "Authenticated users can insert courses" ON courses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update courses" ON courses;
CREATE POLICY "Authenticated users can update courses" ON courses
  FOR UPDATE USING (auth.role() = 'authenticated');
