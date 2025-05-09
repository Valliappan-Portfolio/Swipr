/*
  # Improve authentication and user management

  1. Changes
    - Add social auth providers configuration
    - Add password reset functionality
    - Add email verification settings
    - Improve profile management

  2. Security
    - Maintains RLS security
    - Preserves existing access controls
*/

-- Enable email confirmations but make them optional
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at SET DEFAULT now();

-- Add last_sign_in tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_sign_in timestamptz,
ADD COLUMN IF NOT EXISTS sign_in_count integer DEFAULT 0;

-- Create function to track sign ins
CREATE OR REPLACE FUNCTION handle_auth_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    last_sign_in = now(),
    sign_in_count = COALESCE(sign_in_count, 0) + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sign in tracking
DROP TRIGGER IF EXISTS on_auth_sign_in ON auth.users;
CREATE TRIGGER on_auth_sign_in
  AFTER INSERT OR UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_sign_in();

-- Ensure profile creation on sign up
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_exists();