-- Migration: Add email-based authentication
-- This migration adds email support while preserving username for display

-- Add email column to anonymous_users table
ALTER TABLE anonymous_users ADD COLUMN IF NOT EXISTS email text;

-- Add UNIQUE constraint on email (will be required for new signups)
ALTER TABLE anonymous_users ADD CONSTRAINT unique_email UNIQUE (email);

-- Ensure username has UNIQUE constraint (should already exist, but add if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_username'
    ) THEN
        ALTER TABLE anonymous_users ADD CONSTRAINT unique_username UNIQUE (username);
    END IF;
END $$;

-- Ensure username is NOT NULL
ALTER TABLE anonymous_users ALTER COLUMN username SET NOT NULL;

-- Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON anonymous_users(email);

-- Create index for fast username lookups (if doesn't exist)
CREATE INDEX IF NOT EXISTS idx_users_username ON anonymous_users(username);

-- Make last_seen nullable (will be set on first action, not on signup)
ALTER TABLE anonymous_users ALTER COLUMN last_seen DROP NOT NULL;

-- Update RLS policies to allow email-based operations
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view usernames" ON anonymous_users;
DROP POLICY IF EXISTS "Anyone can create accounts" ON anonymous_users;
DROP POLICY IF EXISTS "Users can update their own data" ON anonymous_users;

-- Recreate policies with email support
CREATE POLICY "Anyone can view usernames"
  ON anonymous_users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create accounts"
  ON anonymous_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON anonymous_users FOR UPDATE
  USING (true);

-- Add comment to document the schema change
COMMENT ON COLUMN anonymous_users.email IS 'User email address for authentication (unique identifier)';
COMMENT ON COLUMN anonymous_users.username IS 'User display name (unique, used for personalization)';