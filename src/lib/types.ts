// Enhanced types for the storytelling system
export interface MemoryEvent {
  id: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  timestamp: string;
  characters_involved: string[];
  location?: string;
  tags: string[];
}

export interface CharacterRelationship {
  character_name: string;
  relationship_type: 'ally' | 'friend' | 'neutral' | 'suspicious' | 'enemy' | 'romantic';
  trust_level: number; // 0-100
  notes: string;
  last_interaction: string;
}

export interface WorldState {
  current_location: string;
  time_of_day: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  weather?: string;
  present_npcs: string[];
  mood_atmosphere: string;
  important_objects: string[];
}

export interface StoryPhase {
  phase: 'beginning' | 'middle' | 'approaching_end' | 'climax';
  message_count: number;
  tension_level: number; // 0-10
  key_plot_points: string[];
}

export interface SuggestedAction {
  id: string;
  text: string;
  type: 'dialogue' | 'action' | 'exploration' | 'introspection';
  consequence_hint?: string;
}

export interface EnhancedAIResponse {
  narration: string;
  suggested_actions: SuggestedAction[];
  memory_updates: MemoryEvent[];
  world_state_updates: Partial<WorldState>;
  relationship_updates: Partial<CharacterRelationship>[];
  scene_update?: string;
  new_npcs?: string[];
}