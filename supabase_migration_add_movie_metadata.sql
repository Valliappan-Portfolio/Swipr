-- Migration: Add movie metadata columns to anonymous_actions table
-- Run this in your Supabase SQL editor

ALTER TABLE anonymous_actions
ADD COLUMN IF NOT EXISTS movie_title TEXT,
ADD COLUMN IF NOT EXISTS release_year INTEGER,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS director TEXT;

-- Create index on movie_title for faster queries
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_movie_title ON anonymous_actions(movie_title);

-- Create index on release_year for year-based queries
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_release_year ON anonymous_actions(release_year);

-- Create index on rating for rating-based queries
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_rating ON anonymous_actions(rating);

COMMENT ON COLUMN anonymous_actions.movie_title IS 'Title of the movie/series';
COMMENT ON COLUMN anonymous_actions.release_year IS 'Year the movie/series was released';
COMMENT ON COLUMN anonymous_actions.rating IS 'TMDB vote average (0-10 scale)';
COMMENT ON COLUMN anonymous_actions.director IS 'Director of the movie/series (optional)';
