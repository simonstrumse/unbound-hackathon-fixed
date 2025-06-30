/*
  # Enhanced Analytics Schema

  1. Schema Changes
    - Add detailed token tracking columns to api_usage table
    - Add model type, response time, and separate input/output token tracking
    - Update cost calculation to be more accurate

  2. New Columns
    - model_type: Track which AI model was used
    - input_tokens: Tokens used for the prompt/input
    - output_tokens: Tokens generated in the response
    - response_time_ms: Time taken for the API call
    - input_cost: Cost for input tokens
    - output_cost: Cost for output tokens
    - total_cost: Total cost for the operation
*/

-- Add new columns to api_usage table for enhanced tracking
DO $$
BEGIN
  -- Add model_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'model_type'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN model_type text DEFAULT 'gpt-4o-mini';
  END IF;

  -- Add input_tokens column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'input_tokens'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN input_tokens integer DEFAULT 0;
  END IF;

  -- Add output_tokens column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'output_tokens'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN output_tokens integer DEFAULT 0;
  END IF;

  -- Add response_time_ms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'response_time_ms'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN response_time_ms integer DEFAULT 0;
  END IF;

  -- Add input_cost column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'input_cost'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN input_cost decimal(12,6) DEFAULT 0;
  END IF;

  -- Add output_cost column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'output_cost'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN output_cost decimal(12,6) DEFAULT 0;
  END IF;

  -- Add total_cost column (will replace cost_estimate eventually)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE api_usage ADD COLUMN total_cost decimal(12,6) DEFAULT 0;
  END IF;
END $$;

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_api_usage_model_created 
ON api_usage(model_type, created_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_created 
ON api_usage(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_operation_created 
ON api_usage(operation_type, created_at);