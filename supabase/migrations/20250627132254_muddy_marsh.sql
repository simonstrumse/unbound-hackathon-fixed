/*
  # Admin Hierarchy System

  1. Schema Changes
    - Add `admin_level` column to profiles table
    - Levels: null (regular user), 'admin' (regular admin), 'superadmin' (full access)
    - Update existing admin user to superadmin

  2. Security
    - Update RLS policies for admin access levels
    - Ensure proper permission checks
*/

-- Add admin_level column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_level text CHECK (admin_level IN ('admin', 'superadmin'));
  END IF;
END $$;

-- Set the superadmin
UPDATE profiles 
SET admin_level = 'superadmin', is_admin = true
WHERE email = 'simonstrumse@gmail.com';

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level 
ON profiles(admin_level) WHERE admin_level IS NOT NULL;

-- Add RLS policy for admin user management (superadmin only)
CREATE POLICY "Superadmin can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.admin_level = 'superadmin'
    )
  );

-- Add RLS policy for admin analytics access
CREATE POLICY "Admins can read all API usage"
  ON api_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_admin = true OR p.admin_level IS NOT NULL)
    )
  );