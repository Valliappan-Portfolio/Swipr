/*
  # Grant developer access to specific user

  1. Changes
    - Updates the profiles table to grant developer access to a specific user
    - Sets the is_developer flag to true for the specified email

  2. Security
    - Only modifies a single user profile
    - Maintains existing RLS policies
*/

DO $$ 
BEGIN
  UPDATE profiles
  SET is_developer = true
  WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'rraagul5@gmail.com'
  );
END $$;