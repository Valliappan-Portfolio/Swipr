/*
  # Add Anonymous User Support
  
  1. New Tables
    - anonymous_preferences: Store preferences for non-authenticated users
    - anonymous_actions: Store movie actions for non-authenticated users
  
  2. Security
    - Enable RLS
    - Allow public access for anonymous users
*/

-- Create table for anonymous preferences
CREATE TABLE anonymous_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  industries text[] DEFAULT '{}',
  content_type text,
  series_type text,
  genres text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Create table for anonymous movie actions
CREATE TABLE anonymous_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid REFERENCES anonymous_preferences(id),
  movie_id integer NOT NULL,
  action text NOT NULL CHECK (action IN ('like', 'pass', 'unwatched')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE anonymous_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
CREATE POLICY "Allow public read of anonymous preferences"
  ON anonymous_preferences FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous preference creation"
  ON anonymous_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read of anonymous actions"
  ON anonymous_actions FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous action creation"
  ON anonymous_actions FOR INSERT
  WITH CHECK (true);