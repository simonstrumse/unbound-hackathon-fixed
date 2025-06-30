/*
  # Add context compression threshold to profiles

  1. New Columns
    - `context_compression_threshold` - Customizable threshold for context compression (default 0.7)

  2. Changes
    - Add the new column to profiles table
    - Set default value to 0.7 (70%)
    - Allow users to customize when context compression occurs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'context_compression_threshold'
  ) THEN
    ALTER TABLE profiles ADD COLUMN context_compression_threshold numeric(3,2) DEFAULT 0.7;
  END IF;
END $$;

-- Update existing users to have the default threshold
UPDATE profiles 
SET context_compression_threshold = 0.7 
WHERE context_compression_threshold IS NULL;