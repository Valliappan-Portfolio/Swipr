/*
  # Debug match score calculation
  
  This migration adds debugging functions to analyze match scores between users.
*/

-- Create function to debug match calculation
CREATE OR REPLACE FUNCTION debug_match_score(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  component text,
  score float,
  details jsonb
) AS $$
DECLARE
  genre_similarity float;
  language_similarity float;
  action_similarity float;
  total_interactions integer;
  base_score float := 10.0;
  user1_genres text[];
  user2_genres text[];
  user1_languages text[];
  user2_languages text[];
BEGIN
  -- Get user preferences
  SELECT genres, languages INTO user1_genres, user1_languages
  FROM anonymous_preferences WHERE id = user1_id;
  
  SELECT genres, languages INTO user2_genres, user2_languages
  FROM anonymous_preferences WHERE id = user2_id;

  -- Genre similarity calculation
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
    ) * 25, 0
  ) INTO genre_similarity;

  -- Language similarity calculation
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
    ) * 15, 0
  ) INTO language_similarity;

  -- Action similarity calculation
  WITH shared_movies AS (
    SELECT 
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
  ),
  action_scores AS (
    SELECT 
      movie_id,
      user1_action,
      user2_action,
      CASE
        WHEN user1_action = 'like' AND user2_action = 'like' THEN 2.0
        WHEN user1_action = 'pass' AND user2_action = 'pass' THEN 0.8
        WHEN user1_action = 'unwatched' AND user2_action = 'unwatched' THEN 0.6
        WHEN (user1_action = 'like' AND user2_action = 'unwatched') OR 
             (user1_action = 'unwatched' AND user2_action = 'like') THEN 0.4
        ELSE 0.2
      END as match_weight
    FROM shared_movies
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(match_weight) * 60 / NULLIF(COUNT(*), 0), 0)
  INTO 
    total_interactions,
    action_similarity
  FROM action_scores;

  -- Return debug information
  RETURN QUERY
  SELECT 'User Preferences'::text,
         0::float,
         jsonb_build_object(
           'user1_genres', user1_genres,
           'user2_genres', user2_genres,
           'user1_languages', user1_languages,
           'user2_languages', user2_languages
         );

  RETURN QUERY
  SELECT 'Genre Similarity (25%)'::text,
         genre_similarity,
         jsonb_build_object(
           'matching_genres', (
             SELECT array_agg(g)
             FROM (
               SELECT UNNEST(user1_genres) INTERSECT SELECT UNNEST(user2_genres)
             ) as t(g)
           )
         );

  RETURN QUERY
  SELECT 'Language Similarity (15%)'::text,
         language_similarity,
         jsonb_build_object(
           'matching_languages', (
             SELECT array_agg(l)
             FROM (
               SELECT UNNEST(user1_languages) INTERSECT SELECT UNNEST(user2_languages)
             ) as t(l)
           )
         );

  RETURN QUERY
  WITH movie_details AS (
    SELECT 
      a1.movie_id,
      a1.action as user1_action,
      a2.action as user2_action,
      CASE
        WHEN a1.action = 'like' AND a2.action = 'like' THEN 2.0
        WHEN a1.action = 'pass' AND a2.action = 'pass' THEN 0.8
        WHEN a1.action = 'unwatched' AND a2.action = 'unwatched' THEN 0.6
        WHEN (a1.action = 'like' AND a2.action = 'unwatched') OR 
             (a1.action = 'unwatched' AND a2.action = 'like') THEN 0.4
        ELSE 0.2
      END as match_weight
    FROM anonymous_actions a1
    JOIN anonymous_actions a2 
      ON a1.movie_id = a2.movie_id
      AND a1.preference_id = user1_id 
      AND a2.preference_id = user2_id
  )
  SELECT 'Action Similarity (60%)'::text,
         action_similarity,
         jsonb_build_object(
           'total_interactions', total_interactions,
           'movie_matches', (
             SELECT jsonb_agg(
               jsonb_build_object(
                 'movie_id', movie_id,
                 'user1_action', user1_action,
                 'user2_action', user2_action,
                 'match_weight', match_weight
               )
             )
             FROM movie_details
           )
         );

  RETURN QUERY
  SELECT 'Final Score'::text,
         CASE 
           WHEN total_interactions > 0 THEN
             GREATEST(
               LEAST(
                 base_score + genre_similarity + language_similarity + action_similarity,
                 100
               ),
               base_score
             )
           ELSE 0
         END,
         jsonb_build_object(
           'base_score', base_score,
           'genre_similarity', genre_similarity,
           'language_similarity', language_similarity,
           'action_similarity', action_similarity,
           'total_interactions', total_interactions
         );
END;
$$ LANGUAGE plpgsql;

-- Create function to get user actions summary
CREATE OR REPLACE FUNCTION get_user_actions_summary(user_id uuid)
RETURNS TABLE (
  action_type text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    action,
    COUNT(*)
  FROM anonymous_actions
  WHERE preference_id = user_id
  GROUP BY action;
END;
$$ LANGUAGE plpgsql;