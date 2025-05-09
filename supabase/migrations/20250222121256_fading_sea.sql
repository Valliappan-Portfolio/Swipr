/*
  # Enhance match score calculation

  1. Changes
    - Improve action similarity calculation to give more weight to common likes
    - Add base score for having any interactions with same movies
    - Better handling of partial matches
    - Normalize scores to prevent 0% matches for active users

  2. Features
    - Minimum base score for any movie overlap
    - Higher weights for common likes
    - Improved normalization of scores
*/

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
  total_interactions integer;
  base_score float := 10.0; -- Minimum score for having any interactions
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

  -- Calculate action similarity with improved weighting (60% weight)
  WITH shared_movies AS (
    SELECT 
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
  ),
  action_scores AS (
    SELECT 
      CASE
        WHEN user1_action = 'like' AND user2_action = 'like' THEN 2.0  -- Double weight for mutual likes
        WHEN user1_action = 'pass' AND user2_action = 'pass' THEN 0.8  -- Similar dislikes
        WHEN user1_action = 'unwatched' AND user2_action = 'unwatched' THEN 0.6  -- Similar interest
        WHEN (user1_action = 'like' AND user2_action = 'unwatched') OR 
             (user1_action = 'unwatched' AND user2_action = 'like') THEN 0.4  -- Potential match
        ELSE 0.2  -- Base score for any interaction with same movie
      END as match_weight
    FROM shared_movies
  )
  SELECT 
    COUNT(*) FILTER (WHERE user1_action = 'like' AND user2_action = 'like'),
    COUNT(*),
    COALESCE(SUM(match_weight) * 60 / NULLIF(COUNT(*), 0), 0)
  INTO 
    common_likes_count,
    total_interactions,
    action_similarity
  FROM shared_movies, action_scores;

  -- Return combined score and common likes
  -- Add base score if there are any interactions
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
  -- First, ensure friend matches exist for all friend requests
  INSERT INTO friend_matches (user1_id, user2_id, match_score, common_likes)
  SELECT 
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    0,
    0
  FROM friend_requests
  WHERE status = 'accepted'
  ON CONFLICT (user1_id, user2_id) DO NOTHING;

  -- Then update all matches with new scores
  UPDATE friend_matches fm
  SET 
    (match_score, common_likes) = (
      SELECT m.match_score, m.common_likes
      FROM calculate_match_score(fm.user1_id, fm.user2_id) m
    ),
    updated_at = now();
END $$;