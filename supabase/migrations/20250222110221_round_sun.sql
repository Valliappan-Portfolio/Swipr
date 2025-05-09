/*
  # Friends Feature Schema

  1. New Tables
    - `friend_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references anonymous_preferences)
      - `receiver_id` (uuid, references anonymous_preferences)
      - `status` (text: 'pending', 'accepted', 'rejected')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `friend_matches`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references anonymous_preferences)
      - `user2_id` (uuid, references anonymous_preferences)
      - `match_score` (float)
      - `common_likes` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for friend requests and matches
    - Add function to calculate match scores

  3. Changes
    - Add friend-related columns to anonymous_preferences
*/

-- Create friend requests table
CREATE TABLE friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES anonymous_preferences(id) NOT NULL,
  receiver_id uuid REFERENCES anonymous_preferences(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friend matches table
CREATE TABLE friend_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES anonymous_preferences(id) NOT NULL,
  user2_id uuid REFERENCES anonymous_preferences(id) NOT NULL,
  match_score float NOT NULL,
  common_likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Add friend-related columns to anonymous_preferences
ALTER TABLE anonymous_preferences
ADD COLUMN friend_count integer DEFAULT 0,
ADD COLUMN is_discoverable boolean DEFAULT true;

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for friend requests
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests
  FOR SELECT
  USING (
    sender_id IN (SELECT id FROM anonymous_preferences) OR
    receiver_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "Users can update their friend request status"
  ON friend_requests
  FOR UPDATE
  USING (
    receiver_id IN (SELECT id FROM anonymous_preferences)
  );

-- Create policies for friend matches
CREATE POLICY "Users can view their own matches"
  ON friend_matches
  FOR SELECT
  USING (
    user1_id IN (SELECT id FROM anonymous_preferences) OR
    user2_id IN (SELECT id FROM anonymous_preferences)
  );

-- Create function to calculate match score between two users
CREATE OR REPLACE FUNCTION calculate_match_score(user1_id uuid, user2_id uuid)
RETURNS float AS $$
DECLARE
  total_actions integer;
  matching_actions integer;
  genre_similarity float;
  language_similarity float;
BEGIN
  -- Calculate matching movie actions
  SELECT COUNT(*) INTO matching_actions
  FROM anonymous_actions a1
  JOIN anonymous_actions a2 ON a1.movie_id = a2.movie_id
  WHERE a1.preference_id = user1_id
    AND a2.preference_id = user2_id
    AND a1.action = a2.action;

  -- Get total actions
  SELECT COUNT(*) INTO total_actions
  FROM anonymous_actions
  WHERE preference_id IN (user1_id, user2_id);

  -- Calculate genre similarity
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT g1)::float / NULLIF(COUNT(DISTINCT g), 0)
      FROM (
        SELECT UNNEST(genres) as g
        FROM anonymous_preferences
        WHERE id IN (user1_id, user2_id)
      ) all_genres
      LEFT JOIN (
        SELECT UNNEST(genres) as g1
        FROM anonymous_preferences
        WHERE id = user1_id
        INTERSECT
        SELECT UNNEST(genres) as g2
        FROM anonymous_preferences
        WHERE id = user2_id
      ) matching_genres ON true
    ), 0
  ) INTO genre_similarity;

  -- Calculate language similarity
  SELECT COALESCE(
    (
      SELECT COUNT(DISTINCT l1)::float / NULLIF(COUNT(DISTINCT l), 0)
      FROM (
        SELECT UNNEST(languages) as l
        FROM anonymous_preferences
        WHERE id IN (user1_id, user2_id)
      ) all_langs
      LEFT JOIN (
        SELECT UNNEST(languages) as l1
        FROM anonymous_preferences
        WHERE id = user1_id
        INTERSECT
        SELECT UNNEST(languages) as l2
        FROM anonymous_preferences
        WHERE id = user2_id
      ) matching_langs ON true
    ), 0
  ) INTO language_similarity;

  -- Return weighted average of all factors
  RETURN (
    COALESCE(matching_actions::float / NULLIF(total_actions, 0) * 100, 0) * 0.5 +
    genre_similarity * 30 +
    language_similarity * 20
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update match scores
CREATE OR REPLACE FUNCTION update_friend_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert match score
  INSERT INTO friend_matches (user1_id, user2_id, match_score)
  VALUES (
    LEAST(NEW.preference_id, NEW.friend_id),
    GREATEST(NEW.preference_id, NEW.friend_id),
    calculate_match_score(NEW.preference_id, NEW.friend_id)
  )
  ON CONFLICT (user1_id, user2_id)
  DO UPDATE SET
    match_score = calculate_match_score(NEW.preference_id, NEW.friend_id),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update friend count
CREATE OR REPLACE FUNCTION update_friend_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update friend count for both users
  UPDATE anonymous_preferences
  SET friend_count = (
    SELECT COUNT(*)
    FROM friend_requests
    WHERE (sender_id = anonymous_preferences.id OR receiver_id = anonymous_preferences.id)
    AND status = 'accepted'
  )
  WHERE id IN (NEW.sender_id, NEW.receiver_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_friend_request_update
  AFTER INSERT OR UPDATE OF status
  ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_count();