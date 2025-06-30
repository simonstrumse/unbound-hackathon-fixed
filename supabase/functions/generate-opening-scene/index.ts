import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  story: any;
  character: any;
  creativityLevel: number;
}

// Enhanced cost calculation based on OpenAI pricing
function calculateCosts(inputTokens: number, outputTokens: number, modelType: string = 'gpt-4o-mini') {
  const pricing = {
    'gpt-4o-mini': {
      input: 0.15 / 1000000,  // $0.15 per 1M input tokens
      output: 0.60 / 1000000  // $0.60 per 1M output tokens
    },
    'gpt-4o': {
      input: 2.50 / 1000000,  // $2.50 per 1M input tokens
      output: 10.00 / 1000000 // $10.00 per 1M output tokens
    },
    'gpt-4-turbo': {
      input: 10.00 / 1000000, // $10.00 per 1M input tokens
      output: 30.00 / 1000000 // $30.00 per 1M output tokens
    }
  };

  const modelPricing = pricing[modelType as keyof typeof pricing] || pricing['gpt-4o-mini'];
  const inputCost = inputTokens * modelPricing.input;
  const outputCost = outputTokens * modelPricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6))
  };
}

// Enhanced token counting (1 token ≈ 4 characters for English text)
function estimateTokens(text: string): number {
  if (!text) return 0;
  // More accurate token estimation
  // Account for spaces, punctuation, and word boundaries
  const words = text.split(/\s+/).length;
  const chars = text.length;
  
  // Rough estimates: 1 token per 4 chars, but 1 token per 0.75 words
  const charBasedTokens = Math.ceil(chars / 4);
  const wordBasedTokens = Math.ceil(words / 0.75);
  
  // Use the higher estimate for safety
  return Math.max(charBasedTokens, wordBasedTokens);
}

// Get creativity-specific opening scene prompt with distinct AI personalities
function getOpeningScenePrompt(creativityLevel: number, story: any, character: any): string {
  const baseContext = `STORY: ${story.title} by ${story.author}
PLAYER CHARACTER: ${character.name} (${character.personality_traits?.join(', ') || 'adventurous'})`;

  switch (creativityLevel) {
    case 1: // Story-Focused - Canonical opening
      return `You are creating a CANONICAL OPENING that immediately establishes the authentic world of ${story.title}.

${baseContext}

LEVEL 1 - STORY-FOCUSED OPENING:
Create an opening that could have been written by ${story.author} themselves.

OPENING GUIDELINES:
• Start with ICONIC ELEMENTS from the original story - familiar settings, canonical characters
• Establish the ORIGINAL ATMOSPHERE and tone immediately
• Introduce NPCs who have CLEAR GOALS related to the main plot
• Create IMMEDIATE NARRATIVE HOOKS that connect to canonical story events
• Use ${story.author}'s authentic WRITING STYLE and period language
• Make ${character.name} feel like they BELONG in this world naturally
• Set up DRAMATIC TENSION that will drive the story forward purposefully
• Reference THEMES and conflicts central to the original work

TONE: Literary, authentic to ${story.author}'s original voice
FOCUS: Establishing canonical world and drawing player into the main narrative`;

    case 2: // Flexible Exploration - Balanced opening
      return `You are creating a WELCOMING OPENING that honors ${story.title} while inviting exploration.

${baseContext}

LEVEL 2 - FLEXIBLE EXPLORATION OPENING:
Create an opening that feels both authentic and full of possibilities.

OPENING GUIDELINES:
• Blend FAMILIAR ELEMENTS with subtle hints of broader possibilities
• Introduce NPCs who are CURIOUS about ${character.name} and responsive to their approach
• Create MULTIPLE PATHS forward - players should see several interesting directions
• Balance ${story.author}'s style with modern accessibility and engagement
• Establish the world's FLEXIBILITY - honor canon while suggesting room for creativity
• Make NPCs OBSERVANT - they notice and react to ${character.name}'s personality
• Set up scenarios where PLAYER CHOICE will meaningfully shape what happens next
• Create emotional RESONANCE that connects to both original themes and player interests

TONE: Engaging and accessible while respectful of the source material
FOCUS: Creating multiple interesting paths while establishing the world authentically`;

    case 3: // Open World - Creative freedom opening
      return `You are creating a LIMITLESS OPENING where ${story.title} becomes a creative playground.

${baseContext}

LEVEL 3 - OPEN WORLD OPENING:
Create an opening that screams "ANYTHING IS POSSIBLE!"

OPENING GUIDELINES:
• REIMAGINE the world - what if ${story.title} had magic? Different time period? Sci-fi elements?
• Create NPCs who are IMMEDIATELY FASCINATED by ${character.name} and eager to explore
• Establish that REALITY IS FLEXIBLE - normal rules may not apply
• Hint at GENRE-BLENDING possibilities - romance can become adventure, mystery can become comedy
• Make NPCs ENABLERS of creativity who encourage wild ideas and exploration
• Set up a world where ${character.name} can RESHAPE EVERYTHING through their choices
• Create EXPLOSIVE ENERGY - this should feel like the start of an amazing, unpredictable journey
• Break conventional boundaries while keeping character essences recognizable

TONE: Enthusiastic, boundary-breaking, "anything goes" energy
FOCUS: Maximum creative freedom and player empowerment`;

    default:
      return getOpeningScenePrompt(2, story, character);
  }
}

