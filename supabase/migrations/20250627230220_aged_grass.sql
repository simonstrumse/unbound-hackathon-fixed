/*
  # Add subscription tracking fields to profiles

  1. New Columns
    - `subscription_status` - Current subscription status
    - `subscription_id` - RevenueCat customer ID
    - `tokens_used` - Current token usage for the period
    - `subscription_expires_at` - When current subscription expires

  2. Updates
    - Add indexes for performance
    - Update existing users with default values
*/

-- Add subscription-related columns to profiles table
DO $$
BEGIN
  -- Add subscription_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired'));
  END IF;

  -- Add subscription_id column (for RevenueCat customer ID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_id text;
  END IF;

  -- Add tokens_used_current_period column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tokens_used_current_period'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tokens_used_current_period integer DEFAULT 0;
  END IF;

  -- Add subscription_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;

  -- Add plan_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_type text DEFAULT 'free' CHECK (plan_type IN ('free', 'unlimited'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_profiles_plan_type 
ON profiles(plan_type);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires 
ON profiles(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

-- Update existing users to have default values
UPDATE profiles 
SET 
  subscription_status = 'free',
  plan_type = 'free',
  tokens_used_current_period = 0
WHERE subscription_status IS NULL;