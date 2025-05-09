/*
  # Add Recommendation System

  1. New Tables
    - movie_similarities: Store pre-computed movie similarities
    - user_preferences: Store aggregated user preferences
    - recommendation_logs: Track recommendations and their effectiveness

  2. New Functions
    - get_user_recommendations: Generate personalized recommendations
    - update_movie_similarities: Update similarity scores between movies
*/

-- Create movie similarities table
CREATE TABLE IF NOT EXISTS movie_similarities (
  movie1_id integer,
  movie2_id integer,
  similarity_score float NOT NULL,
  common_likers integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (movie1_id, movie2_id)
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  preference_id uuid REFERENCES anonymous_preferences(id),
  genre_weights jsonb DEFAULT '{}',
  language_weights jsonb DEFAULT '{}',
  favorite_years int4range[],
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (preference_id)
);

-- Create recommendation logs table
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid REFERENCES anonymous_preferences(id),
  movie_id integer NOT NULL,
  recommendation_score float NOT NULL,
  is_discovery boolean DEFAULT false,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE movie_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read of movie similarities"
  ON movie_similarities FOR SELECT
  USING (true);

CREATE POLICY "Allow public read of user preferences"
  ON user_preferences FOR SELECT
  USING (true);

CREATE POLICY "Allow users to see their own recommendations"
  ON recommendation_logs FOR SELECT
  USING (preference_id IN (SELECT id FROM anonymous_preferences));

-- Create function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_recommendations(
  p_preference_id uuid,
  p_limit integer DEFAULT 6,
  p_discovery_ratio float DEFAULT 0.2
)
RETURNS TABLE (
  movie_id integer,
  score float,
  reason text,
  is_discovery boolean
) AS $$
DECLARE
  v_discovery_count integer;
  v_main_count integer;
BEGIN
  -- Calculate how many discovery vs main recommendations
  v_discovery_count := GREATEST(1, FLOOR(p_limit * p_discovery_ratio)::integer);
  v_main_count := p_limit - v_discovery_count;
  
  RETURN QUERY
  WITH user_likes AS (
    -- Get user's liked movies
    SELECT movie_id, action
    FROM anonymous_actions
    WHERE preference_id = p_preference_id
    AND action IN ('like', 'unwatched')
  ),
  similar_movies AS (
    -- Find similar movies based on user's likes
    SELECT 
      ms.movie2_id as movie_id,
      SUM(
        CASE 
          WHEN ul.action = 'like' THEN ms.similarity_score
          WHEN ul.action = 'unwatched' THEN ms.similarity_score * 0.5
        END
      ) as similarity_score
    FROM user_likes ul
    JOIN movie_similarities ms ON ul.movie_id = ms.movie1_id
    GROUP BY ms.movie2_id
  ),
  user_genre_prefs AS (
    -- Get user's genre preferences
    SELECT 
      genre,
      COUNT(*) as weight
    FROM anonymous_actions aa
    CROSS JOIN UNNEST(genres) as genre
    WHERE aa.preference_id = p_preference_id
    AND aa.action = 'like'
    GROUP BY genre
  ),
  discovery_recs AS (
    -- Find discovery recommendations
    SELECT 
      sm.movie_id,
      sm.similarity_score * 0.7 + -- Base on similarity
      COALESCE( -- Boost by genre match
        (
          SELECT AVG(ugp.weight)::float / 
          (SELECT MAX(weight) FROM user_genre_prefs)
          FROM anonymous_actions aa
          CROSS JOIN UNNEST(aa.genres) as genre
          JOIN user_genre_prefs ugp ON ugp.genre = genre
          WHERE aa.movie_id = sm.movie_id
        ) * 0.3,
        0
      ) as score,
      'This is different from your usual taste but matches some hidden patterns'::text as reason,
      true as is_discovery
    FROM similar_movies sm
    WHERE sm.movie_id NOT IN (
      SELECT movie_id FROM anonymous_actions
      WHERE preference_id = p_preference_id
    )
    ORDER BY score DESC
    LIMIT v_discovery_count
  ),
  main_recs AS (
    -- Find main recommendations
    SELECT 
      sm.movie_id,
      sm.similarity_score as score,
      'Based on movies you liked'::text as reason,
      false as is_discovery
    FROM similar_movies sm
    WHERE sm.movie_id NOT IN (
      SELECT movie_id FROM anonymous_actions
      WHERE preference_id = p_preference_id
    )
    ORDER BY score DESC
    LIMIT v_main_count
  )
  SELECT * FROM main_recs
  UNION ALL
  SELECT * FROM discovery_recs
  ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to update movie similarities
CREATE OR REPLACE FUNCTION update_movie_similarities()
RETURNS void AS $$
BEGIN
  -- Clear existing similarities
  TRUNCATE TABLE movie_similarities;
  
  -- Insert new similarities
  INSERT INTO movie_similarities (movie1_id, movie2_id, similarity_score, common_likers)
  WITH movie_pairs AS (
    -- Get all pairs of movies that have been acted upon
    SELECT 
      LEAST(a1.movie_id, a2.movie_id) as movie1_id,
      GREATEST(a1.movie_id, a2.movie_id) as movie2_id,
      COUNT(*) FILTER (
        WHERE a1.action = 'like' AND a2.action = 'like'
      ) as common_likes,
      COUNT(*) as total_interactions
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id != a2.movie_id
      AND a1.preference_id = a2.preference_id
    GROUP BY 
      LEAST(a1.movie_id, a2.movie_id),
      GREATEST(a1.movie_id, a2.movie_id)
    HAVING COUNT(*) >= 3 -- Minimum interactions threshold
  )
  SELECT 
    movie1_id,
    movie2_id,
    (common_likes::float / NULLIF(total_interactions, 0))::float as similarity_score,
    common_likes
  FROM movie_pairs
  WHERE common_likes > 0;
END;
$$ LANGUAGE plpgsql;