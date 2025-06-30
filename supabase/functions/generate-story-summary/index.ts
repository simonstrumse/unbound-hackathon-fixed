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
  memoryEvents?: any[];
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now();
    
    const { story, character, conversationHistory, memoryEvents = [] }: RequestBody = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Build memory context
    const memoryText = memoryEvents.length > 0 
      ? `\n\nKEY EVENTS FROM THE ADVENTURE:\n${memoryEvents
          .filter(m => m.importance === 'high' || m.importance === 'medium')
          .map(m => `- ${m.description}`)
          .join('\n')}`
      : '';

    const systemPrompt = `You are creating a personalized summary of a completed interactive story experience.

STORY DETAILS:
- Original Work: "${story.title}" by ${story.author}
- Player Character: ${character.name}
- Character Traits: ${character.personality_traits?.join(', ') || 'Not specified'}

${memoryText}

INSTRUCTIONS:
Create a compelling 2-3 paragraph summary that:
1. Celebrates the player's unique journey and choices
2. Highlights key relationships formed and challenges overcome
3. Explains how their story connected to or diverged from the original work
4. Uses the player's character name throughout
5. Feels personal and meaningful to their specific adventure

Write in an engaging, literary style that makes the player feel proud of their journey.`;

    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Create a summary for ${character.name}'s adventure in ${story.title}. Base it on their conversation history and the key events that occurred.` 
      }
    ];

    const modelType = 'gpt-4o-mini'; // Always use gpt-4o-mini as specified

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelType,
        messages,
        max_tokens: 400,
        temperature: 0.7
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const completion = await response.json()
    const summary = completion.choices[0]?.message?.content || `${character.name} completed their adventure in ${story.title}, creating a unique and memorable journey through this beloved literary world.`
    
    // Enhanced token tracking
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);

    // Calculate accurate costs
    const costs = calculateCosts(inputTokens, outputTokens, modelType);

    const result = { 
      summary, 
      tokensUsed: totalTokens,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        modelType,
        responseTime,
        costs
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in generate-story-summary:', error)
    const fallbackResult = { 
      summary: `${req.body?.character?.name || 'The player'} completed their adventure, creating a unique and memorable journey through this beloved literary world.`, 
      tokensUsed: 0,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        modelType: 'gpt-4o-mini',
        responseTime: 0,
        costs: { inputCost: 0, outputCost: 0, totalCost: 0 }
      }
    }
    return new Response(JSON.stringify(fallbackResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})