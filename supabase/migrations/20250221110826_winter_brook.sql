/*
  # Fix Genre Mapping and Add Missing Columns

  1. Changes
    - Add genres array column to anonymous_actions
    - Add indexes for better performance
    - Update genre compatibility scores
    - Add function to map TMDB genres

  2. Security
    - Maintain existing RLS policies
*/

-- Add genres array column to anonymous_actions
ALTER TABLE anonymous_actions
ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_movie_id ON anonymous_actions(movie_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_preference_id ON anonymous_actions(preference_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_genres ON anonymous_actions USING gin(genres);

-- Create function to map TMDB genres
CREATE OR REPLACE FUNCTION map_tmdb_genres(genre_ids integer[])
RETURNS text[] AS $$
DECLARE
  mapped_genres text[];
BEGIN
  SELECT array_agg(name)
  INTO mapped_genres
  FROM tmdb_genres
  WHERE id = ANY(genre_ids);
  
  RETURN COALESCE(mapped_genres, '{}'::text[]);
END;
$$ LANGUAGE plpgsql;

-- Update genre compatibility scores for better accuracy
INSERT INTO genre_compatibility (genre1_id, genre2_id, compatibility_score)
VALUES
  -- Romance related
  (10749, 35, 0.9),    -- Romance - Comedy (increased)
  (10749, 18, 0.9),    -- Romance - Drama
  (10749, 10751, 0.7), -- Romance - Family
  -- Drama related
  (18, 35, 0.8),       -- Drama - Comedy
  (18, 10751, 0.7),    -- Drama - Family
  (18, 9648, 0.8),     -- Drama - Mystery (increased)
  -- Action related
  (28, 12, 0.9),       -- Action - Adventure
  (28, 878, 0.8),      -- Action - Sci-Fi
  (28, 53, 0.8),       -- Action - Thriller
  -- Comedy related
  (35, 10751, 0.9),    -- Comedy - Family
  (35, 12, 0.7),       -- Comedy - Adventure
  -- Fantasy related
  (14, 12, 0.9),       -- Fantasy - Adventure
  (14, 878, 0.7),      -- Fantasy - Sci-Fi
  -- Mystery related
  (9648, 53, 0.9),     -- Mystery - Thriller
  (9648, 80, 0.8)      -- Mystery - Crime
ON CONFLICT (genre1_id, genre2_id) 
DO UPDATE SET compatibility_score = EXCLUDED.compatibility_score;