import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Book, 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle, 
  Download,
  Users,
  Settings,
  BarChart3,
  MapPin,
  Clock,
  Zap,
  RefreshCw,
  Volume2,
  VolumeX,
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  User,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase, StorySession, Story, Character, Message } from '../lib/supabase';
import { openaiService, ConversationMessage } from '../lib/openai';
import { cleanStoryContent } from '../lib/contentCleaner';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSessionRecovery } from '../hooks/useSessionRecovery';
import ContextProgressBar from './ContextProgressBar';
import AutoSaveIndicator from './AutoSaveIndicator';
import EnhancedExportModal from './EnhancedExportModal';
import CompletionScreen from './CompletionScreen';

interface SessionWithDetails extends StorySession {
  story: Story;
  character: Character;
  messages?: Message[];
}

interface MemoryEvent {
  id: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  characters_involved: string[];
  tags: string[];
}

interface Relationship {
  character_name: string;
  relationship_type: string;
  trust_level: number;
  notes: string;
}

interface WorldState {
  current_location?: string;
  time_of_day?: string;
  present_npcs?: string[];
  mood_atmosphere?: string;
}

interface SuggestedAction {
  id: string;
  text: string;
  type: string;
}

const Game: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showNotification } = useNotifications();
  
  // Session recovery
  const { saveSessionState, checkForRecovery, clearRecoveryData } = useSessionRecovery(sessionId);

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [playerInput, setPlayerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  
  // Mobile responsive state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Advanced state
  const [memoryEvents, setMemoryEvents] = useState<MemoryEvent[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [worldState, setWorldState] = useState<WorldState>({});
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [contextTokens, setContextTokens] = useState(0);
  const [storyPhase, setStoryPhase] = useState<'beginning' | 'middle' | 'climax'>('beginning');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSendMessage: () => {
      if (playerInput.trim() && !sending) {
        handleSendMessage();
      }
    },
    onEscape: () => {
      setShowExportModal(false);
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  });

  // Initialize session
  useEffect(() => {
    if (sessionId && user) {
      fetchSession();
    }
  }, [sessionId, user]);

  // Auto-start story with opening scene if no messages exist
  useEffect(() => {
    if (session && session.story && session.character && messages.length === 0 && !loading && !error) {
      console.log('No messages found, auto-generating opening scene...');
      generateOpeningScene();
    }
  }, [session, messages.length, loading, error]);

  // Check for recovery data
  useEffect(() => {
    if (sessionId) {
      const recoveryData = checkForRecovery();
      if (recoveryData && recoveryData.playerInput) {
        setPlayerInput(recoveryData.playerInput);
        // Only show notification if there's substantial content
        if (recoveryData.playerInput.length > 20) {
          showNotification('Restored your previous input', 'info');
        }
      }
    }
  }, [sessionId, checkForRecovery, showNotification]);

  // Auto-save player input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if there's substantial input worth recovering
      if (playerInput.trim().length > 10 && sessionId) {
        saveSessionState({
          playerInput: playerInput.trim(),
          timestamp: Date.now()
        });
      }
    }, 2000); // Save after 2 seconds of no typing (reduced frequency)

    return () => clearTimeout(timeoutId);
  }, [playerInput, sessionId]);

  // Function to save session state to database
  const saveSessionStateToDb = async (updates: Partial<{
    memoryEvents: any[];
    relationships: any[];
    contextUsage: any;
    currentScene: string;
    charactersPresent: string[];
  }>) => {
    if (!session) return;
    
    try {
      // Create the complete session state object that will be saved
      const sessionStateToSave = {
        context_tokens_used: contextTokens,
        world_state: {
          current_location: worldState.current_location || 'Unknown location',
          present_npcs: worldState.present_npcs || [],
          mood_atmosphere: worldState.mood_atmosphere || 'A story unfolds',
          time_of_day: worldState.time_of_day || 'day'
        },
        memory_events: memoryEvents,
        relationships: relationships,
        last_updated: new Date().toISOString(),
        ...updates
      };

      console.log('🔍 SAVING SESSION STATE TO DATABASE:');
      console.log('Session ID:', session.id);
      console.log('Current Scene State:', worldState);
      console.log('Characters Present:', worldState.present_npcs);
      console.log('Complete session_state object being saved:', JSON.stringify(sessionStateToSave, null, 2));

      const { error } = await supabase
        .from('story_sessions')
        .update({
          session_state: sessionStateToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) {
        console.error('❌ ERROR SAVING SESSION STATE:', error);
        throw error;
      }

      console.log('✅ SESSION STATE SAVED SUCCESSFULLY');
      // Update local session object
      setSession(prev => prev ? { ...prev, session_state: sessionStateToSave } : null);
    } catch (error) {
      console.error('Error saving session state:', error);
      console.log('❌ SAVE FAILED - Current state was:', {
        worldState,
        memoryEvents: memoryEvents.length,
        relationships: relationships.length
      });
    }
  };

  const fetchSession = async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 LOADING SESSION DATA FROM DATABASE:');
      console.log('Session ID:', sessionId);

      // Fetch session with story and character details
      const { data: sessionData, error: sessionError } = await supabase
        .from('story_sessions')
        .select(`
          *,
          stories:story_id (*),
          characters:player_character_id (*)
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError) {
        console.error('❌ ERROR LOADING SESSION:', sessionError);
        throw new Error('Session not found or access denied');
      }

      if (!sessionData) {
        console.error('❌ NO SESSION DATA FOUND');
        throw new Error('Session not found');
      }

      console.log('📦 RAW SESSION DATA FROM DATABASE:', JSON.stringify(sessionData, null, 2));
      console.log('📦 SESSION STATE OBJECT:', JSON.stringify(sessionData.session_state, null, 2));
      
      if (sessionData.session_state?.world_state) {
        console.log('🌍 WORLD STATE FOUND:', JSON.stringify(sessionData.session_state.world_state, null, 2));
      } else {
        console.log('❌ NO WORLD STATE FOUND IN SESSION DATA');
      }

      const sessionWithDetails: SessionWithDetails = {
        ...sessionData,
        story: Array.isArray(sessionData.stories) ? sessionData.stories[0] : sessionData.stories,
        character: Array.isArray(sessionData.characters) ? sessionData.characters[0] : sessionData.characters
      };

      setSession(sessionWithDetails);

      // Restore session state including memories, relationships, etc.
      const sessionState = sessionData.session_state || {};
      
      // Load world state from session_state
      const worldStateData = sessionState.world_state;
      console.log('🔄 LOADING WORLD STATE:', worldStateData);
      
      if (worldStateData) {
        console.log('✅ SETTING WORLD STATE TO:', worldStateData);
        setWorldState({
          current_location: worldStateData.current_location || 'Unknown location',
          mood_atmosphere: worldStateData.mood_atmosphere || 'A story unfolds',
          time_of_day: worldStateData.time_of_day || 'day',
          present_npcs: worldStateData.present_npcs || []
        });
        console.log('✅ CHARACTERS PRESENT SET TO:', worldStateData.present_npcs || []);
      } else {
        console.log('⚠️ NO WORLD STATE - USING DEFAULTS');
        setWorldState({
          current_location: 'Unknown location',
          mood_atmosphere: 'A story unfolds',
          time_of_day: 'day',
          present_npcs: []
        });
      }
      
      // Restore persistent states from session_state
      if (sessionState.memory_events) {
        setMemoryEvents(sessionState.memory_events);
        console.log('🧠 LOADING MEMORY EVENTS:', sessionState.memory_events.length, 'events');
      }
      
      if (sessionState.relationships) {
        setRelationships(sessionState.relationships);
        console.log('❤️ LOADING RELATIONSHIPS:', sessionState.relationships.length, 'relationships');
      }
      
      if (sessionState.context_tokens_used) {
        setContextTokens(sessionState.context_tokens_used);
        console.log('📊 LOADING CONTEXT USAGE:', sessionState.context_tokens_used, 'tokens');
      }

      console.log('✅ SESSION DATA LOADED SUCCESSFULLY');
      console.log('Final state after loading:');
      console.log('- World State will be:', worldStateData || 'defaults');
      console.log('- Memory Events:', sessionState.memory_events?.length || 0);
      console.log('- Relationships:', sessionState.relationships?.length || 0);

      // Fetch messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messageError) {
        console.error('Error fetching messages:', messageError);
        throw new Error('Failed to load conversation history');
      }

      setMessages(messageData || []);

      // Initialize context tokens based on message history
      const totalTokens = (messageData || []).reduce((sum, msg) => sum + (msg.metadata?.tokens || 0), 0);
      setContextTokens(totalTokens);

      // Determine story phase based on message count
      const messageCount = (messageData || []).length;
      if (messageCount < 10) {
        setStoryPhase('beginning');
      } else if (messageCount < 30) {
        setStoryPhase('middle');
      } else {
        setStoryPhase('climax');
      }

      console.log('Session loaded successfully');
    } catch (err) {
      console.error('Error loading session:', err);
      console.log('❌ COMPLETE LOAD FAILURE');
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateOpeningScene = async () => {
    if (!session || !user) return;

    try {
      setSending(true);
      console.log('Generating opening scene for story:', session.story.title);

      // Create opening prompt
      const openingPrompt = `Begin the interactive story "${session.story.title}" by ${session.story.author}. The player character is ${session.character.name}, described as: ${session.character.description || 'An adventurous character'}. Set the opening scene and introduce the character to the world. Make it engaging and immersive.`;

      // Prepare conversation history for AI
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'system',
          content: `You are facilitating an interactive story experience based on "${session.story.title}" by ${session.story.author}. The player character is ${session.character.name}, described as: ${session.character.description || 'An adventurous character'}. Personality traits: ${session.character.personality_traits?.join(', ') || 'Curious, brave'}. Start the story with an engaging opening scene.`
        },
        {
          role: 'user',
          content: openingPrompt
        }
      ];

      // Get creativity level
      const creativityLevel = session.creativity_level === 'faithful' ? 1 : 
                            session.creativity_level === 'creative' ? 3 : 2;

      // Call AI service
      const aiResponse = await openaiService.continueConversation(
        session.story,
        session.character,
        conversationHistory,
        openingPrompt,
        creativityLevel,
        [],
        {},
        []
      );

      // Clean and validate AI response
      const cleanedResponse = cleanStoryContent(aiResponse.response.response);
      const finalResponse = cleanedResponse || 'Your adventure begins as you step into a world of endless possibilities...';

      // Create AI message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        session_id: sessionId!,
        character_id: session.character.id,
        content: finalResponse,
        message_type: 'character',
        metadata: {
          tokens: aiResponse.tokensUsed,
          context_usage: aiResponse.response.context_usage,
          usage: aiResponse.usage,
          is_opening_scene: true
        },
        created_at: new Date().toISOString()
      };

      // Add AI message to UI
      setMessages([aiMessage]);

      // Save AI message to database
      const { error: aiMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId!,
          character_id: session.character.id,
          content: finalResponse,
          message_type: 'character',
          metadata: {
            tokens: aiResponse.tokensUsed,
            context_usage: aiResponse.response.context_usage,
            usage: aiResponse.usage,
            is_opening_scene: true
          }
        });

      if (aiMessageError) {
        console.error('Error saving opening scene:', aiMessageError);
      }

      // Update suggested actions
      if (aiResponse.response.suggested_actions) {
        setSuggestedActions(aiResponse.response.suggested_actions);
      }

      // Update context usage
      setContextTokens(aiResponse.tokensUsed);

      // Track API usage
      try {
        await supabase.from('api_usage').insert({
          user_id: user.id,
          session_id: sessionId,
          tokens_used: aiResponse.tokensUsed,
          input_tokens: aiResponse.usage?.inputTokens || 0,
          output_tokens: aiResponse.usage?.outputTokens || 0,
          model_type: aiResponse.usage?.modelType || 'gpt-4o-mini',
          response_time_ms: aiResponse.usage?.responseTime || 0,
          input_cost: aiResponse.usage?.costs?.inputCost || 0,
          output_cost: aiResponse.usage?.costs?.outputCost || 0,
          total_cost: aiResponse.usage?.costs?.totalCost || 0,
          api_provider: 'openai',
          operation_type: 'opening_scene'
        });
      } catch (apiError) {
        console.error('Failed to track API usage:', apiError);
      }

      console.log('Opening scene generated successfully');
    } catch (err) {
      console.error('Error generating opening scene:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate opening scene';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleStoryFreedomChange = async (newLevel: string) => {
    if (!session) return;

    try {
      // Map string to creativity level
      const creativityLevel = newLevel === 'Story-Focused' ? 'faithful' : 
                            newLevel === 'Open World' ? 'creative' : 'balanced';

      const { error } = await supabase
        .from('story_sessions')
        .update({ 
          creativity_level: creativityLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, creativity_level: creativityLevel } : null);
      showNotification(`Story freedom changed to ${newLevel}`, 'success');
    } catch (err) {
      console.error('Error updating story freedom:', err);
      showNotification('Failed to update story freedom', 'error');
    }
  };

  const autoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        
        // Save current state
        saveSessionState({
          playerInput,
          timestamp: Date.now()
        });

        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 2000);
  }, [playerInput, saveSessionState]);

  useEffect(() => {
    if (playerInput) {
      autoSave();
    }
  }, [playerInput, autoSave]);

  const handleSendMessage = async () => {
    if (!playerInput.trim() || sending || !session || !user) return;

    const input = playerInput.trim();
    setPlayerInput('');
    setSending(true);
    setError(null);

    try {
      console.log('Sending message:', input);

      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        session_id: sessionId!,
        character_id: session.character.id,
        content: input,
        message_type: 'user',
        metadata: {},
        created_at: new Date().toISOString()
      };

      // Add to UI immediately for responsiveness
      setMessages(prev => [...prev, userMessage]);

      // Save user message to database
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId!,
          character_id: session.character.id,
          content: input,
          message_type: 'user',
          metadata: {}
        });

      if (userMessageError) {
        console.error('Error saving user message:', userMessageError);
      }

      // Prepare conversation history for AI
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'system',
          content: `You are facilitating an interactive story experience based on "${session.story.title}" by ${session.story.author}. The player character is ${session.character.name}, described as: ${session.character.description || 'An adventurous character'}. Personality traits: ${session.character.personality_traits?.join(', ') || 'Curious, brave'}. Respond as the story narrator and NPCs.`
        },
        ...messages.map(msg => ({
          role: msg.message_type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        })),
        {
          role: 'user',
          content: input
        }
      ];

      // Get creativity level
      const creativityLevel = session.creativity_level === 'faithful' ? 1 : 
                            session.creativity_level === 'creative' ? 3 : 2;

      // Call AI service
      console.log('Calling AI service...');
      const aiResponse = await openaiService.continueConversation(
        session.story,
        session.character,
        conversationHistory,
        input,
        creativityLevel,
        memoryEvents,
        worldState,
        relationships
      );

      console.log('AI response received:', aiResponse);

      // Clean and validate AI response
      const cleanedResponse = cleanStoryContent(aiResponse.response.response);
      const finalResponse = cleanedResponse || 'The story continues as your adventure unfolds in unexpected ways...';

      // Create AI message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        session_id: sessionId!,
        character_id: session.character.id,
        content: finalResponse,
        message_type: 'character',
        metadata: {
          tokens: aiResponse.tokensUsed,
          context_usage: aiResponse.response.context_usage,
          usage: aiResponse.usage
        },
        created_at: new Date().toISOString()
      };

      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message to database
      const { error: aiMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId!,
          character_id: session.character.id,
          content: finalResponse,
          message_type: 'character',
          metadata: {
            tokens: aiResponse.tokensUsed,
            context_usage: aiResponse.response.context_usage,
            usage: aiResponse.usage
          }
        });

      if (aiMessageError) {
        console.error('Error saving AI message:', aiMessageError);
      }

      // Update suggested actions
      if (aiResponse.response.suggested_actions) {
        setSuggestedActions(aiResponse.response.suggested_actions);
      }

      // Process AI response and update state
      const aiResponseData = aiResponse.response;
      
      console.log('🤖 AI RESPONSE RECEIVED:', {
        hasWorldStateUpdates: !!aiResponseData.world_state_updates,
        worldStateUpdates: aiResponseData.world_state_updates,
        currentSceneBefore: worldState
      });

      // Calculate ALL updated values ONCE and use them for both display and database
      
      // 1. Calculate updated world state
      const updatedWorldState = {
        ...worldState,
        ...aiResponseData.world_state_updates
      };
      
      // 2. Calculate updated memory events
      const newMemoryEvents = aiResponseData.memory_updates || [];
      const updatedMemoryEvents = [...memoryEvents, ...newMemoryEvents];
      
      // 3. Calculate updated relationships
      const newRelationshipUpdates = aiResponseData.relationship_updates || [];
      const updatedRelationships = [...relationships];
      
      // Apply relationship updates
      newRelationshipUpdates.forEach(update => {
        const existingIndex = updatedRelationships.findIndex(r => r.character_name === update.character_name);
        if (existingIndex >= 0) {
          updatedRelationships[existingIndex] = { ...updatedRelationships[existingIndex], ...update };
        } else {
          updatedRelationships.push(update);
        }
      });

      console.log('🔄 Updating React state with new values...');
      
      // Update React state with the calculated values
      setWorldState(updatedWorldState);
      setMemoryEvents(updatedMemoryEvents);
      setRelationships(updatedRelationships);

      // Save session with updated state - USE THE CALCULATED VALUES, NOT OLD STATE
      console.log('💾 Saving session with updated values to database...');
      console.log('📍 World state being saved:', updatedWorldState);
      console.log('🧠 Memory events being saved:', updatedMemoryEvents.length, 'events');
      console.log('❤️ Relationships being saved:', updatedRelationships.length, 'relationships');
      
      const updatedSessionState = {
        ...session.session_state,
        context_tokens_used: aiResponse.tokensUsed || 0,
        world_state: updatedWorldState,
        memory_events: updatedMemoryEvents, // Use calculated value
        relationships: updatedRelationships // Use calculated value
      };
      
      console.log('📦 Complete session_state being saved:', updatedSessionState);

      try {
        const { error: saveError } = await supabase
          .from('story_sessions')
          .update({
            session_state: updatedSessionState,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        if (saveError) {
          console.error('❌ Database save error:', saveError);
          throw saveError;
        }

        // Update local session state
        setSession(prev => prev ? { ...prev, session_state: updatedSessionState } : null);
        console.log('✅ Session saved successfully');
      } catch (saveError) {
        console.error('❌ Failed to save session:', saveError);
        showNotification('Failed to save progress', 'error');
      }

      // Update context usage
      const newContextTokens = contextTokens + aiResponse.tokensUsed;
      setContextTokens(newContextTokens);

      // Track API usage
      try {
        await supabase.from('api_usage').insert({
          user_id: user.id,
          session_id: sessionId,
          tokens_used: aiResponse.tokensUsed,
          input_tokens: aiResponse.usage?.inputTokens || 0,
          output_tokens: aiResponse.usage?.outputTokens || 0,
          model_type: aiResponse.usage?.modelType || 'gpt-4o-mini',
          response_time_ms: aiResponse.usage?.responseTime || 0,
          input_cost: aiResponse.usage?.costs?.inputCost || 0,
          output_cost: aiResponse.usage?.costs?.outputCost || 0,
          total_cost: aiResponse.usage?.costs?.totalCost || 0,
          api_provider: 'openai',
          operation_type: 'continue_conversation'
        });
      } catch (apiError) {
        console.error('Failed to track API usage:', apiError);
      }

      // Update session timestamp
      await supabase
        .from('story_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId!);

      // Clear recovery data on successful message
      clearRecoveryData();

    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      showNotification(errorMessage, 'error');

      // Remove the user message from UI if AI call failed
      setMessages(prev => prev.slice(0, -1));
      setPlayerInput(input); // Restore the input
    } finally {
      setSending(false);
    }
  };

  const handleSuggestedAction = (action: SuggestedAction) => {
    setPlayerInput(action.text);
    inputRef.current?.focus();
  };

  const handleCompleteStory = () => {
    setGameCompleted(true);
  };

  const handleExportStory = () => {
    setShowExportModal(true);
  };

  const getCreativityLevelDisplay = (level: string) => {
    switch (level) {
      case 'faithful': return 'Story-Focused';
      case 'creative': return 'Open World';
      default: return 'Flexible Exploration';
    }
  };

  const getCreativityDescription = (level: string) => {
    switch (level) {
      case 'faithful': return 'Staying true to the original narrative';
      case 'creative': return 'Complete creative freedom';
      default: return 'Balanced adventure with creative possibilities';
    }
  };

  const avatarColors = [
    'bg-gradient-to-br from-purple-500 to-pink-500',
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-green-500 to-teal-500',
    'bg-gradient-to-br from-orange-500 to-red-500',
    'bg-gradient-to-br from-indigo-500 to-purple-500',
    'bg-gradient-to-br from-emerald-500 to-blue-500',
    'bg-gradient-to-br from-rose-500 to-pink-500',
    'bg-gradient-to-br from-amber-500 to-orange-500'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Adventure Not Found</h2>
          <p className="text-purple-100 mb-4">{error}</p>
          <Link to="/stories" className="text-purple-300 hover:text-white transition-colors">
            ← Start a New Adventure
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">Session not found</p>
        </div>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <CompletionScreen
        storyTitle={session.story.title}
        characterName={session.character.name}
        totalConversations={messages.length}
        timePlayed="2h 15m" // Could be calculated from session timestamps
        keyDecisions={memoryEvents.filter(e => e.importance === 'high').map(e => e.description)}
        summary={`${session.character.name} completed their adventure in ${session.story.title}, creating a unique story filled with memorable moments and meaningful choices.`}
        onExport={handleExportStory}
        onNewGameSameCharacter={() => navigate('/stories')}
      />
    );
  }

  const avatarColorIndex = parseInt(session.character.avatar_url?.split('-')[1] || '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Mobile header */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-purple-200 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="text-center">
              <h1 className="text-lg font-serif font-bold text-white">{session.story.title}</h1>
              <p className="text-xs text-purple-200">by {session.story.author}</p>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="text-center">
              <h1 className="text-xl font-serif font-bold text-white">{session.story.title}</h1>
              <p className="text-sm text-purple-200">by {session.story.author}</p>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="flex items-center gap-2">
            <AutoSaveIndicator status={autoSaveStatus} />
            {/* Mobile info buttons */}
            <div className="flex lg:hidden gap-2">
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10">
            <div className="flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <button
                onClick={handleExportStory}
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors py-2"
              >
                <Download className="w-4 h-4" />
                Export Story
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Desktop */}
        <div className="hidden lg:block w-80 bg-white/5 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
          <div className="p-6">
            {/* Character Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center`}>
                  <span className="text-lg font-bold text-white">
                    {session.character.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{session.character.name}</h3>
                  <p className="text-purple-200 text-sm">Your Character</p>
                </div>
              </div>

              {session.character.personality_traits && session.character.personality_traits.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-purple-200 text-sm font-medium mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Traits
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {session.character.personality_traits.map((trait, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-500/20 text-purple-100 text-xs rounded-full"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Count */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <h4 className="text-purple-200 text-sm font-medium mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Conversations
              </h4>
              <p className="text-3xl font-bold text-white mb-1">{Math.floor(messages.length / 2)}</p>
              <p className="text-purple-200 text-sm">Messages exchanged</p>
            </div>

            {/* Key Memories */}
            {memoryEvents.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                <h4 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Key Memories
                  <span className="bg-purple-500/20 text-purple-100 text-xs px-2 py-1 rounded-full">
                    {memoryEvents.length}
                  </span>
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {memoryEvents.slice(-3).map((memory, index) => (
                    <div key={index} className="text-xs text-purple-100 bg-white/5 rounded p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          memory.importance === 'high' ? 'bg-red-400' :
                          memory.importance === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                        }`} />
                        <span className="text-purple-200 text-xs">
                          {memory.importance.toUpperCase()}
                        </span>
                      </div>
                      <p className="line-clamp-2">{memory.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relationships */}
            {relationships.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Relationships
                  <span className="bg-purple-500/20 text-purple-100 text-xs px-2 py-1 rounded-full">
                    {relationships.length}
                  </span>
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {relationships.map((rel, index) => (
                    <div key={index} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{rel.character_name}</span>
                        <span className="text-purple-200">{rel.trust_level}%</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          rel.relationship_type === 'friend' || rel.relationship_type === 'ally' ? 'bg-green-500/20 text-green-200' :
                          rel.relationship_type === 'enemy' || rel.relationship_type === 'suspicious' ? 'bg-red-500/20 text-red-200' :
                          'bg-gray-500/20 text-gray-200'
                        }`}>
                          {rel.relationship_type}
                        </span>
                      </div>
                      <p className="text-purple-100 line-clamp-1">{rel.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Book className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-purple-200 text-lg">Your adventure is about to begin...</p>
                <p className="text-purple-300 text-sm">Type your first action below to start the story!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.message_type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.message_type !== 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] lg:max-w-md p-4 rounded-xl ${
                      message.message_type === 'user'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-purple-100 border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.message_type === 'user' && (
                    <div className={`w-8 h-8 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-sm font-bold text-white">
                        {session.character.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-purple-200 text-sm">Writing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedAction(action)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-purple-100 text-sm rounded-lg border border-white/10 transition-colors"
                  >
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/10">
            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-100 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-300 hover:text-red-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (playerInput.trim() && !sending) {
                      handleSendMessage();
                    }
                  }
                }}
                placeholder={`What does ${session.character.name} do next?`}
                className="flex-1 min-h-[80px] max-h-[200px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!playerInput.trim() || sending}
                className="self-end p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-purple-300">
              <span>Press Ctrl+Enter to send</span>
              <span>{playerInput.length}/500</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Desktop */}
        <div className="hidden lg:block w-80 bg-white/5 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
          <div className="p-6">
            {/* Adventure Stats */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Adventure Stats
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{Math.floor(messages.length / 2)}</p>
                  <p className="text-purple-200 text-sm">Conversations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{memoryEvents.length}</p>
                  <p className="text-purple-200 text-sm">Memories</p>
                </div>
              </div>
            </div>

            {/* Story Freedom */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
              <h4 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Story Freedom
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="lg:hidden ml-auto text-purple-300 hover:text-white"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </h4>
              
              <div className="space-y-2">
                <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  session.creativity_level === 'faithful'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
                onClick={() => handleStoryFreedomChange('Story-Focused')}
                >
                  <div className="font-medium text-sm">Story-Focused</div>
                  <div className="text-xs opacity-75">Staying true to the original narrative</div>
                </div>
                
                <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  session.creativity_level === 'balanced'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
                onClick={() => handleStoryFreedomChange('Flexible Exploration')}
                >
                  <div className="font-medium text-sm">Flexible Exploration</div>
                  <div className="text-xs opacity-75">Balanced adventure with creative possibilities</div>
                </div>
                
                <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  session.creativity_level === 'creative'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                }`}
                onClick={() => handleStoryFreedomChange('Open World')}
                >
                  <div className="font-medium text-sm">Open World</div>
                  <div className="text-xs opacity-75">Complete creative freedom</div>
                </div>
              </div>
            </div>

            {/* Context Usage */}
            <ContextProgressBar tokensUsed={contextTokens} className="mb-6" />

            {/* Current Scene */}
            {worldState.current_location && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                <h4 className="text-purple-200 text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Current Scene
                </h4>
                <p className="text-white text-sm mb-2">{worldState.current_location}</p>
                {worldState.time_of_day && (
                  <p className="text-purple-200 text-xs">Time: {worldState.time_of_day}</p>
                )}
                {worldState.mood_atmosphere && (
                  <p className="text-purple-200 text-xs">Mood: {worldState.mood_atmosphere}</p>
                )}
              </div>
            )}

            {/* Characters Present */}
            {worldState.present_npcs && worldState.present_npcs.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Characters Present
                  <span className="bg-purple-500/20 text-purple-100 text-xs px-2 py-1 rounded-full">
                    {worldState.present_npcs.length}
                  </span>
                </h4>
                <div className="space-y-2">
                  {worldState.present_npcs.map((npc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {npc.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white text-sm">{npc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Left Sidebar Overlay */}
      {leftSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setLeftSidebarOpen(false)} />
          <div className="w-80 bg-gradient-to-br from-purple-900/95 to-slate-900/95 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Character Info</h3>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  className="text-purple-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Character Info - Mobile */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center`}>
                    <span className="text-lg font-bold text-white">
                      {session.character.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{session.character.name}</h4>
                    <p className="text-purple-200 text-sm">Your Character</p>
                  </div>
                </div>

                {session.character.personality_traits && session.character.personality_traits.length > 0 && (
                  <div>
                    <h5 className="text-purple-200 text-sm font-medium mb-2">Traits</h5>
                    <div className="flex flex-wrap gap-1">
                      {session.character.personality_traits.map((trait, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-500/20 text-purple-100 text-xs rounded-full"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats - Mobile */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
                <h5 className="text-purple-200 text-sm font-medium mb-2">Stats</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-white">{Math.floor(messages.length / 2)}</p>
                    <p className="text-purple-200 text-xs">Conversations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{memoryEvents.length}</p>
                    <p className="text-purple-200 text-xs">Memories</p>
                  </div>
                </div>
              </div>

              {/* Key Memories - Mobile */}
              {memoryEvents.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
                  <h5 className="text-purple-200 text-sm font-medium mb-3">Key Memories</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {memoryEvents.slice(-5).map((memory, index) => (
                      <div key={index} className="text-xs text-purple-100 bg-white/10 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            memory.importance === 'high' ? 'bg-red-400' :
                            memory.importance === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          }`} />
                          <span className="text-purple-200 text-xs">
                            {memory.importance.toUpperCase()}
                          </span>
                        </div>
                        <p>{memory.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships - Mobile */}
              {relationships.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <h5 className="text-purple-200 text-sm font-medium mb-3">Relationships</h5>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {relationships.map((rel, index) => (
                      <div key={index} className="bg-white/10 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">{rel.character_name}</span>
                          <span className="text-purple-200 text-sm">{rel.trust_level}%</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full mb-2 ${
                          rel.relationship_type === 'friend' || rel.relationship_type === 'ally' ? 'bg-green-500/20 text-green-200' :
                          rel.relationship_type === 'enemy' || rel.relationship_type === 'suspicious' ? 'bg-red-500/20 text-red-200' :
                          'bg-gray-500/20 text-gray-200'
                        }`}>
                          {rel.relationship_type}
                        </span>
                        <p className="text-purple-100 text-xs">{rel.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Right Sidebar Overlay */}
      {rightSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setRightSidebarOpen(false)} />
          <div className="w-80 bg-gradient-to-br from-purple-900/95 to-slate-900/95 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Adventure Info</h3>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="text-purple-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Story Freedom - Mobile */}
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
                <h5 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Story Freedom
                </h5>
                
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    session.creativity_level === 'faithful'
                      ? 'bg-purple-500/20 border-purple-500/50 text-white'
                      : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                  }`}
                  onClick={() => handleStoryFreedomChange('Story-Focused')}
                  >
                    <div className="font-medium text-sm">Story-Focused</div>
                    <div className="text-xs opacity-75">Staying true to the original narrative</div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    session.creativity_level === 'balanced'
                      ? 'bg-purple-500/20 border-purple-500/50 text-white'
                      : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                  }`}
                  onClick={() => handleStoryFreedomChange('Flexible Exploration')}
                  >
                    <div className="font-medium text-sm">Flexible Exploration</div>
                    <div className="text-xs opacity-75">Balanced adventure with creative possibilities</div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    session.creativity_level === 'creative'
                      ? 'bg-purple-500/20 border-purple-500/50 text-white'
                      : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                  }`}
                  onClick={() => handleStoryFreedomChange('Open World')}
                  >
                    <div className="font-medium text-sm">Open World</div>
                    <div className="text-xs opacity-75">Complete creative freedom</div>
                  </div>
                </div>
              </div>

              {/* Context Usage - Mobile */}
              <div className="mb-4">
                <ContextProgressBar tokensUsed={contextTokens} />
              </div>

              {/* Current Scene - Mobile */}
              {worldState.current_location && (
                <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
                  <h5 className="text-purple-200 text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Current Scene
                  </h5>
                  <p className="text-white text-sm mb-2">{worldState.current_location}</p>
                  {worldState.time_of_day && (
                    <p className="text-purple-200 text-xs">Time: {worldState.time_of_day}</p>
                  )}
                  {worldState.mood_atmosphere && (
                    <p className="text-purple-200 text-xs">Mood: {worldState.mood_atmosphere}</p>
                  )}
                </div>
              )}

              {/* Characters Present - Mobile */}
              {worldState.present_npcs && worldState.present_npcs.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <h5 className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Characters Present
                  </h5>
                  <div className="space-y-2">
                    {worldState.present_npcs.map((npc, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {npc.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white text-sm">{npc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <EnhancedExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          messages={messages}
          storyTitle={session.story.title}
          characterName={session.character.name}
          memoryEvents={memoryEvents}
          totalConversations={Math.floor(messages.length / 2)}
          storyPhase={storyPhase}
        />
      )}
    </div>
  );
};

export default Game;