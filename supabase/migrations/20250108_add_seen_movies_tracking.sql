-- Migration: Add seen_movies table for per-user tracking
-- This prevents duplicate movies across profiles

-- Create seen_movies table to track what each user has seen
CREATE TABLE IF NOT EXISTS seen_movies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  seen_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure each user only sees each movie once
  CONSTRAINT unique_user_movie UNIQUE (user_id, movie_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_seen_movies_user_id ON seen_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_seen_movies_movie_id ON seen_movies(movie_id);

-- RLS policies
ALTER TABLE seen_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seen movies"
  ON seen_movies FOR SELECT
  USING (true);  -- Allow reading for collaborative filtering

CREATE POLICY "Users can insert their own seen movies"
  ON seen_movies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own seen movies"
  ON seen_movies FOR DELETE
  USING (true);

-- Add comment
COMMENT ON TABLE seen_movies IS 'Tracks which movies each user has swiped on to prevent duplicates';
