-- First drop the existing function
DROP FUNCTION IF EXISTS get_recommendations(uuid, integer, double precision);

-- Create the enhanced recommendations function
CREATE FUNCTION get_recommendations(
  p_preference_id uuid,
  p_limit integer DEFAULT 10,
  p_discovery_ratio double precision DEFAULT 0.2
) RETURNS TABLE (
  movie_id integer,
  score double precision,
  reason text,
  is_discovery boolean,
  genre_match double precision,
  style_match double precision,
  similar_movie_id integer
) AS $$
BEGIN
  RETURN QUERY
  WITH user_likes AS (
    -- Get user's liked movies
    SELECT 
      aa.movie_id,
      aa.genres,
      aa.language
    FROM anonymous_actions aa
    WHERE aa.preference_id = p_preference_id
      AND aa.action = 'like'
  ),
  movie_matches AS (
    -- Calculate detailed match scores
    SELECT 
      aa.movie_id,
      ms.similarity_score as base_score,
      -- Calculate genre match
      COALESCE(
        (
          SELECT COUNT(DISTINCT g1)::float / NULLIF(COUNT(DISTINCT g), 0) * 100
          FROM (
            SELECT UNNEST(ul.genres) as g
            FROM user_likes ul
          ) all_genres
          LEFT JOIN (
            SELECT UNNEST(aa.genres) as g1
            FROM anonymous_actions aa2
            WHERE aa2.movie_id = aa.movie_id
            INTERSECT
            SELECT UNNEST(ul.genres) as g2
            FROM user_likes ul
          ) matching_genres ON true
        ),
        0
      ) as genre_match,
      -- Calculate style match based on language and other factors
      COALESCE(
        (
          SELECT COUNT(*)::float / NULLIF(COUNT(*), 0) * 100
          FROM user_likes ul
          WHERE ul.language = aa.language
        ),
        0
      ) as style_match,
      -- Find most similar liked movie
      (
        SELECT ul.movie_id
        FROM user_likes ul
        JOIN movie_similarities ms2 ON 
          (ul.movie_id = ms2.movie1_id AND aa.movie_id = ms2.movie2_id) OR
          (ul.movie_id = ms2.movie2_id AND aa.movie_id = ms2.movie1_id)
        ORDER BY ms2.similarity_score DESC
        LIMIT 1
      ) as similar_movie_id,
      false as is_discovery
    FROM anonymous_actions aa
    JOIN movie_similarities ms ON 
      (aa.movie_id = ms.movie1_id OR aa.movie_id = ms.movie2_id)
    WHERE aa.movie_id NOT IN (SELECT movie_id FROM user_likes)
    UNION ALL
    -- Discovery recommendations
    SELECT 
      aa.movie_id,
      0.5 as base_score,
      COALESCE(
        (
          SELECT COUNT(DISTINCT g1)::float / NULLIF(COUNT(DISTINCT g), 0) * 100
          FROM (
            SELECT UNNEST(ul.genres) as g
            FROM user_likes ul
          ) all_genres
          LEFT JOIN (
            SELECT UNNEST(aa.genres) as g1
            INTERSECT
            SELECT UNNEST(ul.genres) as g2
            FROM user_likes ul
          ) matching_genres ON true
        ),
        0
      ) as genre_match,
      COALESCE(
        (
          SELECT COUNT(*)::float / NULLIF(COUNT(*), 0) * 100
          FROM user_likes ul
          WHERE ul.language = aa.language
        ),
        0
      ) as style_match,
      NULL::integer as similar_movie_id,
      true as is_discovery
    FROM anonymous_actions aa
    WHERE aa.preference_id = p_preference_id
      AND aa.action = 'unwatched'
      AND aa.movie_id NOT IN (
        SELECT movie_id 
        FROM recommendation_logs 
        WHERE preference_id = p_preference_id
      )
  )
  SELECT 
    mm.movie_id,
    GREATEST(
      LEAST(
        (mm.base_score * 0.4 + 
         mm.genre_match * 0.4 + 
         mm.style_match * 0.2)::double precision,
        100
      ),
      0
    ) as score,
    CASE 
      WHEN mm.is_discovery THEN 'Discover something new based on your taste'
      ELSE 'Based on your liked movies'
    END as reason,
    mm.is_discovery,
    mm.genre_match,
    mm.style_match,
    mm.similar_movie_id
  FROM movie_matches mm
  ORDER BY 
    mm.is_discovery,
    score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;