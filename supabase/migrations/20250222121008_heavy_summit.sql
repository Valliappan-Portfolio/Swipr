/*
  # Enhance friend match score calculation

  1. Changes
    - Drop existing function and recreate with new return type
    - Improve match score calculation to consider:
      - Genre preferences (30%)
      - Language preferences (20%)
      - Movie action matches (50%)
    - Add common likes counter
    - Optimize performance with better indexing

  2. New Features
    - More granular action matching
    - Weighted scoring system
    - Better handling of partial matches
*/

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_combined 
ON anonymous_actions(preference_id, action, movie_id);

-- Drop existing function first
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid);

-- Create enhanced match score calculation
CREATE FUNCTION calculate_match_score(user1_id uuid, user2_id uuid)
RETURNS TABLE (match_score float, common_likes integer) AS $$
DECLARE
  genre_similarity float;
  language_similarity float;
  action_similarity float;
  common_likes_count integer;
BEGIN
  -- Calculate genre similarity (30% weight)
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT g1)::float / NULLIF(COUNT(DISTINCT g), 0)
      FROM (
        SELECT UNNEST(genres) as g
        FROM anonymous_preferences
        WHERE id IN (user1_id, user2_id)
      ) all_genres
      LEFT JOIN (
        SELECT UNNEST(genres) as g1
        FROM anonymous_preferences
        WHERE id = user1_id
        INTERSECT
        SELECT UNNEST(genres) as g2
        FROM anonymous_preferences
        WHERE id = user2_id
      ) matching_genres ON true
    ) * 30, 0
  ) INTO genre_similarity;

  -- Calculate language similarity (20% weight)
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT l1)::float / NULLIF(COUNT(DISTINCT l), 0)
      FROM (
        SELECT UNNEST(languages) as l
        FROM anonymous_preferences
        WHERE id IN (user1_id, user2_id)
      ) all_langs
      LEFT JOIN (
        SELECT UNNEST(languages) as l1
        FROM anonymous_preferences
        WHERE id = user1_id
        INTERSECT
        SELECT UNNEST(languages) as l2
        FROM anonymous_preferences
        WHERE id = user2_id
      ) matching_langs ON true
    ) * 20, 0
  ) INTO language_similarity;

  -- Calculate action similarity (50% weight)
  WITH action_matches AS (
    SELECT 
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action,
      CASE
        WHEN a1.action = 'like' AND a2.action = 'like' THEN 1.0  -- Perfect match
        WHEN a1.action = 'pass' AND a2.action = 'pass' THEN 0.7  -- Similar taste in dislike
        WHEN a1.action = 'unwatched' AND a2.action = 'unwatched' THEN 0.5  -- Similar interest
        WHEN (a1.action = 'like' AND a2.action = 'unwatched') OR 
             (a1.action = 'unwatched' AND a2.action = 'like') THEN 0.3  -- Potential match
        ELSE 0
      END as match_weight
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
  )
  SELECT 
    COALESCE(SUM(match_weight) * 50 / NULLIF(COUNT(*), 0), 0),
    COUNT(*) FILTER (WHERE user1_action = 'like' AND user2_action = 'like')
  INTO action_similarity, common_likes_count
  FROM action_matches;

  -- Return combined score and common likes
  RETURN QUERY
  SELECT 
    GREATEST(LEAST((genre_similarity + language_similarity + action_similarity), 100), 0),
    common_likes_count;
END;
$$ LANGUAGE plpgsql;

-- Update existing matches with new calculation
DO $$ 
BEGIN
  UPDATE friend_matches fm
  SET 
    (match_score, common_likes) = (
      SELECT m.match_score, m.common_likes
      FROM calculate_match_score(fm.user1_id, fm.user2_id) m
    ),
    updated_at = now();
END $$;