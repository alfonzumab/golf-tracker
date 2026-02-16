-- Fix missing format column in tournaments table
-- Run this in Supabase SQL Editor

-- Add the format column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tournaments' AND column_name = 'format') THEN
    ALTER TABLE tournaments ADD COLUMN format TEXT DEFAULT 'standard';
  END IF;
END $$;