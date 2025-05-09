/*
  # Fix match score calculation
  
  This migration fixes issues with:
  1. Duplicate movie entries affecting the score
  2. Better weighting for matching actions
*/

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid);

-- Create improved match score calculation
CREATE OR REPLACE FUNCTION calculate_match_score(user1_id uuid, user2_id uuid)
RETURNS TABLE (match_score float, common_likes integer) AS $$
DECLARE
  genre_similarity float;
  language_similarity float;
  action_similarity float;
  common_likes_count integer;
  total_interactions integer;
  base_score float := 20.0; -- Increased base score for having any interactions
BEGIN
  -- Calculate genre similarity (25% weight)
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
    ) * 25, 0
  ) INTO genre_similarity;

  -- Calculate language similarity (15% weight)
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
    ) * 15, 0
  ) INTO language_similarity;

  -- Calculate action similarity with improved weighting (40% weight)
  WITH unique_shared_movies AS (
    -- Get only unique movie interactions
    SELECT DISTINCT ON (a1.movie_id)
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
    ORDER BY a1.movie_id, a1.created_at DESC, a2.created_at DESC
  ),
  action_scores AS (
    SELECT 
      CASE
        WHEN user1_action = 'like' AND user2_action = 'like' THEN 2.0  -- Strong match
        WHEN user1_action = 'pass' AND user2_action = 'pass' THEN 0.8  -- Agreement on dislike
        WHEN user1_action = 'unwatched' AND user2_action = 'unwatched' THEN 0.5  -- Similar interest
        WHEN (user1_action = 'like' AND user2_action = 'unwatched') OR 
             (user1_action = 'unwatched' AND user2_action = 'like') THEN 0.3  -- Potential match
        ELSE 0.1  -- Different opinions
      END as match_weight
    FROM unique_shared_movies
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(match_weight) * 40 / NULLIF(COUNT(*), 0), 0)
  INTO 
    total_interactions,
    action_similarity
  FROM action_scores;

  -- Count unique common likes
  SELECT COUNT(DISTINCT a1.movie_id)
  INTO common_likes_count
  FROM anonymous_actions a1
  JOIN anonymous_actions a2 
    ON a1.movie_id = a2.movie_id
    AND a1.preference_id = user1_id 
    AND a2.preference_id = user2_id
    AND a1.action = 'like'
    AND a2.action = 'like';

  -- Return combined score and common likes
  RETURN QUERY
  SELECT 
    CASE 
      WHEN total_interactions > 0 THEN
        GREATEST(
          LEAST(
            base_score + genre_similarity + language_similarity + action_similarity,
            100
          ),
          base_score
        )
      ELSE 0
    END,
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