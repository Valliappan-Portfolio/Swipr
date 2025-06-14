/*
  # Enhanced Recommendation System

  1. New Tables
    - user_movie_interactions: Track detailed user interactions with movies
    - movie_features: Store movie features for ML recommendations
    - recommendation_cache: Cache personalized recommendations
    - user_similarity_scores: Store user similarity calculations

  2. Functions
    - calculate_user_similarity: Calculate similarity between users
    - get_collaborative_recommendations: Get collaborative filtering recommendations
    - update_recommendation_cache: Update cached recommendations
*/

-- Create user movie interactions table
CREATE TABLE IF NOT EXISTS user_movie_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  preference_id uuid REFERENCES anonymous_preferences(id),
  movie_id integer NOT NULL,
  action text NOT NULL CHECK (action IN ('like', 'pass', 'unwatched', 'watched')),
  rating integer CHECK (rating >= 1 AND rating <= 10),
  watch_duration integer, -- in minutes
  genres text[] DEFAULT '{}',
  language text,
  movie_year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create movie features table
CREATE TABLE IF NOT EXISTS movie_features (
  movie_id integer PRIMARY KEY,
  title text NOT NULL,
  genres text[] DEFAULT '{}',
  language text,
  release_year integer,
  rating float,
  popularity_score float,
  vote_count integer,
  runtime integer,
  director text,
  main_actors text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recommendation cache table
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  preference_id uuid REFERENCES anonymous_preferences(id),
  movie_id integer NOT NULL,
  recommendation_score float NOT NULL,
  recommendation_type text NOT NULL, -- 'collaborative', 'content_based', 'hybrid'
  reasons text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create user similarity scores table
CREATE TABLE IF NOT EXISTS user_similarity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid,
  user2_id uuid,
  similarity_score float NOT NULL,
  common_movies integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE user_movie_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_similarity_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own interactions"
  ON user_movie_interactions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    preference_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "Users can insert their own interactions"
  ON user_movie_interactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    preference_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "Allow public read of movie features"
  ON movie_features
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own recommendations"
  ON recommendation_cache
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    preference_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "Allow public read of similarity scores"
  ON user_similarity_scores
  FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_movie_interactions_user_id ON user_movie_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_movie_interactions_preference_id ON user_movie_interactions(preference_id);
CREATE INDEX IF NOT EXISTS idx_user_movie_interactions_movie_id ON user_movie_interactions(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_movie_interactions_action ON user_movie_interactions(action);
CREATE INDEX IF NOT EXISTS idx_movie_features_genres ON movie_features USING gin(genres);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_preference_id ON recommendation_cache(preference_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at);

-- Function to calculate user similarity
CREATE OR REPLACE FUNCTION calculate_user_similarity_v2(user1_ref text, user2_ref text)
RETURNS float AS $$
DECLARE
  common_likes integer := 0;
  total_interactions integer := 0;
  genre_similarity float := 0;
  language_similarity float := 0;
  final_similarity float := 0;
BEGIN
  -- Count common movie interactions
  SELECT COUNT(*)
  INTO total_interactions
  FROM user_movie_interactions u1
  JOIN user_movie_interactions u2 ON u1.movie_id = u2.movie_id
  WHERE (u1.user_id::text = user1_ref OR u1.preference_id::text = user1_ref)
    AND (u2.user_id::text = user2_ref OR u2.preference_id::text = user2_ref);

  -- Count common likes
  SELECT COUNT(*)
  INTO common_likes
  FROM user_movie_interactions u1
  JOIN user_movie_interactions u2 ON u1.movie_id = u2.movie_id
  WHERE (u1.user_id::text = user1_ref OR u1.preference_id::text = user1_ref)
    AND (u2.user_id::text = user2_ref OR u2.preference_id::text = user2_ref)
    AND u1.action = 'like'
    AND u2.action = 'like';

  -- Calculate basic similarity
  IF total_interactions > 0 THEN
    final_similarity := common_likes::float / total_interactions::float;
  END IF;

  -- Add genre preference similarity
  WITH user1_genres AS (
    SELECT genre, COUNT(*) as count
    FROM user_movie_interactions u
    CROSS JOIN unnest(u.genres) as genre
    WHERE (u.user_id::text = user1_ref OR u.preference_id::text = user1_ref)
      AND u.action = 'like'
    GROUP BY genre
  ),
  user2_genres AS (
    SELECT genre, COUNT(*) as count
    FROM user_movie_interactions u
    CROSS JOIN unnest(u.genres) as genre
    WHERE (u.user_id::text = user2_ref OR u.preference_id::text = user2_ref)
      AND u.action = 'like'
    GROUP BY genre
  )
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT u1.genre)::float / 
             NULLIF(COUNT(DISTINCT COALESCE(u1.genre, u2.genre)), 0)
      FROM user1_genres u1
      FULL OUTER JOIN user2_genres u2 ON u1.genre = u2.genre
      WHERE u1.genre IS NOT NULL AND u2.genre IS NOT NULL
    ),
    0
  ) INTO genre_similarity;

  -- Combine similarities with weights
  final_similarity := (final_similarity * 0.7) + (genre_similarity * 0.3);

  RETURN LEAST(final_similarity, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get collaborative recommendations
CREATE OR REPLACE FUNCTION get_collaborative_recommendations_v2(
  target_user_ref text,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  movie_id integer,
  score float,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  WITH similar_users AS (
    -- Find users similar to target user
    SELECT 
      CASE 
        WHEN u.user_id::text = target_user_ref THEN u2.user_id::text
        WHEN u.preference_id::text = target_user_ref THEN u2.preference_id::text
        ELSE COALESCE(u2.user_id::text, u2.preference_id::text)
      END as similar_user_ref,
      calculate_user_similarity_v2(target_user_ref, 
        COALESCE(u2.user_id::text, u2.preference_id::text)
      ) as similarity
    FROM user_movie_interactions u
    JOIN user_movie_interactions u2 ON u.movie_id = u2.movie_id
    WHERE (u.user_id::text = target_user_ref OR u.preference_id::text = target_user_ref)
      AND u.action = 'like'
      AND u2.action = 'like'
      AND COALESCE(u2.user_id::text, u2.preference_id::text) != target_user_ref
    GROUP BY similar_user_ref
    HAVING calculate_user_similarity_v2(target_user_ref, similar_user_ref) > 0.3
    ORDER BY similarity DESC
    LIMIT 10
  ),
  recommended_movies AS (
    -- Get movies liked by similar users
    SELECT 
      u.movie_id,
      AVG(su.similarity) as avg_similarity,
      COUNT(*) as recommender_count
    FROM similar_users su
    JOIN user_movie_interactions u ON 
      (u.user_id::text = su.similar_user_ref OR u.preference_id::text = su.similar_user_ref)
    WHERE u.action = 'like'
      AND u.movie_id NOT IN (
        -- Exclude movies already seen by target user
        SELECT movie_id 
        FROM user_movie_interactions 
        WHERE (user_id::text = target_user_ref OR preference_id::text = target_user_ref)
      )
    GROUP BY u.movie_id
  )
  SELECT 
    rm.movie_id,
    (rm.avg_similarity * rm.recommender_count)::float as score,
    ('Recommended by ' || rm.recommender_count || ' similar users')::text as reason
  FROM recommended_movies rm
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update recommendation cache
CREATE OR REPLACE FUNCTION update_recommendation_cache_v2(
  target_user_id uuid DEFAULT NULL,
  target_preference_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  user_ref text;
BEGIN
  -- Determine user reference
  IF target_user_id IS NOT NULL THEN
    user_ref := target_user_id::text;
  ELSIF target_preference_id IS NOT NULL THEN
    user_ref := target_preference_id::text;
  ELSE
    RETURN;
  END IF;

  -- Clear expired cache entries
  DELETE FROM recommendation_cache 
  WHERE expires_at < now();

  -- Clear existing cache for this user
  DELETE FROM recommendation_cache 
  WHERE (user_id = target_user_id OR preference_id = target_preference_id);

  -- Insert new collaborative recommendations
  INSERT INTO recommendation_cache (
    user_id, 
    preference_id, 
    movie_id, 
    recommendation_score, 
    recommendation_type, 
    reasons
  )
  SELECT 
    target_user_id,
    target_preference_id,
    cr.movie_id,
    cr.score,
    'collaborative',
    ARRAY[cr.reason]
  FROM get_collaborative_recommendations_v2(user_ref, 20) cr;

END;
$$ LANGUAGE plpgsql;

-- Trigger to update cache when new interactions are added
CREATE OR REPLACE FUNCTION trigger_update_recommendation_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cache for the user who performed the action
  PERFORM update_recommendation_cache_v2(NEW.user_id, NEW.preference_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cache_on_interaction
  AFTER INSERT ON user_movie_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_recommendation_cache();