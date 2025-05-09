/*
  # Add TMDB Genre Mapping

  1. New Tables
    - `tmdb_genres`
      - `id` (integer, primary key) - TMDB genre ID
      - `name` (text) - Genre name
      - `created_at` (timestamptz)

  2. Changes
    - Add genre_ids column to anonymous_actions
    - Add genre mapping functions
    - Update existing actions to include genre IDs
*/

-- Create TMDB genres table
CREATE TABLE tmdb_genres (
  id integer PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add genre_ids to anonymous_actions
ALTER TABLE anonymous_actions
ADD COLUMN genre_ids integer[] DEFAULT '{}';

-- Insert TMDB genre mappings
INSERT INTO tmdb_genres (id, name) VALUES
  (28, 'Action'),
  (12, 'Adventure'),
  (35, 'Comedy'),
  (18, 'Drama'),
  (14, 'Fantasy'),
  (27, 'Horror'),
  (9648, 'Mystery'),
  (10749, 'Romance'),
  (878, 'Sci-Fi'),
  (53, 'Thriller');

-- Create function to get similar movies by genre
CREATE OR REPLACE FUNCTION get_similar_movies(
  p_preference_id uuid,
  p_movie_ids integer[],
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  movie_id integer,
  match_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH user_genres AS (
    -- Get genres from user's liked movies
    SELECT DISTINCT unnest(genre_ids) as genre_id
    FROM anonymous_actions
    WHERE preference_id = p_preference_id
    AND action = 'like'
  ),
  movie_matches AS (
    -- Find movies with matching genres
    SELECT 
      aa.movie_id,
      COUNT(DISTINCT ug.genre_id) as matching_genres,
      COUNT(DISTINCT unnest(aa.genre_ids)) as total_genres
    FROM anonymous_actions aa
    CROSS JOIN user_genres ug
    WHERE aa.movie_id = ANY(p_movie_ids)
    AND ug.genre_id = ANY(aa.genre_ids)
    GROUP BY aa.movie_id
  )
  SELECT 
    movie_id,
    (matching_genres::float / NULLIF(total_genres, 0))::float as match_score
  FROM movie_matches
  WHERE matching_genres > 0
  ORDER BY match_score DESC, movie_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;