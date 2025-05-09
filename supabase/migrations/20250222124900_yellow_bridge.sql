/*
  # Reset User Data

  This migration safely resets all user data while preserving the schema structure.
  
  1. Disable RLS temporarily
  2. Clear data in correct order respecting foreign key constraints
  3. Re-enable RLS
*/

DO $$ 
BEGIN
  -- First, disable RLS temporarily to allow cleanup
  ALTER TABLE anonymous_actions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_preferences DISABLE ROW LEVEL SECURITY;
  ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;
  ALTER TABLE friend_matches DISABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

  -- Clear data in correct order (respecting foreign key constraints)
  TRUNCATE TABLE friend_matches CASCADE;
  TRUNCATE TABLE friend_requests CASCADE;
  TRUNCATE TABLE anonymous_actions CASCADE;
  TRUNCATE TABLE anonymous_preferences CASCADE;
  TRUNCATE TABLE profiles CASCADE;

  -- Delete auth users (now safe since profiles are cleared)
  DELETE FROM auth.users;

  -- Re-enable RLS
  ALTER TABLE anonymous_actions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_preferences ENABLE ROW LEVEL SECURITY;
  ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE friend_matches ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
END $$;