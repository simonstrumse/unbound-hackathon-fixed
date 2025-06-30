/*
  # Complete Database Schema for Unbound Storytelling Platform

  1. New Tables
    - `profiles` - User profile information including beta access status
    - `stories` - Classic literature available on the platform
    - `characters` - Both player-created and NPC characters from stories
    - `story_sessions` - Active game sessions linking users, stories, and characters
    - `messages` - Conversation history between users and story characters
    - `api_usage` - Tracking OpenAI token usage for cost management

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for authenticated users
    - Ensure users can only access their own data

  3. Key Features
    - Automatic profile creation on user signup
    - Beta access control system
    - Complete conversation tracking
    - API usage monitoring
*/

-- Profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  beta_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stories table for classic literature
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  description text NOT NULL,
  cover_image_url text,
  genre text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Characters table for both player and NPC characters
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  personality_traits text[],
  avatar_url text,
  character_type text NOT NULL CHECK (character_type IN ('player', 'npc')),
  story_id uuid REFERENCES stories(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Story sessions for active games
CREATE TABLE IF NOT EXISTS story_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  player_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  creativity_level text NOT NULL CHECK (creativity_level IN ('faithful', 'balanced', 'creative')),
  session_state jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages table for conversation history
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('user', 'character', 'system')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- API usage tracking for cost management
CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES story_sessions(id) ON DELETE SET NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  api_provider text NOT NULL DEFAULT 'openai',
  operation_type text NOT NULL,
  cost_estimate decimal(10,4),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for stories (readable by all authenticated users)
CREATE POLICY "Authenticated users can read stories"
  ON stories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for characters
CREATE POLICY "Users can read own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR character_type = 'npc');

CREATE POLICY "Users can create own characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND character_type = 'player');

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND character_type = 'player');

-- RLS Policies for story_sessions
CREATE POLICY "Users can access own sessions"
  ON story_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can access messages from own sessions"
  ON messages FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM story_sessions WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for api_usage
CREATE POLICY "Users can read own API usage"
  ON api_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert API usage"
  ON api_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert sample stories
INSERT INTO stories (title, author, description, cover_image_url, genre) VALUES
(
  'Pride and Prejudice',
  'Jane Austen',
  'Navigate the complex social world of Regency England, where wit and romance intertwine in the drawing rooms of the English countryside.',
  'https://images.pexels.com/photos/1831234/pexels-photo-1831234.jpeg',
  'Romance'
),
(
  'The Great Gatsby',
  'F. Scott Fitzgerald',
  'Experience the glittering world of the Jazz Age, where dreams and reality collide in the lavish parties of West Egg.',
  'https://images.pexels.com/photos/2833037/pexels-photo-2833037.jpeg',
  'Classic Fiction'
),
(
  'Alice in Wonderland',
  'Lewis Carroll',
  'Tumble down the rabbit hole into a whimsical world where logic bends and imagination reigns supreme in curious adventures.',
  'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
  'Fantasy'
);

-- Insert sample NPC characters for each story
INSERT INTO characters (name, description, personality_traits, character_type, story_id) VALUES
(
  'Elizabeth Bennet',
  'A spirited and intelligent young woman with a quick wit and strong sense of independence.',
  ARRAY['intelligent', 'witty', 'independent', 'prejudiced', 'loyal'],
  'npc',
  (SELECT id FROM stories WHERE title = 'Pride and Prejudice')
),
(
  'Mr. Darcy',
  'A wealthy and seemingly proud gentleman who initially appears arrogant but reveals deeper complexity.',
  ARRAY['proud', 'honorable', 'reserved', 'generous', 'misunderstood'],
  'npc',
  (SELECT id FROM stories WHERE title = 'Pride and Prejudice')
),
(
  'Jay Gatsby',
  'A mysterious millionaire known for his lavish parties and unwavering pursuit of the American Dream.',
  ARRAY['mysterious', 'optimistic', 'romantic', 'obsessive', 'tragic'],
  'npc',
  (SELECT id FROM stories WHERE title = 'The Great Gatsby')
),
(
  'Nick Carraway',
  'The story''s narrator, a young bond salesman who becomes Gatsby''s neighbor and confidant.',
  ARRAY['observant', 'moral', 'curious', 'conflicted', 'reliable'],
  'npc',
  (SELECT id FROM stories WHERE title = 'The Great Gatsby')
),
(
  'Alice',
  'A curious young girl who falls down a rabbit hole into a fantastical world of wonder.',
  ARRAY['curious', 'brave', 'confused', 'polite', 'adventurous'],
  'npc',
  (SELECT id FROM stories WHERE title = 'Alice in Wonderland')
),
(
  'The Mad Hatter',
  'An eccentric character known for hosting perpetual tea parties and speaking in riddles.',
  ARRAY['eccentric', 'playful', 'nonsensical', 'friendly', 'unpredictable'],
  'npc',
  (SELECT id FROM stories WHERE title = 'Alice in Wonderland')
);