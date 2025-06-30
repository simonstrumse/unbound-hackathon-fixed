/*
  # Add admin column to profiles table

  1. Schema Changes
    - Add `is_admin` column to profiles table
    - Set default value to false
    - Make it non-nullable

  2. Security
    - Update RLS policies if needed for admin access
*/

-- Add is_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Update specific admin user
UPDATE profiles 
SET is_admin = true 
WHERE email = 'simonstrumse@gmail.com';