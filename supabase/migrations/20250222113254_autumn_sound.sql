/*
  # Update friend request policies and add missing columns

  1. Add missing columns to anonymous_preferences
  2. Update existing policies with optimized conditions
  3. Add match score calculation function
  4. Add friend count update function
*/

-- Add missing columns to anonymous_preferences if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'anonymous_preferences' 
    AND column_name = 'friend_count'
  ) THEN
    ALTER TABLE anonymous_preferences
    ADD COLUMN friend_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'anonymous_preferences' 
    AND column_name = 'is_discoverable'
  ) THEN
    ALTER TABLE anonymous_preferences
    ADD COLUMN is_discoverable boolean DEFAULT true;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update their friend request status" ON friend_requests;
DROP POLICY IF EXISTS "Users can view their own matches" ON friend_matches;

-- Create new optimized policies
CREATE POLICY "friend_requests_select"
  ON friend_requests
  FOR SELECT
  USING (
    sender_id IN (SELECT id FROM anonymous_preferences) OR
    receiver_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "friend_requests_insert"
  ON friend_requests
  FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "friend_requests_update"
  ON friend_requests
  FOR UPDATE
  USING (
    receiver_id IN (SELECT id FROM anonymous_preferences)
  );

CREATE POLICY "friend_matches_select"
  ON friend_matches
  FOR SELECT
  USING (
    user1_id IN (SELECT id FROM anonymous_preferences) OR
    user2_id IN (SELECT id FROM anonymous_preferences)
  );

-- Create or replace match score calculation function
CREATE OR REPLACE FUNCTION calculate_match_score(user1_id uuid, user2_id uuid)
RETURNS float
LANGUAGE plpgsql
AS $func$
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
$func$;

-- Create or replace friend count update function
CREATE OR REPLACE FUNCTION update_friend_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
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
$func$;