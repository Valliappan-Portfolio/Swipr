/*
  # Fix Profile Creation During Sign-up

  1. Changes
    - Remove restrictive RLS policy that blocks automatic profile creation
    - Allow the ensure_profile_exists trigger to work properly
    - Maintain security through foreign key constraints

  2. Security
    - Profile table is still protected by foreign key to auth.users
    - Public read access maintained for necessary functionality
    - Self-update policy preserved for user modifications
*/

-- Remove the problematic insert policy that blocks the trigger
DROP POLICY IF EXISTS "allow_self_insert" ON profiles;

-- The profiles table is already protected by:
-- 1. Foreign key constraint to auth.users(id)
-- 2. The ensure_profile_exists trigger only creates profiles for valid auth users
-- 3. Public read and self-update policies provide appropriate access control