// Simple, effective JSON cleaning function
function cleanNarrativeText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Only clean if there are obvious JSON artifacts
  if (cleaned.includes('"narration"') || cleaned.includes('suggested_actions')) {
    // Remove JSON field patterns
    cleaned = cleaned.replace(/"narration"\s*:\s*"/g, '');
    cleaned = cleaned.replace(/",?\s*"suggested_actions"[\s\S]*/gi, '');
    cleaned = cleaned.replace(/",?\s*"memory_updates"[\s\S]*/gi, '');
    cleaned = cleaned.replace(/",?\s*"world_state"[\s\S]*/gi, '');
    
    // Remove trailing JSON
    cleaned = cleaned.replace(/[,\}]*\s*$/, '');
    cleaned = cleaned.replace(/^[\s"]*/, '');
    cleaned = cleaned.replace(/[\s"]*$/, '');
  }
  
  return cleaned.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now();
    
    const { story, character, creativityLevel }: RequestBody = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const creativityInstructions = {
      1: "Stay close to the original story. Maintain canonical characters and plot points.",
      2: "Allow moderate creative freedom while maintaining story coherence. Explore new scenarios that fit the world.",
      3: "Full creative freedom. The story can diverge significantly while maintaining character essences."
    };

    // Enhanced system prompt for opening scene
    // Get creativity-level specific opening scene prompt
    const creativityPrompt = getOpeningScenePrompt(creativityLevel, story, character);
    
    const systemPrompt = `${creativityPrompt}

CRITICAL: Your response must be valid JSON with these exact fields:
{
  "narration": "Your 2-3 paragraph opening scene text here",
  "suggested_actions": [
    {"id": "action1", "text": "Specific action related to the scene", "type": "dialogue"},
    {"id": "action2", "text": "Another contextual option", "type": "exploration"},
    {"id": "action3", "text": "Third meaningful choice", "type": "action"}
  ],
  "memory_updates": [
    {"id": "opening", "description": "Opening scene description", "importance": "medium", "characters_involved": ["${character.name}"], "tags": ["beginning"]}
  ],
  "world_state": {
    "current_location": "Opening location",
    "time_of_day": "morning",
    "present_npcs": ["NPC names"],
    "mood_atmosphere": "Scene mood"
  }
}

The "narration" field should contain ONLY the opening story text - no JSON formatting within it.

Create an engaging opening scene (2-3 paragraphs, 200-400 words) that embodies your Level ${creativityLevel} personality!`;

    const modelType = 'gpt-4o-mini'; // Always use gpt-4o-mini as specified

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelType,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create the opening scene for ${character.name} entering the world of ${story.title}.` }
        ],
        max_tokens: 1200,
        temperature: creativityLevel === 3 ? 0.9 : creativityLevel === 2 ? 0.7 : 0.5,
        response_format: { type: "json_object" }
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const completion = await response.json()
    const aiResponse = completion.choices[0]?.message?.content
    
    // Enhanced token tracking
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);

    // Calculate accurate costs
    const costs = calculateCosts(inputTokens, outputTokens, modelType);

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse and clean response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      // Simple fallback for parse errors
      console.error('JSON parse error:', parseError);
      parsedResponse = {
        narration: `${character.name} steps into the world of ${story.title}, where the very air seems to shimmer with literary magic. The landscape unfolds around them with the rich detail and captivating atmosphere that has made ${story.author}'s work beloved by readers for generations. Characters from the story move about their world, unaware that a new presence has joined their narrative - one whose choices and actions will create a unique path through this timeless tale.`,
        suggested_actions: [
          { id: "explore", text: "Look around and take in your surroundings", type: "exploration" },
          { id: "approach", text: "Approach the nearest character", type: "dialogue" },
          { id: "observe", text: "Watch and listen before acting", type: "observation" }
        ],
        memory_updates: [
          {
            id: "opening",
            description: `${character.name} begins their adventure in ${story.title}`,
            importance: "medium",
            characters_involved: [character.name],
            tags: ["beginning", "arrival"]
          }
        ],
        world_state: {
          current_location: `Opening scene of ${story.title}`,
          time_of_day: "morning",
          present_npcs: [],
          mood_atmosphere: "A new adventure begins"
        }
      };
    }

    // Light cleaning of the narration field
    if (parsedResponse.narration) {
      const originalNarration = parsedResponse.narration;
      const cleanedNarration = cleanNarrativeText(originalNarration);
      
      // Only use cleaned version if original had JSON artifacts AND cleaning improved it
      if (originalNarration !== cleanedNarration && cleanedNarration.length > 100) {
        parsedResponse.narration = cleanedNarration;
      }
    }

    // Ensure all required fields exist
    if (!parsedResponse.suggested_actions || !Array.isArray(parsedResponse.suggested_actions)) {
      parsedResponse.suggested_actions = [
        { id: "explore", text: "Look around and explore", type: "exploration" },
        { id: "greet", text: "Introduce yourself", type: "dialogue" },
        { id: "observe", text: "Observe your surroundings", type: "observation" }
      ];
    }

    if (!parsedResponse.memory_updates) {
      parsedResponse.memory_updates = [
        {
          id: "opening",
          description: `${character.name} begins their adventure in ${story.title}`,
          importance: "medium",
          characters_involved: [character.name],
          tags: ["beginning"]
        }
      ];
    }

    if (!parsedResponse.world_state) {
      parsedResponse.world_state = {
        current_location: `Opening scene of ${story.title}`,
        time_of_day: "morning",
        present_npcs: [],
        mood_atmosphere: "A new adventure begins"
      };
    }

    // Calculate initial context usage for opening scene
    const maxTokens = 128000; // gpt-4o-mini context window
    const systemPromptTokens = estimateTokens(systemPrompt);
    const narrationTokens = estimateTokens(parsedResponse.narration);
    const initialTokens = systemPromptTokens + narrationTokens + totalTokens;
    
    const contextUsage = {
      currentTokens: initialTokens,
      maxTokens: maxTokens,
      percentage: (initialTokens / maxTokens) * 100,
      compressionOccurred: false,
      lastMessageTokens: totalTokens,
      messagesInHistory: 1, // Just the opening scene
      nextCompressionAt: Math.ceil(maxTokens * 0.7), // 70% threshold
      tokensUntilCompression: Math.max(0, Math.ceil(maxTokens * 0.7) - initialTokens)
    };

    const result = {
      response: {
        narration: parsedResponse.narration,
        npcs: parsedResponse.world_state.present_npcs || [],
        scene_description: parsedResponse.world_state.current_location || `Opening scene of ${story.title}`,
        suggested_actions: parsedResponse.suggested_actions,
        memory_updates: parsedResponse.memory_updates,
        world_state: parsedResponse.world_state,
        context_usage: Math.round(contextUsage.percentage)
      },
      tokensUsed: totalTokens,
      contextUsage: contextUsage,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        modelType,
        responseTime,
        costs
      }
    }

    console.log('Opening scene generated with context tracking:', {
      initialTokens,
      percentage: contextUsage.percentage.toFixed(1) + '%',
      tokensUntilCompression: contextUsage.tokensUntilCompression
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in generate-opening-scene:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})