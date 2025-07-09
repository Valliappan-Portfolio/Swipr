/*
  # Add service role policy for profile creation

  1. Changes
    - Add RLS policy to allow service_role to insert profiles
    - This enables the ensure_profile_exists trigger to work properly during sign-up
    
  2. Security
    - Only service_role can use this policy (used by database triggers)
    - Regular users still cannot directly insert profiles
    - Maintains existing security model
*/

CREATE POLICY "Allow service role to insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);