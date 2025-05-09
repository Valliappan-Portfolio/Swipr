/*
  # Add 'unwatched' action type to movie_actions

  1. Changes
    - Update check constraint on movie_actions table to allow 'unwatched' action type
*/

ALTER TABLE movie_actions DROP CONSTRAINT movie_actions_action_check;
ALTER TABLE movie_actions ADD CONSTRAINT movie_actions_action_check 
  CHECK (action IN ('like', 'pass', 'unwatched'));