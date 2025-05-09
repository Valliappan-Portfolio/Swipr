/*
  # Add insert policy for profiles table

  1. Changes
    - Add RLS policy to allow users to insert their own profile
    
  2. Security
    - Users can only insert a profile with their own auth.uid
    - Maintains existing policies for viewing and updating profiles
*/

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);