/*
  # Debug match score calculation
  
  This migration adds a function to analyze match scores between users
*/

-- Create function to analyze user interactions
CREATE OR REPLACE FUNCTION analyze_user_interactions(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  analysis_type text,
  details jsonb
) AS $$
BEGIN
  -- Analyze movie interactions
  RETURN QUERY
  WITH user1_actions AS (
    SELECT movie_id, action, created_at
    FROM anonymous_actions
    WHERE preference_id = user1_id
  ),
  user2_actions AS (
    SELECT movie_id, action, created_at
    FROM anonymous_actions
    WHERE preference_id = user2_id
  ),
  shared_movies AS (
    SELECT 
      u1.movie_id,
      u1.action as user1_action,
      u2.action as user2_action
    FROM user1_actions u1
    FULL OUTER JOIN user2_actions u2 USING (movie_id)
  )
  SELECT 
    'Movie Interactions'::text,
    jsonb_build_object(
      'total_user1_actions', (SELECT COUNT(*) FROM user1_actions),
      'total_user2_actions', (SELECT COUNT(*) FROM user2_actions),
      'shared_movies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'movie_id', movie_id,
            'user1_action', user1_action,
            'user2_action', user2_action
          )
        )
        FROM shared_movies
        WHERE movie_id IS NOT NULL
      ),
      'matching_likes', (
        SELECT COUNT(*)
        FROM shared_movies
        WHERE user1_action = 'like' AND user2_action = 'like'
      )
    );

  -- Analyze preferences match
  RETURN QUERY
  WITH user_prefs AS (
    SELECT 
      id,
      genres,
      languages
    FROM anonymous_preferences
    WHERE id IN (user1_id, user2_id)
  ),
  user1_prefs AS (
    SELECT genres, languages
    FROM user_prefs
    WHERE id = user1_id
  ),
  user2_prefs AS (
    SELECT genres, languages
    FROM user_prefs
    WHERE id = user2_id
  )
  SELECT 
    'Preference Match'::text,
    jsonb_build_object(
      'matching_genres', (
        SELECT array_agg(g)
        FROM (
          SELECT UNNEST(u1.genres) g
          FROM user1_prefs u1
          INTERSECT
          SELECT UNNEST(u2.genres) g
          FROM user2_prefs u2
        ) t
      ),
      'matching_languages', (
        SELECT array_agg(l)
        FROM (
          SELECT UNNEST(u1.languages) l
          FROM user1_prefs u1
          INTERSECT
          SELECT UNNEST(u2.languages) l
          FROM user2_prefs u2
        ) t
      )
    );
END;
$$ LANGUAGE plpgsql;