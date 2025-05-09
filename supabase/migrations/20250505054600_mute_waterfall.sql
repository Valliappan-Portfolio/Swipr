/*
  # Fix recommendations function
  
  1. Changes
    - Use CTEs to properly structure the query
    - Fix UNION ALL syntax
    - Maintain same functionality with correct syntax
*/

CREATE OR REPLACE FUNCTION get_recommendations(
  p_preference_id uuid,
  p_limit integer DEFAULT 10,
  p_discovery_ratio double precision DEFAULT 0.2
)
RETURNS TABLE (
  movie_id integer,
  score double precision,
  reason text,
  is_discovery boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discovery_count integer;
  v_regular_count integer;
BEGIN
  -- Calculate how many regular and discovery recommendations to fetch
  v_discovery_count := floor(p_limit * p_discovery_ratio);
  v_regular_count := p_limit - v_discovery_count;

  RETURN QUERY
  WITH liked_movies AS (
    -- Get user's liked movies
    SELECT movie_id
    FROM anonymous_actions
    WHERE preference_id = p_preference_id
      AND action = 'like'
  ),
  user_movies AS (
    -- Get all movies user has interacted with
    SELECT movie_id
    FROM anonymous_actions
    WHERE preference_id = p_preference_id
  ),
  similar_recommendations AS (
    -- Get recommendations based on similar movies
    SELECT DISTINCT
      CASE 
        WHEN lm.movie_id = ms.movie1_id THEN ms.movie2_id
        ELSE ms.movie1_id
      END as movie_id,
      ms.similarity_score as score,
      'Based on movies you liked'::text as reason,
      false as is_discovery
    FROM liked_movies lm
    JOIN movie_similarities ms ON 
      (lm.movie_id = ms.movie1_id OR lm.movie_id = ms.movie2_id)
    WHERE CASE 
        WHEN lm.movie_id = ms.movie1_id THEN ms.movie2_id
        ELSE ms.movie1_id
      END NOT IN (SELECT movie_id FROM user_movies)
    ORDER BY ms.similarity_score DESC
    LIMIT v_regular_count
  ),
  discovery_recommendations AS (
    -- Get discovery recommendations
    SELECT 
      aa.movie_id,
      0.5 as score,
      'Discover something new'::text as reason,
      true as is_discovery
    FROM anonymous_actions aa
    WHERE aa.preference_id = p_preference_id
      AND aa.action = 'unwatched'
      AND aa.movie_id NOT IN (
        SELECT rl.movie_id 
        FROM recommendation_logs rl 
        WHERE rl.preference_id = p_preference_id
      )
    ORDER BY RANDOM()
    LIMIT v_discovery_count
  )
  SELECT * FROM similar_recommendations
  UNION ALL
  SELECT * FROM discovery_recommendations;
END;
$$;