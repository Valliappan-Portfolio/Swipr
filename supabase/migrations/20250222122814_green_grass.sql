-- First, let's analyze the current match calculation
WITH user_actions AS (
  SELECT 
    preference_id,
    COUNT(*) FILTER (WHERE action = 'like') as likes,
    COUNT(*) FILTER (WHERE action = 'pass') as passes,
    COUNT(*) FILTER (WHERE action = 'unwatched') as unwatched,
    COUNT(*) as total_actions
  FROM anonymous_actions
  GROUP BY preference_id
)
SELECT * FROM user_actions;

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid);

-- Create improved match score calculation with better weighting
CREATE OR REPLACE FUNCTION calculate_match_score(user1_id uuid, user2_id uuid)
RETURNS TABLE (match_score float, common_likes integer) AS $$
DECLARE
  genre_similarity float;
  language_similarity float;
  action_similarity float;
  common_likes_count integer;
  total_interactions integer;
  base_score float := 30.0; -- Higher base score for having interactions
BEGIN
  -- Calculate genre similarity (30% weight)
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT g1)::float / NULLIF(COUNT(DISTINCT g), 0) * 30
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
    ), 0
  ) INTO genre_similarity;

  -- Calculate language similarity (20% weight)
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT l1)::float / NULLIF(COUNT(DISTINCT l), 0) * 20
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
    ), 0
  ) INTO language_similarity;

  -- Calculate action similarity (50% weight)
  WITH unique_shared_movies AS (
    -- Get unique movie interactions
    SELECT DISTINCT ON (a1.movie_id)
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action,
      a1.genres as movie_genres
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
    ORDER BY a1.movie_id, a1.created_at DESC, a2.created_at DESC
  ),
  action_scores AS (
    SELECT 
      movie_id,
      user1_action,
      user2_action,
      movie_genres,
      CASE
        WHEN user1_action = 'like' AND user2_action = 'like' THEN 
          2.5 + (
            -- Additional boost for matching genres
            SELECT COUNT(*) * 0.2
            FROM unnest(movie_genres) g
            WHERE g = ANY(
              SELECT unnest(genres)
              FROM anonymous_preferences
              WHERE id IN (user1_id, user2_id)
            )
          )
        WHEN user1_action = 'pass' AND user2_action = 'pass' THEN 1.0
        WHEN user1_action = 'unwatched' AND user2_action = 'unwatched' THEN 0.5
        WHEN (user1_action = 'like' AND user2_action = 'unwatched') OR 
             (user1_action = 'unwatched' AND user2_action = 'like') THEN 0.3
        ELSE 0.1
      END as match_weight
    FROM unique_shared_movies
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(match_weight) * 50 / NULLIF(COUNT(*), 0), 0)
  INTO 
    total_interactions,
    action_similarity
  FROM action_scores;

  -- Count common likes with genre boost
  WITH common_likes AS (
    SELECT DISTINCT a1.movie_id, a1.genres
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
      AND a1.action = 'like'
      AND a2.action = 'like'
  )
  SELECT COUNT(DISTINCT movie_id)
  INTO common_likes_count
  FROM common_likes;

  -- Return combined score and common likes
  RETURN QUERY
  SELECT 
    CASE 
      WHEN total_interactions > 0 THEN
        GREATEST(
          LEAST(
            base_score + 
            genre_similarity + 
            language_similarity + 
            action_similarity +
            (LEAST(common_likes_count, 10) * 2), -- Bonus for common likes (max 20%)
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