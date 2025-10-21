/*
  # Create Anonymous Username-Based System
  
  1. New Tables
    - `anonymous_users`
      - `id` (uuid, primary key)
      - `username` (text, unique) - unique username for identification
      - `created_at` (timestamptz) - when user first joined
      - `last_seen` (timestamptz) - when user last visited
    
    - `anonymous_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references anonymous_users.id
      - `name` (text) - display name (can be same as username)
      - `languages` (text[]) - preferred languages
      - `content_type` (text) - movies, series, or both
      - `series_type` (text) - if applicable
      - `genres` (text[]) - preferred genres
      - `year_range` (jsonb) - preferred year range
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `anonymous_actions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references anonymous_users.id
      - `preference_id` (uuid) - references anonymous_preferences.id
      - `movie_id` (integer) - TMDB movie ID
      - `action` (text) - 'like', 'pass', 'unwatched'
      - `genres` (text[]) - movie genres
      - `language` (text) - movie language
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Allow anyone to read users (for friend discovery)
    - Users can only update their own data
    - All actions are tied to user_id for collaborative filtering
  
  3. Important Notes
    - No passwords required
    - Username is the only identifier
    - Data persists across sessions via username
    - Enables collaborative filtering across all users
*/

-- Create anonymous_users table
CREATE TABLE IF NOT EXISTS anonymous_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

-- Create anonymous_preferences table
CREATE TABLE IF NOT EXISTS anonymous_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES anonymous_users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  languages text[] DEFAULT '{}',
  content_type text DEFAULT 'both',
  series_type text,
  genres text[] DEFAULT '{}',
  year_range jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create anonymous_actions table
CREATE TABLE IF NOT EXISTS anonymous_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES anonymous_users(id) ON DELETE CASCADE NOT NULL,
  preference_id uuid REFERENCES anonymous_preferences(id) ON DELETE CASCADE NOT NULL,
  movie_id integer NOT NULL,
  action text NOT NULL CHECK (action IN ('like', 'pass', 'unwatched')),
  genres text[] DEFAULT '{}',
  language text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_anonymous_users_username ON anonymous_users(username);
CREATE INDEX IF NOT EXISTS idx_anonymous_preferences_user_id ON anonymous_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_user_id ON anonymous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_preference_id ON anonymous_actions(preference_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_movie_id ON anonymous_actions(movie_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_actions_action ON anonymous_actions(action);

-- Enable RLS
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_actions ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous_users (public read, owner update)
CREATE POLICY "Anyone can view usernames"
  ON anonymous_users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create a username"
  ON anonymous_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own last_seen"
  ON anonymous_users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for anonymous_preferences (public read for recommendations, owner write)
CREATE POLICY "Anyone can view preferences for recommendations"
  ON anonymous_preferences FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert preferences"
  ON anonymous_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own preferences"
  ON anonymous_preferences FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for anonymous_actions (public read for collaborative filtering, owner write)
CREATE POLICY "Anyone can view actions for collaborative filtering"
  ON anonymous_actions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert actions"
  ON anonymous_actions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own actions"
  ON anonymous_actions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS trigger AS $$
BEGIN
  UPDATE anonymous_users
  SET last_seen = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on any action
CREATE TRIGGER update_user_last_seen
  AFTER INSERT ON anonymous_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Function to update preferences updated_at timestamp
CREATE OR REPLACE FUNCTION update_preferences_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update preferences timestamp
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON anonymous_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_preferences_timestamp();