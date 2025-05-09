/*
  # Grant developer access to specific user

  1. Changes
    - Ensures developer access is granted to the specified email
    - Updates the last_active timestamp
*/

DO $$ 
BEGIN
  -- Grant developer access
  UPDATE profiles
  SET 
    is_developer = true,
    last_active = now()
  WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'rraagul5@gmail.com'
  );

  -- Verify the update
  IF NOT FOUND THEN
    RAISE NOTICE 'No profile found for the specified email';
  END IF;
END $$;