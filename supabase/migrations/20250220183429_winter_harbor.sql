/*
  # Fix database policies and profile handling

  1. Changes
    - Safely drops and recreates policies to avoid conflicts
    - Adds proper developer access controls
    - Ensures clean policy management

  2. Security
    - Maintains RLS security
    - Preserves existing access controls
*/

-- First, safely drop all existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Developers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new optimized policies
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() AND is_developer = true
    )
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Ensure the is_developer function exists
CREATE OR REPLACE FUNCTION is_developer(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id AND is_developer = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;