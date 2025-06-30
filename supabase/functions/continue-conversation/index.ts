import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  story: any;
  character: any;
  conversationHistory: ConversationMessage[];
  playerInput: string;
  creativityLevel: number;
  creativityPrompt?: string;
  storyPhasePrompt?: string;
  memoryContext?: any[];
  worldState?: any;
  relationships?: any[];
  sessionId?: string;
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

// Calculate total tokens in conversation history
function calculateConversationTokens(messages: ConversationMessage[]): number {
  return messages.reduce((total, message) => total + estimateTokens(message.content), 0);
}

// Intelligent context compression that preserves important moments
async function compressContextIntelligently(
  messages: ConversationMessage[], 
  keepRecentCount: number = 30,
  openaiApiKey: string,
  memoryContext: any[] = []
): Promise<{ compressedMessages: ConversationMessage[], compressionStats: any }> {
  if (messages.length <= keepRecentCount) {
    return { 
      compressedMessages: messages, 
      compressionStats: { 
        originalCount: messages.length, 
        compressedCount: messages.length, 
        tokensRemoved: 0,
        compressionRatio: 0
      }
    };
  }

  const systemMessage = messages[0]; // Always keep system message
  const recentMessages = messages.slice(-keepRecentCount);
  const messagesToCompress = messages.slice(1, -keepRecentCount);

  if (messagesToCompress.length === 0) {
    return { 
      compressedMessages: messages,
      compressionStats: { 
        originalCount: messages.length, 
        compressedCount: messages.length, 
        tokensRemoved: 0,
        compressionRatio: 0
      }
    };
  }

  // Identify key moments to preserve
  const keyMoments = [];
  const playerActions = [];
  
  for (let i = 0; i < messagesToCompress.length; i += 2) {
    const userMsg = messagesToCompress[i];
    const assistantMsg = messagesToCompress[i + 1];
    
    if (userMsg && userMsg.role === 'user') {
      // Preserve important player actions (longer messages, decision words)
      const hasDecisionWords = /\b(choose|decide|ask|tell|go|take|give|help|fight|run|stay|leave)\b/i.test(userMsg.content);
      const isLongMessage = userMsg.content.length > 100;
      
      if (hasDecisionWords || isLongMessage) {
        playerActions.push(`Player: ${userMsg.content}`);
        if (assistantMsg) {
          // Keep the response too if it seems important
          const assistantPreview = assistantMsg.content.substring(0, 200) + (assistantMsg.content.length > 200 ? '...' : '');
          keyMoments.push(`${userMsg.content} → ${assistantPreview}`);
        }
      }
    }
  }

  // Include memory context in compression prompt
  const memoryText = memoryContext.length > 0 
    ? `\n\nKey memories from the story: ${memoryContext.slice(-5).map(m => m.description).join('; ')}`
    : '';

  // Create intelligent compression prompt
  const compressionPrompt = `Summarize this conversation history while preserving ALL of these critical elements:

PRESERVE THESE KEY MOMENTS:
${keyMoments.slice(-10).join('\n')}

PRESERVE THESE PLAYER ACTIONS:  
${playerActions.slice(-15).join('\n')}
${memoryText}

CONVERSATION TO COMPRESS:
${messagesToCompress.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Create a detailed summary that:
1. Preserves all major player decisions and their consequences
2. Maintains key character interactions and relationships 
3. Keeps important plot developments and world state changes
4. Maintains the narrative flow and emotional beats
5. Preserves specific dialogue that was meaningful

Summary (be comprehensive but concise):`;

  try {
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at summarizing interactive story conversations while preserving all key narrative elements, player choices, and story progression.' 
          },
          { role: 'user', content: compressionPrompt }
        ],
        max_tokens: 800,
        temperature: 0.2
      }),
    });

    if (response.ok) {
      const completion = await response.json();
      const summary = completion.choices[0]?.message?.content || 'Previous conversation events occurred.';
      
      const originalTokens = calculateConversationTokens(messagesToCompress);
      const compressedTokens = estimateTokens(summary);
      
      // Create compressed context
      const compressedMessage: ConversationMessage = {
        role: 'system',
        content: `[STORY CONTEXT SUMMARY - ${messagesToCompress.length} messages compressed]\n${summary}`
      };

      const compressionStats = {
        originalCount: messages.length,
        compressedCount: [systemMessage, compressedMessage, ...recentMessages].length,
        tokensRemoved: originalTokens - compressedTokens,
        compressionRatio: ((originalTokens - compressedTokens) / originalTokens * 100).toFixed(1),
        messagesCompressed: messagesToCompress.length,
        keyMomentsPreserved: keyMoments.length,
        playerActionsPreserved: playerActions.length
      };

      console.log('Compression completed:', compressionStats);

      return { 
        compressedMessages: [systemMessage, compressedMessage, ...recentMessages],
        compressionStats
      };
    } else {
      console.error('Compression failed, keeping original messages');
      return { 
        compressedMessages: messages,
        compressionStats: { 
          originalCount: messages.length, 
          compressedCount: messages.length, 
          tokensRemoved: 0,
          compressionRatio: 0,
          error: 'Compression API failed'
        }
      };
    }
  } catch (error) {
    console.error('Error during compression:', error);
    return { 
      compressedMessages: messages,
      compressionStats: { 
        originalCount: messages.length, 
        compressedCount: messages.length, 
        tokensRemoved: 0,
        compressionRatio: 0,
        error: error.message
      }
    };
  }
}

