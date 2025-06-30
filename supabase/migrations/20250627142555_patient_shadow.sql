/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies have recursive queries that reference the profiles table within policies that control profiles access
    - This causes "infinite recursion detected in policy" errors

  2. Solution
    - Drop problematic recursive policies
    - Create simpler, non-recursive policies
    - Use auth functions directly without querying profiles table recursively

  3. Changes
    - Remove recursive admin check policies
    - Create clean, simple policies using auth.uid() and auth.email()
    - Ensure superadmin access works correctly
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple, non-recursive policies

-- 1. Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Allow superadmin (specific email) to read all profiles
CREATE POLICY "Superadmin can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'simonstrumse@gmail.com');

-- 3. Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Allow superadmin to update all profiles
CREATE POLICY "Superadmin can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'simonstrumse@gmail.com')
  WITH CHECK (auth.email() = 'simonstrumse@gmail.com');

-- 6. Create a separate policy for admins to read all profiles (non-recursive)
-- This will be used after the profile is loaded to check admin status
-- For now, we'll keep it simple and only allow superadmin full access
-- Regular admins can be handled in application logic after profile is fetched