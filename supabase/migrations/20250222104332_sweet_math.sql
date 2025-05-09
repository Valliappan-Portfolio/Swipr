/*
  # Add languages support

  1. Changes
    - Add languages column to anonymous_preferences table
    - Update industries column to languages
    - Add language column to anonymous_actions table
  
  2. Notes
    - Preserves existing data by converting industries to languages
    - Adds proper language tracking for actions
*/

-- Add languages column to anonymous_preferences
ALTER TABLE anonymous_preferences
ADD COLUMN languages text[] DEFAULT '{}';

-- Add language column to anonymous_actions
ALTER TABLE anonymous_actions
ADD COLUMN language text;

-- Create function to map industry to language
CREATE OR REPLACE FUNCTION map_industry_to_language(industry text)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN industry = 'Hollywood' THEN 'en'
    WHEN industry = 'Kollywood' THEN 'ta'
    WHEN industry = 'Mollywood' THEN 'ml'
    ELSE 'en'
  END;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data
DO $$ 
BEGIN
  -- Update preferences
  UPDATE anonymous_preferences
  SET languages = ARRAY(
    SELECT map_industry_to_language(industry)
    FROM unnest(industries) AS industry
  )
  WHERE industries IS NOT NULL;

  -- Drop old column
  ALTER TABLE anonymous_preferences
  DROP COLUMN industries;
END $$;