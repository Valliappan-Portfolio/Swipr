/*
  # Fix ambiguous movie_id reference in get_recommendations function

  1. Changes
    - Update get_recommendations function to explicitly reference table for movie_id
    - Ensure proper table references for all column names
    - Maintain existing functionality while fixing ambiguity

  2. Technical Details
    - Replaces existing get_recommendations function
    - Uses explicit table references for all ambiguous columns
    - Preserves existing input parameters and return type
*/

CREATE OR REPLACE FUNCTION get_recommendations(
  p_preference_id uuid,
  p_limit integer DEFAULT 10,
  p_discovery_ratio double precision DEFAULT 0.2
) RETURNS TABLE (
  movie_id integer,
  score double precision,
  reason text,
  is_discovery boolean
) AS $$
BEGIN
  -- Calculate how many regular and discovery recommendations to return
  DECLARE
    discovery_count integer := floor(p_limit * p_discovery_ratio);
    regular_count integer := p_limit - discovery_count;
  BEGIN
    -- Return combination of regular and discovery recommendations
    RETURN QUERY (
      -- Regular recommendations based on user preferences
      SELECT 
        aa.movie_id,
        ms.similarity_score as score,
        'Based on movies you liked' as reason,
        false as is_discovery
      FROM anonymous_actions aa
      JOIN movie_similarities ms ON 
        (aa.movie_id = ms.movie1_id OR aa.movie_id = ms.movie2_id)
      WHERE aa.preference_id = p_preference_id
        AND aa.action = 'like'
      ORDER BY ms.similarity_score DESC
      LIMIT regular_count
    )
    UNION ALL
    (
      -- Discovery recommendations
      SELECT 
        aa.movie_id,
        0.5 as score,
        'Discover something new' as reason,
        true as is_discovery
      FROM anonymous_actions aa
      WHERE aa.preference_id = p_preference_id
        AND aa.action = 'unwatched'
      ORDER BY random()
      LIMIT discovery_count
    );
  END;
END;
$$ LANGUAGE plpgsql;