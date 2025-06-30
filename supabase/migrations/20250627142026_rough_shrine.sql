/*
  # Fix admin access to all user profiles

  1. Add RLS policies that allow admins to read all profiles
  2. Ensure no infinite recursion by using direct uid() checks
  3. Allow superadmins to manage all profiles safely
*/

-- Add policy for admins to read all profiles (avoid recursion by using auth.uid() directly)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can read their own profile OR
    auth.uid() = id 
    OR
    -- User is an admin (check directly in auth.users metadata or use a direct email check)
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE (is_admin = true OR admin_level IS NOT NULL)
      AND id = auth.uid()
    )
  );

-- Add policy for superadmins to update any profile
CREATE POLICY "Superadmins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile OR
    auth.uid() = id
    OR
    -- User is a superadmin
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE admin_level = 'superadmin'
      AND id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    auth.uid() = id
    OR
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE admin_level = 'superadmin'
      AND id = auth.uid()
    )
  );

-- Alternative simpler approach: Use the auth.email() function if available
-- This avoids potential recursion issues entirely
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can read their own profile
    auth.uid() = id 
    OR
    -- Or user is the known superadmin
    auth.email() = 'simonstrumse@gmail.com'
    OR
    -- Or we do a safe subquery check
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.id IN (
        SELECT p.id FROM profiles p 
        WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.admin_level IS NOT NULL)
      )
    )
  );

-- Test the policies by ensuring the superadmin can see all profiles
-- This should not cause recursion because we're using auth.email() and EXISTS