/*
  # Fix ambiguous movie_id reference

  1. Changes
    - Update get_recommendations function to properly qualify movie_id column references
    - Ensure all table references are properly aliased
    - Add explicit table qualifiers to prevent column ambiguity

  2. Technical Details
    - Fixes the "column reference 'movie_id' is ambiguous" error
    - Maintains existing function logic while improving column reference clarity
*/

CREATE OR REPLACE FUNCTION get_recommendations(
  p_preference_id uuid,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  movie_id integer,
  score double precision,
  reason text,
  is_discovery boolean,
  genre_match double precision,
  style_match double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH user_actions AS (
    SELECT 
      aa.movie_id,
      aa.action,
      aa.genres,
      aa.language
    FROM anonymous_actions aa
    WHERE aa.preference_id = p_preference_id
  ),
  liked_movies AS (
    SELECT ua.movie_id
    FROM user_actions ua
    WHERE ua.action = 'like'
  ),
  similar_movies AS (
    SELECT 
      ms.movie2_id as movie_id,
      ms.similarity_score,
      ms.common_likers
    FROM movie_similarities ms
    JOIN liked_movies lm ON ms.movie1_id = lm.movie_id
    WHERE ms.movie2_id NOT IN (
      SELECT ua.movie_id 
      FROM user_actions ua
    )
  )
  SELECT DISTINCT ON (sm.movie_id)
    sm.movie_id,
    (sm.similarity_score * 100)::double precision as score,
    'Based on movies you liked' as reason,
    false as is_discovery,
    80.0 as genre_match,
    90.0 as style_match
  FROM similar_movies sm
  ORDER BY sm.movie_id, sm.similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;