// Get creativity-specific system prompt with distinct AI personalities
function getPromptForCreativityLevel(creativityLevel: number, story: any, character: any, contextText: string, relationshipText: string): string {
  const baseContext = `STORY: ${story.title} by ${story.author}
PLAYER CHARACTER: ${character.name} (${character.personality_traits?.join(', ') || 'adventurous'})${contextText}${relationshipText}`;

  switch (creativityLevel) {
    case 1: // Story-Focused - Urgent, plot-driving
      return `You are an URGENT, PLOT-DRIVEN storyteller maintaining the sacred narrative of ${story.title}.

${baseContext}

LEVEL 1 - STORY-FOCUSED PERSONALITY:
Your mission is to drive the canonical plot forward with PURPOSE and URGENCY. You are the guardian of ${story.author}'s vision.

BEHAVIORAL GUIDELINES:
• NPCs are PROACTIVE and PURPOSE-DRIVEN - they have agendas and push conversations toward plot goals
• Create NARRATIVE PRESSURE - time is limited, decisions matter, consequences loom
• Characters speak with CANONICAL VOICES - they sound exactly like ${story.author} wrote them
• REDIRECT wandering - if player strays from important plot, NPCs guide them back naturally
• Use DRAMATIC TENSION - raise stakes, create urgency, make every moment count
• NPCs have CLEAR MOTIVATIONS tied to the original story's themes and conflicts
• Reference CANONICAL EVENTS and foreshadow important story moments
• Create scenarios that MUST be resolved - NPCs won't let things slide

DIALOGUE STYLE: Formal, literary, true to ${story.author}'s original character voices
PACING: Brisk and purposeful - always moving toward meaningful story beats
NPC BEHAVIOR: Assertive, goal-oriented, they DRIVE conversations rather than just respond

Write 2-3 paragraphs that ADVANCE THE PLOT with urgency and canonical authenticity.`;

    case 2: // Flexible Exploration - Responsive and adaptive  
      return `You are a RESPONSIVE, ADAPTIVE storyteller balancing ${story.title}'s essence with player curiosity.

${baseContext}

LEVEL 2 - FLEXIBLE EXPLORATION PERSONALITY:
You are an empathetic guide who NOTICES and RESPONDS to what genuinely interests the player.

BEHAVIORAL GUIDELINES:
• NPCs are EMOTIONALLY INTELLIGENT - they pick up on player interests and adapt
• CREATE BRANCHING OPPORTUNITIES - offer multiple equally valid paths through the story
• Characters ACKNOWLEDGE player choices and build on their interests naturally
• BLEND canonical with creative - honor the original while exploring "what if" scenarios
• NPCs have LAYERED PERSONALITIES - they reveal different aspects based on player approach
• ENCOURAGE exploration while maintaining story coherence and character integrity
• CREATE MEANINGFUL CONNECTIONS between player actions and expanding story possibilities
• NPCs REMEMBER player preferences and reference them in future interactions

DIALOGUE STYLE: Natural, engaging, with hints of ${story.author}'s voice but modern accessibility
PACING: Player-driven - speed up for action lovers, slow down for character exploration
NPC BEHAVIOR: Perceptive, adaptive, they MIRROR and BUILD ON player energy and interests

Write 2-3 paragraphs that RESPOND TO player interests while advancing the narrative meaningfully.`;

    case 3: // Open World - "Yes, and" improv style
      return `You are a "YES, AND" IMPROV MASTER treating ${story.title} as your creative playground.

${baseContext}

LEVEL 3 - OPEN WORLD PERSONALITY:
You are a collaborative creative partner who says "YES, AND..." to ANY player idea, no matter how wild.

BEHAVIORAL GUIDELINES:
• EMBRACE EVERYTHING - player wants to turn Darcy into a time traveler? "YES, AND here's how..."
• NPCs are MAXIMALLY SUPPORTIVE - they go along with player ideas and amplify them
• CREATE WILD POSSIBILITIES - blend genres, time periods, supernatural elements freely
• Characters EVOLVE DRAMATICALLY based on player interactions - they can become anyone
• REALITY IS FLEXIBLE - if player wants magic in a realistic story, magic EXISTS
• NPCs become CO-CONSPIRATORS in whatever adventure the player creates
• AMPLIFY player creativity - take their ideas and make them even more amazing
• NO LIMITS on character development, plot direction, or world-building changes

DIALOGUE STYLE: Enthusiastic, creative, boundlessly supportive of player vision
PACING: Explosive and dynamic - match and exceed player energy levels
NPC BEHAVIOR: Enabling, enthusiastic co-creators who help build the player's wildest dreams

Write 2-3 paragraphs that ENTHUSIASTICALLY EMBRACE whatever the player wants to create.`;

    default:
      return getPromptForCreativityLevel(2, story, character, contextText, relationshipText);
  }
}

