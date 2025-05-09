/*
  # Add Developer Access and User Tracking

  1. Changes
    - Add `is_developer` column to profiles table
    - Add `last_active` column to profiles table
    - Add `total_actions` column to profiles table
    - Add function to update user activity

  2. Security
    - Only developers can view all user data
    - Regular users can only view their own data
*/

-- Add developer access and tracking columns
ALTER TABLE profiles
ADD COLUMN is_developer boolean DEFAULT false,
ADD COLUMN last_active timestamptz DEFAULT now(),
ADD COLUMN total_actions integer DEFAULT 0;

-- Create function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    last_active = now(),
    total_actions = total_actions + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user activity on movie actions
CREATE TRIGGER update_user_activity_trigger
AFTER INSERT ON movie_actions
FOR EACH ROW
EXECUTE FUNCTION update_user_activity();

-- Update RLS policies for developer access
CREATE POLICY "Developers can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE is_developer = true
    )
  );

-- Update existing policies to work with developer access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    auth.uid() IN (SELECT id FROM profiles WHERE is_developer = true)
  );