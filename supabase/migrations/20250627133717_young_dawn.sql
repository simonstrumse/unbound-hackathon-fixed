/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Superadmin can manage all profiles" policy creates infinite recursion by querying the profiles table itself
    - This happens when the policy tries to check if a user is a superadmin by looking at their profile record

  2. Solution
    - Remove the problematic superadmin policy that causes circular reference
    - Keep the simple, safe policies that use direct auth.uid() comparison
    - Superadmin access can be handled at the application level instead of database level

  3. Security
    - Users can still only read/update their own profiles
    - New profiles can still be created by authenticated users for their own uid
    - Removes the circular dependency that was causing the recursion error
*/

-- Drop the problematic superadmin policy that causes infinite recursion
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON profiles;

-- Keep the existing safe policies (these should already exist but let's ensure they're correct)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate the safe policies without circular references
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Superadmin functionality should be handled at the application level
-- by checking the profile data after it's successfully fetched, not at the RLS level