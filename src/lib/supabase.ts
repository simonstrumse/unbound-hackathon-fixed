import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url: string | null;
          beta_approved: boolean;
          is_admin: boolean;
          admin_level: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          avatar_url?: string | null;
          beta_approved?: boolean;
          is_admin?: boolean;
          admin_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          avatar_url?: string | null;
          beta_approved?: boolean;
          is_admin?: boolean;
          admin_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          title: string;
          author: string;
          description: string;
          cover_image_url: string | null;
          genre: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
      characters: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          personality_traits: string[] | null;
          avatar_url: string | null;
          character_type: 'player' | 'npc';
          story_id: string | null;
          user_id: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
      story_sessions: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          player_character_id: string;
          creativity_level: 'faithful' | 'balanced' | 'creative';
          session_state: any;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          character_id: string;
          content: string;
          message_type: 'user' | 'character' | 'system';
          metadata: any;
          created_at: string;
        };
      };
      api_usage: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          tokens_used: number;
          api_provider: string;
          operation_type: string;
          cost_estimate: number | null;
          model_type: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          response_time_ms: number | null;
          input_cost: number | null;
          output_cost: number | null;
          total_cost: number | null;
          created_at: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Story = Database['public']['Tables']['stories']['Row'];
export type Character = Database['public']['Tables']['characters']['Row'];
export type StorySession = Database['public']['Tables']['story_sessions']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type ApiUsage = Database['public']['Tables']['api_usage']['Row'];