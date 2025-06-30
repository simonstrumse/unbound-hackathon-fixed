export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SceneResponse {
  narration: string;
  npcs: string[];
  scene_description: string;
  suggested_actions: Array<{
    id: string;
    text: string;
    type: string;
  }>;
  memory_updates: Array<{
    id: string;
    description: string;
    importance: string;
    characters_involved: string[];
    tags: string[];
  }>;
  world_state: {
    current_location: string;
    time_of_day: string;
    weather?: string;
    present_npcs: string[];
    mood_atmosphere: string;
  };
  context_usage?: number;
}

export interface ConversationResponse {
  response: string;
  scene_update?: string;
  new_npcs?: string[];
  suggested_actions: Array<{
    id: string;
    text: string;
    type: string;
  }>;
  memory_updates: Array<{
    id: string;
    description: string;
    importance: string;
    characters_involved: string[];
    tags: string[];
  }>;
  world_state_updates: any;
  relationship_updates: Array<{
    character_name: string;
    relationship_type: string;
    trust_level: number;
    notes: string;
  }>;
  context_usage?: number;
}

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelType: string;
  responseTime: number;
  costs: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export class OpenAIService {
  private async makeRequest(endpoint: string, body: any, retries = 3): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff: wait 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private getCreativityPrompt(level: number): string {
    const prompts = {
      1: `LEVEL 1 - FAITHFUL TO SOURCE: You are preserving the exact essence of the original work. 
         - Maintain the author's writing style, tone, and voice precisely
         - Keep character personalities, speech patterns, and motivations exactly as written
         - Follow the original plot structure and maintain story coherence
         - Use period-appropriate language and cultural context
         - Reference canonical events and maintain established relationships
         - Responses should feel like they could be excerpts from the actual book
         - Avoid modern anachronisms or out-of-character behavior
         - Honor the themes, moral lessons, and social commentary of the original`,

      2: `LEVEL 2 - CREATIVE EXPLORATION: You are expanding the world while respecting its foundations.
         - Maintain core character personalities but allow for growth and new situations  
         - Explore "what if" scenarios that could plausibly exist in this world
         - Introduce new but thematically appropriate challenges and opportunities
         - Keep the story's tone and atmosphere while adding creative elements
         - Allow characters to face situations not in the original but true to their nature
         - Blend faithful characterization with inventive plot developments
         - Maintain story logic and internal consistency
         - Honor the spirit of the original while enabling meaningful player agency`,

      3: `LEVEL 3 - BOUNDLESS CREATIVITY: You are reimagining the story with complete freedom.
         - Preserve character essences but allow dramatic evolution and change
         - Enable radical plot divergences and unexpected story directions  
         - Introduce anachronisms, genre-blending, or alternate history elements
         - Allow modern perspectives to influence character growth and decisions
         - Create entirely new conflicts, alliances, and story arcs
         - Blend multiple time periods, styles, or even genres if dramatically interesting
         - Prioritize compelling narrative over strict canonical adherence
         - Let player choices fundamentally reshape the story's trajectory and themes`
    };

    return prompts[level as keyof typeof prompts] || prompts[2];
  }

  private getStoryPhasePrompt(messageCount: number): string {
    if (messageCount < 5) {
      return `STORY PHASE - BEGINNING: Focus on character introductions, world-building, and establishing the central conflict or journey. Build intrigue and set expectations. Use descriptive language to immerse the player in the setting.`;
    } else if (messageCount < 15) {
      return `STORY PHASE - MIDDLE: Develop the central conflict, introduce complications, and deepen character relationships. Build tension and present meaningful choices that affect the story direction.`;
    } else {
      return `STORY PHASE - APPROACHING CLIMAX: Heighten stakes, accelerate pacing, and move toward major confrontations or revelations. Focus on character growth and resolution of key conflicts.`;
    }
  }

  async generateOpeningScene(
    story: any, 
    character: any, 
    creativityLevel: number
  ): Promise<{ response: SceneResponse; tokensUsed: number; usage?: UsageMetrics }> {
    try {
      const result = await this.makeRequest('generate-opening-scene', {
        story,
        character,
        creativityLevel,
        creativityPrompt: this.getCreativityPrompt(creativityLevel),
        storyPhasePrompt: this.getStoryPhasePrompt(0)
      });

      return result;
    } catch (error) {
      console.error('Error generating opening scene:', error);
      throw error;
    }
  }

  async continueConversation(
    story: any,
    character: any,
    conversationHistory: ConversationMessage[],
    playerInput: string,
    creativityLevel: number,
    memoryContext: any[] = [],
    worldState: any = {},
    relationships: any[] = []
  ): Promise<{ response: ConversationResponse; tokensUsed: number; usage?: UsageMetrics }> {
    try {
      const messageCount = conversationHistory.length;
      const result = await this.makeRequest('continue-conversation', {
        story,
        character,
        conversationHistory,
        playerInput,
        creativityLevel,
        creativityPrompt: this.getCreativityPrompt(creativityLevel),
        storyPhasePrompt: this.getStoryPhasePrompt(messageCount),
        memoryContext,
        worldState,
        relationships
      });

      return result;
    } catch (error) {
      console.error('Error in conversation:', error);
      throw error;
    }
  }

  async generateStorySummary(
    story: any,
    character: any,
    conversationHistory: ConversationMessage[],
    memoryEvents: any[] = []
  ): Promise<{ summary: string; tokensUsed: number; usage?: UsageMetrics }> {
    try {
      const result = await this.makeRequest('generate-story-summary', {
        story,
        character,
        conversationHistory,
        memoryEvents
      });

      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      return { 
        summary: `${character.name} completed their adventure in ${story.title}. It was a unique and memorable journey filled with meaningful choices and character growth!`, 
        tokensUsed: 0,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          modelType: 'gpt-4o-mini',
          responseTime: 0,
          costs: { inputCost: 0, outputCost: 0, totalCost: 0 }
        }
      };
    }
  }
}

export const openaiService = new OpenAIService();