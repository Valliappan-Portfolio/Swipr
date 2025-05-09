/*
  # Enhance Genre Mapping and Movie Recommendations

  1. Changes
    - Update TMDB genre mappings to be more accurate
    - Add genre weights for better recommendations
    - Add genre compatibility scores
    - Create improved recommendation function
*/

-- First, update our genre mappings to be more accurate
TRUNCATE TABLE tmdb_genres;
INSERT INTO tmdb_genres (id, name) VALUES
  -- Primary genres
  (35, 'Comedy'),       -- Comedy
  (18, 'Drama'),        -- Drama
  (10749, 'Romance'),   -- Romance
  (28, 'Action'),       -- Action
  (12, 'Adventure'),    -- Adventure
  (14, 'Fantasy'),      -- Fantasy
  (27, 'Horror'),       -- Horror
  (9648, 'Mystery'),    -- Mystery
  (878, 'Sci-Fi'),      -- Science Fiction
  (53, 'Thriller'),     -- Thriller
  -- Additional genres for better categorization
  (16, 'Animation'),
  (80, 'Crime'),
  (99, 'Documentary'),
  (10751, 'Family'),
  (36, 'History'),
  (10402, 'Music'),
  (10752, 'War'),
  (37, 'Western');

-- Add weight column for genre importance
ALTER TABLE tmdb_genres
ADD COLUMN IF NOT EXISTS weight float DEFAULT 1.0;

-- Update weights for better matching
UPDATE tmdb_genres SET weight = 1.5 WHERE name IN ('Comedy', 'Drama', 'Romance');
UPDATE tmdb_genres SET weight = 1.2 WHERE name IN ('Action', 'Adventure', 'Mystery');
UPDATE tmdb_genres SET weight = 1.0 WHERE name IN ('Fantasy', 'Sci-Fi', 'Thriller');

-- Create genre compatibility table
CREATE TABLE IF NOT EXISTS genre_compatibility (
  genre1_id integer REFERENCES tmdb_genres(id),
  genre2_id integer REFERENCES tmdb_genres(id),
  compatibility_score float DEFAULT 0.5,
  PRIMARY KEY (genre1_id, genre2_id)
);

-- Insert genre compatibility scores
INSERT INTO genre_compatibility (genre1_id, genre2_id, compatibility_score)
VALUES
  -- Comedy pairs well with Romance and Drama
  (35, 10749, 0.8),    -- Comedy - Romance
  (35, 18, 0.7),       -- Comedy - Drama
  (35, 10751, 0.9),    -- Comedy - Family
  -- Romance pairs well with Drama and Comedy
  (10749, 18, 0.9),    -- Romance - Drama
  (10749, 35, 0.8),    -- Romance - Comedy
  -- Drama pairs well with most genres
  (18, 53, 0.6),       -- Drama - Thriller
  (18, 9648, 0.7),     -- Drama - Mystery
  -- Action pairs less with Comedy/Romance
  (28, 35, 0.3),       -- Action - Comedy
  (28, 10749, 0.2),    -- Action - Romance
  (28, 12, 0.8),       -- Action - Adventure
  -- Adventure pairs well with Fantasy and Action
  (12, 14, 0.8),       -- Adventure - Fantasy
  (12, 28, 0.8)        -- Adventure - Action
ON CONFLICT DO NOTHING;

-- Create improved recommendation function
CREATE OR REPLACE FUNCTION get_similar_movies_v2(
  p_preference_id uuid,
  p_movie_ids integer[],
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  movie_id integer,
  match_score float,
  genre_match text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    -- Get user's genre preferences from liked movies
    SELECT 
      g.id as genre_id,
      g.name as genre_name,
      g.weight as genre_weight,
      COUNT(*) as preference_strength
    FROM anonymous_actions aa
    CROSS JOIN LATERAL unnest(aa.genre_ids) as genre
    JOIN tmdb_genres g ON g.id = genre
    WHERE aa.preference_id = p_preference_id
    AND aa.action = 'like'
    GROUP BY g.id, g.name, g.weight
  ),
  movie_scores AS (
    -- Calculate weighted scores for each movie
    SELECT 
      aa.movie_id,
      SUM(
        CASE 
          WHEN up.genre_id IS NOT NULL THEN
            up.genre_weight * up.preference_strength * COALESCE(
              (SELECT compatibility_score 
               FROM genre_compatibility 
               WHERE (genre1_id = up.genre_id AND genre2_id = genre)
               OR (genre1_id = genre AND genre2_id = up.genre_id)
              ),
              0.5
            )
          ELSE 0
        END
      ) as weighted_score,
      array_agg(DISTINCT g.name) as matching_genres
    FROM anonymous_actions aa
    CROSS JOIN LATERAL unnest(aa.genre_ids) as genre
    LEFT JOIN user_preferences up ON up.genre_id = genre
    JOIN tmdb_genres g ON g.id = genre
    WHERE aa.movie_id = ANY(p_movie_ids)
    GROUP BY aa.movie_id
  )
  SELECT 
    movie_id,
    COALESCE(weighted_score, 0) as match_score,
    matching_genres
  FROM movie_scores
  WHERE weighted_score > 0
  ORDER BY weighted_score DESC, movie_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;