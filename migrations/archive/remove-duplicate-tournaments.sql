-- =====================================================
-- Remove Duplicate Finished Tournaments
-- =====================================================
-- If you accidentally finished a tournament multiple times,
-- this will keep only the most recent entry per tournament

-- Preview duplicates (optional - uncomment to see what will be removed):
-- SELECT t.id, t.name, t.share_code, t.status, t.updated_at,
--        tp.user_id,
--        ROW_NUMBER() OVER (PARTITION BY t.share_code, tp.user_id ORDER BY t.updated_at DESC) as rn
-- FROM tournaments t
-- JOIN tournament_participants tp ON tp.tournament_id = t.id
-- WHERE t.status = 'finished'
-- ORDER BY t.share_code, tp.user_id, t.updated_at DESC;

-- Remove duplicate tournament_participants entries
-- (Keep only the newest tournament per share_code for each user)
DELETE FROM tournament_participants
WHERE (tournament_id, user_id) IN (
  SELECT tp.tournament_id, tp.user_id
  FROM tournament_participants tp
  JOIN tournaments t ON t.id = tp.tournament_id
  WHERE t.status = 'finished'
    AND (tp.tournament_id, tp.user_id) NOT IN (
      -- Keep the most recent tournament for each share_code + user combo
      SELECT DISTINCT ON (t2.share_code, tp2.user_id)
        tp2.tournament_id, tp2.user_id
      FROM tournament_participants tp2
      JOIN tournaments t2 ON t2.id = tp2.tournament_id
      WHERE t2.status = 'finished'
      ORDER BY t2.share_code, tp2.user_id, t2.updated_at DESC
    )
);

-- Verify - should return 0 rows if successful
-- SELECT share_code, COUNT(*)
-- FROM tournaments
-- WHERE status = 'finished'
-- GROUP BY share_code
-- HAVING COUNT(*) > 1;
