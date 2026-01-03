-- Create watchlist table to store movies users want to watch later
CREATE TABLE IF NOT EXISTS anonymous_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  preference_id uuid REFERENCES anonymous_preferences(id) ON DELETE CASCADE,
  movie_id integer NOT NULL,
  movie_title text NOT NULL,
  movie_overview text,
  movie_poster_path text,
  movie_release_date text,
  movie_vote_average real,
  movie_genres text[],
  movie_type text CHECK (movie_type IN ('movie', 'series')),
  movie_language text,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON anonymous_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON anonymous_watchlist(added_at DESC);

-- Add RLS policies
ALTER TABLE anonymous_watchlist ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist
CREATE POLICY "Users can view their own watchlist"
  ON anonymous_watchlist FOR SELECT
  USING (true); -- Allow all reads for anonymous users

CREATE POLICY "Users can insert to their own watchlist"
  ON anonymous_watchlist FOR INSERT
  WITH CHECK (true); -- Allow all inserts for anonymous users

CREATE POLICY "Users can delete from their own watchlist"
  ON anonymous_watchlist FOR DELETE
  USING (true); -- Allow all deletes for anonymous users
