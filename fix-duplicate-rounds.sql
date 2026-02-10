-- =====================================================
-- Fix Duplicate Active Rounds
-- =====================================================
-- This script fixes any duplicate active rounds that violate
-- the new unique constraint on share_code

-- Step 1: Show duplicates (for review)
-- Uncomment to see what will be fixed:
-- SELECT share_code, user_id, id, created_at, is_current
-- FROM rounds
-- WHERE is_current = true AND share_code IS NOT NULL
-- ORDER BY share_code, created_at;

-- Step 2: For each share_code, keep only the NEWEST active round per user
-- Mark older duplicates as inactive
WITH ranked_rounds AS (
  SELECT
    id,
    user_id,
    share_code,
    created_at,
    is_current,
    ROW_NUMBER() OVER (
      PARTITION BY share_code, user_id
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM rounds
  WHERE is_current = true AND share_code IS NOT NULL
)
UPDATE rounds
SET is_current = false
WHERE id IN (
  SELECT id
  FROM ranked_rounds
  WHERE rn > 1
);

-- Step 3: Verify - should return 0 rows if fixed
-- Uncomment to verify:
-- SELECT share_code, COUNT(*) as count
-- FROM rounds
-- WHERE is_current = true AND share_code IS NOT NULL
-- GROUP BY share_code
-- HAVING COUNT(*) > 1;
