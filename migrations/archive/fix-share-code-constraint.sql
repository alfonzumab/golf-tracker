-- =====================================================
-- Fix Share Code Constraint
-- =====================================================
-- The partial unique index is preventing round sharing.
-- We don't actually need uniqueness on share_code because:
-- 1. Multiple users can share the same round (same share_code)
-- 2. The composite PK (id, user_id) already ensures uniqueness
-- 3. Share codes are randomly generated, collisions are extremely rare

-- Drop the overly-restrictive unique index
DROP INDEX IF EXISTS rounds_share_code_active_unique;

-- We don't need to replace it with anything!
-- The rounds table already has:
-- - Composite PK (id, user_id) for row uniqueness
-- - Share codes are 6-char random strings (collision probability ~1 in 2 billion)