// Simple, effective JSON cleaning function
function cleanNarrativeText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Only clean if there are obvious JSON artifacts
  if (cleaned.includes('"response"') || cleaned.includes('suggested_actions') || cleaned.includes('"narration"')) {
    // Remove JSON field patterns
    cleaned = cleaned.replace(/"(response|narration)"\s*:\s*"/g, '');
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

// Much simpler validation - only reject truly bad responses
function isResponseValid(response: string): boolean {
  if (!response || response.length < 50) return false;
  if (response.trim() === "The story continues...") return false;
  if (response.includes('"response"') || response.includes('suggested_actions')) return false;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now();
    
    const { 
      story, 
      character, 
      conversationHistory, 
      playerInput, 
      creativityLevel,
      memoryContext = [],
      worldState = {},
      relationships = [],
      sessionId
    }: RequestBody = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Enhanced context usage calculation
    const currentTokens = calculateConversationTokens(conversationHistory);
    const playerInputTokens = estimateTokens(playerInput);
    const totalInputTokens = currentTokens + playerInputTokens;
    
    const maxTokens = 128000; // gpt-4o-mini context window
    const tokenPercentage = totalInputTokens / maxTokens;
    const compressionThreshold = 0.7; // 70% threshold

    console.log(`Context analysis:`, {
      currentTokens,
      playerInputTokens,
      totalInputTokens,
      maxTokens,
      tokenPercentage: (tokenPercentage * 100).toFixed(1) + '%',
      compressionNeeded: tokenPercentage >= compressionThreshold
    });

    let processedHistory = conversationHistory;
    let compressionStats = null;

    // Intelligent context compression when threshold is reached
    if (tokenPercentage >= compressionThreshold) {
      console.log('Token threshold exceeded, performing intelligent compression...');
      const compressionResult = await compressContextIntelligently(
        conversationHistory, 
        30, 
        openaiApiKey, 
        memoryContext
      );
      
      processedHistory = compressionResult.compressedMessages;
      compressionStats = compressionResult.compressionStats;
      
      const newTokens = calculateConversationTokens(processedHistory);
      console.log(`Intelligent compression completed:`, {
        ...compressionStats,
        tokensBefore: currentTokens,
        tokensAfter: newTokens,
        spaceSaved: `${((currentTokens - newTokens) / currentTokens * 100).toFixed(1)}%`
      });
    }

    const creativityInstructions = {
      1: "Stay close to the original story. Maintain canonical characters and plot points.",
      2: "Allow moderate creative freedom while maintaining story coherence. Explore new scenarios that fit the world.",
      3: "Full creative freedom. The story can diverge significantly while maintaining character essences."
    };

    // Build enhanced context from memory and relationships
    const contextText = memoryContext.length > 0 
      ? `\n\nKey memories: ${memoryContext.slice(-5).map(m => m.description).join('; ')}`
      : '';

    const relationshipText = relationships.length > 0
      ? `\n\nCurrent relationships: ${relationships.map(r => `${r.character_name} (${r.relationship_type}, trust: ${r.trust_level}%)`).join('; ')}`
      : '';

    // Get creativity-level specific system prompt with distinct personality
    const creativityPrompt = getPromptForCreativityLevel(creativityLevel, story, character, contextText, relationshipText);
    
    const systemPrompt = `${creativityPrompt}

CRITICAL INSTRUCTIONS:
1. ALWAYS create relationship updates when ${character.name} interacts with named characters
2. Track trust levels that change based on player actions (start new characters at 50)
3. Generate meaningful memories for important story moments
4. Include rich narrative with character dialogue and interactions

CRITICAL: Your response must be valid JSON with these exact fields:
{
  "response": "Your 2-3 paragraph narrative text here",
  "suggested_actions": [
    {"id": "action1", "text": "Specific action option", "type": "dialogue"},
    {"id": "action2", "text": "Another specific option", "type": "exploration"},
    {"id": "action3", "text": "Third meaningful choice", "type": "action"}
  ],
  "memory_updates": [
    {"id": "mem1", "description": "Important event description", "importance": "medium", "characters_involved": ["${character.name}", "Other Character"], "tags": ["conversation", "discovery"]}
  ],
  "world_state_updates": {
    "current_location": "Location name",
    "present_npcs": ["Character names in scene"]
  },
  "relationship_updates": [
    {"character_name": "Character Name", "relationship_type": "friend/ally/neutral/suspicious/enemy", "trust_level": 65, "notes": "Brief description of relationship state"}
  ]
}

RELATIONSHIP RULES:
- Create relationship entry for EVERY named character ${character.name} interacts with
- Trust levels: 0-20 (hostile), 21-40 (unfriendly), 41-60 (neutral), 61-80 (friendly), 81-100 (close)
- Update existing relationships based on player choices
- Include relationship_type: ally, friend, neutral, suspicious, enemy, romantic
- Always include notes explaining the relationship

MEMORY RULES:
- Create memories for significant story moments, decisions, or discoveries
- Importance levels: low (minor events), medium (notable moments), high (major plot points)
- Include all characters involved in the memory
- Use relevant tags like: conversation, discovery, conflict, romance, decision

The "response" field should contain ONLY narrative story text - no JSON formatting within it.

REMEMBER: Stay true to your Level ${creativityLevel} personality throughout the response!`;

    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      ...processedHistory,
      { role: 'user', content: playerInput }
    ];

    const modelType = 'gpt-4o-mini'; // Always use gpt-4o-mini as specified

    console.log('Sending request to OpenAI with enhanced context management...');

    // Single API call with enhanced tracking
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelType,
        messages,
        max_tokens: 1500,
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

    console.log('Raw AI response:', aiResponse.substring(0, 200) + '...');

    // Parse and clean response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
      console.log('Parsed response structure:', {
        hasResponse: !!parsedResponse.response,
        hasMemoryUpdates: !!parsedResponse.memory_updates?.length,
        hasRelationshipUpdates: !!parsedResponse.relationship_updates?.length,
        memoryCount: parsedResponse.memory_updates?.length || 0,
        relationshipCount: parsedResponse.relationship_updates?.length || 0
      });
    } catch (parseError) {
      // Simple fallback for parse errors
      console.error('JSON parse error:', parseError);
      parsedResponse = {
        response: cleanNarrativeText(aiResponse) || `${character.name} continues their adventure in the world of ${story.title}, where every moment brings new discoveries and choices that shape their unique journey through this beloved literary landscape.`,
        suggested_actions: [
          { id: "continue", text: "Continue the conversation", type: "dialogue" },
          { id: "explore", text: "Look around", type: "exploration" },
          { id: "think", text: "Consider your options", type: "reflection" }
        ],
        memory_updates: [],
        world_state_updates: {},
        relationship_updates: []
      };
    }

    // Light cleaning of the response field
    if (parsedResponse.response) {
      const originalResponse = parsedResponse.response;
      const cleanedResponse = cleanNarrativeText(originalResponse);
      
      // Only use cleaned version if original had JSON artifacts
      if (originalResponse !== cleanedResponse && cleanedResponse.length > 100) {
        parsedResponse.response = cleanedResponse;
      }
      
      // Simple validation - only replace if truly problematic
      if (!isResponseValid(parsedResponse.response)) {
        parsedResponse.response = `The conversation deepens as ${character.name} finds themselves more immersed in the world of ${story.title}. Each exchange of words reveals new layers of this beloved story, creating a unique adventure that bridges the familiar narrative with fresh possibilities. The characters around them seem to come alive, offering glimpses into both the timeless themes of ${story.author}'s work and new paths yet to be explored.`;
      }
    }

    // Ensure suggested actions exist and have meaningful text
    if (!Array.isArray(parsedResponse.suggested_actions) || parsedResponse.suggested_actions.length === 0) {
      parsedResponse.suggested_actions = [
        { id: "dialogue", text: "Engage in conversation", type: "dialogue" },
        { id: "observe", text: "Observe your surroundings", type: "exploration" },
        { id: "act", text: "Take action", type: "action" }
      ];
    } else {
      // Only fix actions that are actually empty or problematic
      parsedResponse.suggested_actions = parsedResponse.suggested_actions.map((action, index) => {
        if (!action.text || action.text.trim().length === 0) {
          const fallbacks = ["Continue forward", "Look around", "Speak up", "Take action", "Wait and see"];
          return {
            ...action,
            id: action.id || `action-${index}`,
            type: action.type || "dialogue",
            text: fallbacks[index % fallbacks.length]
          };
        }
        return {
          ...action,
          id: action.id || `action-${index}`,
          type: action.type || "dialogue"
        };
      });
    }

    // Ensure arrays exist (don't modify them if they're already there)
    if (!Array.isArray(parsedResponse.memory_updates)) {
      parsedResponse.memory_updates = [];
    }
    if (!Array.isArray(parsedResponse.relationship_updates)) {
      parsedResponse.relationship_updates = [];
    }
    if (!parsedResponse.world_state_updates) {
      parsedResponse.world_state_updates = {};
    }

    // Calculate final context usage including this response
    const finalTokenCount = calculateConversationTokens(processedHistory) + totalTokens;
    const finalPercentage = (finalTokenCount / maxTokens) * 100;

    // Enhanced context usage tracking for session state
    const contextUsage = {
      currentTokens: finalTokenCount,
      maxTokens: maxTokens,
      percentage: finalPercentage,
      compressionOccurred: !!compressionStats,
      compressionStats: compressionStats,
      lastMessageTokens: totalTokens,
      messagesInHistory: processedHistory.length,
      nextCompressionAt: Math.ceil(maxTokens * compressionThreshold),
      tokensUntilCompression: Math.max(0, Math.ceil(maxTokens * compressionThreshold) - finalTokenCount)
    };

    console.log('Final response structure:', {
      responseLength: parsedResponse.response?.length || 0,
      memoryUpdates: parsedResponse.memory_updates?.length || 0,
      relationshipUpdates: parsedResponse.relationship_updates?.length || 0,
      suggestedActions: parsedResponse.suggested_actions?.length || 0,
      contextUsage: contextUsage
    });

    const result = {
      response: {
        response: parsedResponse.response,
        scene_update: parsedResponse.world_state_updates?.current_location,
        new_npcs: parsedResponse.world_state_updates?.present_npcs,
        suggested_actions: parsedResponse.suggested_actions,
        memory_updates: parsedResponse.memory_updates || [],
        world_state_updates: parsedResponse.world_state_updates || {},
        relationship_updates: parsedResponse.relationship_updates || [],
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

    console.log('Returning result with enhanced context tracking');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in continue-conversation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})