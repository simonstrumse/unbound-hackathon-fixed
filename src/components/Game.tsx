import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  Book,
  User,
  X,
  Info,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Clock,
  Zap,
  Heart,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { supabase, StorySession, Story, Character, Message } from '../lib/supabase';
import { openaiService, ConversationMessage } from '../lib/openai';
import { cleanStoryContent } from '../lib/contentCleaner';
import ContextProgressBar from '../components/ContextProgressBar';
import EnhancedExportModal from '../components/EnhancedExportModal';
import CompletionScreen from '../components/CompletionScreen';
import { MemoryEvent } from '../lib/types';
import AutoSaveIndicator from './AutoSaveIndicator';

const Game: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, profile } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const [session, setSession] = useState<StorySession | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memoryEvents, setMemoryEvents] = useState<MemoryEvent[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showStoryInfo, setShowStoryInfo] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [summary, setSummary] = useState('');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [relationships, setRelationships] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const generatingResponseRef = useRef<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLeftSidebar, setShowLeftSidebar] = useState(!isMobile);
  const [showRightSidebar, setShowRightSidebar] = useState(!isMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowLeftSidebar(true);
        setShowRightSidebar(true);
      } else {
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onSendMessage: () => {
      if (inputValue.trim() && !processing) {
        handleSendMessage();
      }
    },
    onEscape: () => {
      // Close any open modals or sidebars
      if (showStoryInfo) setShowStoryInfo(false);
      if (showExportModal) setShowExportModal(false);
      if (isMobile) {
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      }
    },
  });

  // Initial data loading
  useEffect(() => {
    if (sessionId) {
      loadInitialData();
    }
  }, [sessionId]);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track conversation time
  useEffect(() => {
    if (session && !timeStarted) {
      setTimeStarted(new Date(session.created_at));
    }
  }, [session]);

  // Extract relationships from messages
  useEffect(() => {
    const extractRelationships = () => {
      const relationshipMap = new Map();

      messages.forEach(message => {
        if (message.metadata?.relationship_updates && Array.isArray(message.metadata.relationship_updates)) {
          message.metadata.relationship_updates.forEach((relation: any) => {
            if (relation.character_name && relation.relationship_type) {
              relationshipMap.set(relation.character_name, {
                ...relation,
                last_updated: message.created_at
              });
            }
          });
        }
      });

      return Array.from(relationshipMap.values());
    };

    const updatedRelationships = extractRelationships();
    setRelationships(updatedRelationships);
  }, [messages]);

  // Handle retry button
  const handleRetry = () => {
    if (sessionId) {
      setError(null);
      loadInitialData();
    }
  };

  // Load all required data
  const loadInitialData = async () => {
    if (!sessionId) return;

    try {
      setLoadingSession(true);
      setError(null);

      // First fetch the session
      const { data: sessionData, error: sessionError } = await supabase
        .from('story_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Session not found');

      setSession(sessionData);

      // Then fetch the story
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', sessionData.story_id)
        .single();

      if (storyError) throw storyError;
      setStory(storyData);

      // Then fetch the character
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', sessionData.player_character_id)
        .single();

      if (characterError) throw characterError;
      setCharacter(characterData);

      // Finally load messages
      await loadMessages();

      // Initialize memory events from the messages
      extractMemoryEvents();

    } catch (err) {
      console.error('Error loading session data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session data';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoadingSession(false);
    }
  };

  // Load messages for the session
  const loadMessages = async () => {
    if (!sessionId) return;

    try {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      
      // If no messages and we have story/character, generate opening scene
      if (data?.length === 0 && story && character) {
        await generateOpeningScene();
      }
      
      // If already enough messages, update the context usage
      if (data && data.length > 0) {
        const totalTokens = session?.session_state?.context_tokens_used || 0;
        setTokensUsed(totalTokens);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Extract memory events from messages
  const extractMemoryEvents = () => {
    const events: MemoryEvent[] = [];
    
    messages.forEach(message => {
      if (message.metadata?.memory_updates && Array.isArray(message.metadata.memory_updates)) {
        message.metadata.memory_updates.forEach((memory: any) => {
          events.push({
            id: memory.id || `mem-${Math.random().toString(36).substring(7)}`,
            description: memory.description,
            importance: memory.importance || 'medium',
            timestamp: message.created_at,
            characters_involved: memory.characters_involved || [],
            tags: memory.tags || []
          });
        });
      }
    });
    
    setMemoryEvents(events);
  };

  // Generate opening scene
  const generateOpeningScene = async () => {
    if (!story || !character || !session) return;
    
    try {
      setProcessing(true);
      generatingResponseRef.current = true;

      // Map creativity level
      const creativityLevel = 
        session.creativity_level === 'faithful' ? 1 :
        session.creativity_level === 'creative' ? 3 : 2;

      // Generate the opening scene
      const { response, tokensUsed: tokens, usage } = await openaiService.generateOpeningScene(
        story,
        character,
        creativityLevel
      );

      // Create system message for the opening scene
      const systemMessage = {
        session_id: sessionId,
        character_id: character.id,
        content: cleanStoryContent(response.narration),
        message_type: 'system',
        metadata: {
          scene_description: response.scene_description,
          npcs: response.npcs,
          suggested_actions: response.suggested_actions,
          memory_updates: response.memory_updates,
          world_state: response.world_state,
          tokens_used: tokens
        },
        created_at: new Date().toISOString()
      };

      // Insert the opening scene message
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert(systemMessage)
        .select()
        .single();

      if (messageError) throw messageError;

      // Update session state with token usage
      const { error: updateError } = await supabase
        .from('story_sessions')
        .update({
          session_state: {
            ...session.session_state,
            context_tokens_used: tokens,
            last_update: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Track API usage
      if (usage) {
        await trackApiUsage({
          tokens: usage.totalTokens,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          responseTime: usage.responseTime,
          modelType: usage.modelType,
          operationType: 'opening_scene',
          inputCost: usage.costs.inputCost,
          outputCost: usage.costs.outputCost,
          totalCost: usage.costs.totalCost
        });
      }

      // Update the messages state
      setMessages([newMessage]);
      
      // Update token count
      setTokensUsed(tokens);
      
      // Extract initial memory events
      if (response.memory_updates) {
        const initialEvents: MemoryEvent[] = response.memory_updates.map(mem => ({
          id: mem.id,
          description: mem.description,
          importance: mem.importance as 'low' | 'medium' | 'high',
          timestamp: newMessage.created_at,
          characters_involved: mem.characters_involved,
          tags: mem.tags
        }));
        
        setMemoryEvents(initialEvents);
      }

      // Update local session state
      setSession(prev => prev ? {
        ...prev,
        session_state: {
          ...prev.session_state,
          context_tokens_used: tokens,
          last_update: new Date().toISOString()
        }
      } : null);

    } catch (err) {
      console.error('Error generating opening scene:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to generate opening scene';
      
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      
      // Create a fallback message if all else fails
      if (sessionId && character) {
        try {
          const fallbackMessage = {
            session_id: sessionId,
            character_id: character.id,
            content: `Welcome to ${story?.title}. As ${character.name}, you're about to embark on an adventure through this classic tale. What would you like to do first?`,
            message_type: 'system',
            metadata: {},
            created_at: new Date().toISOString()
          };
          
          const { data: newMessage } = await supabase
            .from('messages')
            .insert(fallbackMessage)
            .select()
            .single();
            
          if (newMessage) {
            setMessages([newMessage]);
          }
        } catch (fallbackError) {
          console.error('Even fallback message failed:', fallbackError);
        }
      }
    } finally {
      setProcessing(false);
      generatingResponseRef.current = false;
    }
  };

  // Handle sending a user message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !session || !character || !story || processing) return;
    
    const userMessageContent = inputValue.trim();
    setInputValue('');

    try {
      setProcessing(true);
      generatingResponseRef.current = true;

      // First, add the user message to local state for immediate feedback
      const userMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID
        session_id: sessionId!,
        character_id: character.id,
        content: userMessageContent,
        message_type: 'user',
        metadata: {},
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Then send it to Supabase
      const { data: newUserMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          character_id: character.id,
          content: userMessageContent,
          message_type: 'user',
          metadata: {},
        })
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Replace temporary user message with the real one
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? newUserMessage : msg
      ));

      // Map creativity level
      const creativityLevel = 
        session.creativity_level === 'faithful' ? 1 :
        session.creativity_level === 'creative' ? 3 : 2;

      // Prepare conversation history for the AI
      const conversationHistory: ConversationMessage[] = messages.map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add the new user message to the history
      conversationHistory.push({
        role: 'user',
        content: userMessageContent
      });

      // Generate AI response
      const { response, tokensUsed: tokens, usage } = await openaiService.continueConversation(
        story,
        character,
        conversationHistory,
        userMessageContent,
        creativityLevel,
        memoryEvents,
        {},
        relationships
      );

      // Create AI response message
      const aiResponseMessage = {
        session_id: sessionId,
        character_id: character.id,
        content: cleanStoryContent(response.response),
        message_type: 'character',
        metadata: {
          suggested_actions: response.suggested_actions,
          memory_updates: response.memory_updates,
          world_state_updates: response.world_state_updates,
          relationship_updates: response.relationship_updates,
          tokens_used: tokens
        },
        created_at: new Date().toISOString()
      };

      // Insert the AI response message
      const { data: newAiMessage, error: aiMessageError } = await supabase
        .from('messages')
        .insert(aiResponseMessage)
        .select()
        .single();

      if (aiMessageError) throw aiMessageError;

      // Update session state with token usage
      const newTokenTotal = (session.session_state?.context_tokens_used || 0) + tokens;
      
      const { error: updateError } = await supabase
        .from('story_sessions')
        .update({
          session_state: {
            ...session.session_state,
            context_tokens_used: newTokenTotal,
            last_update: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Update the local state
      setMessages(prev => [...prev, newAiMessage]);
      setTokensUsed(newTokenTotal);

      // Track API usage
      if (usage) {
        await trackApiUsage({
          tokens: usage.totalTokens,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          responseTime: usage.responseTime,
          modelType: usage.modelType,
          operationType: 'continue_conversation',
          inputCost: usage.costs.inputCost,
          outputCost: usage.costs.outputCost,
          totalCost: usage.costs.totalCost
        });
      }

      // Update memory events
      if (response.memory_updates && Array.isArray(response.memory_updates)) {
        const newEvents: MemoryEvent[] = response.memory_updates.map(mem => ({
          id: mem.id || `mem-${Math.random().toString(36).substring(7)}`,
          description: mem.description,
          importance: mem.importance as 'low' | 'medium' | 'high',
          timestamp: newAiMessage.created_at,
          characters_involved: mem.characters_involved || [],
          tags: mem.tags || []
        }));
        
        setMemoryEvents(prev => [...prev, ...newEvents]);
      }

      // Update relationships
      if (response.relationship_updates && Array.isArray(response.relationship_updates)) {
        const updatedRelationships = [...relationships];
        
        response.relationship_updates.forEach(update => {
          const existingIndex = updatedRelationships.findIndex(r => 
            r.character_name === update.character_name);
            
          if (existingIndex >= 0) {
            updatedRelationships[existingIndex] = {
              ...updatedRelationships[existingIndex],
              ...update,
              last_updated: newAiMessage.created_at
            };
          } else {
            updatedRelationships.push({
              ...update,
              last_updated: newAiMessage.created_at
            });
          }
        });
        
        setRelationships(updatedRelationships);
      }

      // Update local session state
      setSession(prev => prev ? {
        ...prev,
        session_state: {
          ...prev.session_state,
          context_tokens_used: newTokenTotal,
          last_update: new Date().toISOString()
        }
      } : null);

      // Focus back on input
      inputRef.current?.focus();

    } catch (err) {
      console.error('Error in conversation:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to generate response';
      
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      
      // Add a fallback AI message if the real one failed
      try {
        const fallbackMessage = {
          session_id: sessionId!,
          character_id: character.id,
          content: "I'm sorry, I couldn't process that properly. Could you try again or phrase it differently?",
          message_type: 'character',
          metadata: {},
          created_at: new Date().toISOString()
        };
        
        const { data: fallbackResponse } = await supabase
          .from('messages')
          .insert(fallbackMessage)
          .select()
          .single();
          
        if (fallbackResponse) {
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } catch (fallbackError) {
        console.error('Even fallback message failed:', fallbackError);
      }
    } finally {
      setProcessing(false);
      generatingResponseRef.current = false;
    }
  };

  // Track API usage
  const trackApiUsage = async ({
    tokens,
    inputTokens,
    outputTokens,
    responseTime,
    modelType,
    operationType,
    inputCost,
    outputCost,
    totalCost
  }: {
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    responseTime: number;
    modelType: string;
    operationType: string;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  }) => {
    if (!user || !sessionId) return;
    
    try {
      await supabase
        .from('api_usage')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          tokens_used: tokens,
          api_provider: 'openai',
          operation_type: operationType,
          model_type: modelType,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          response_time_ms: responseTime,
          input_cost: inputCost,
          output_cost: outputCost,
          total_cost: totalCost
        });
    } catch (err) {
      console.error('Error tracking API usage:', err);
      // Non-fatal error - don't show to user
    }
  };

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  // Auto-grow textarea
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  // Export the conversation
  const handleExportConversation = () => {
    setShowExportModal(true);
  };

  // End the story
  const handleEndStory = async () => {
    if (!session || !sessionId || !character || !story) return;
    
    try {
      setSaveStatus('saving');
      
      // Convert messages to conversation format
      const conversationHistory: ConversationMessage[] = messages.map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Generate summary
      const { summary: storySummary, tokensUsed: summaryTokens, usage } = 
        await openaiService.generateStorySummary(story, character, conversationHistory, memoryEvents);
      
      // Mark session as inactive
      const { error: updateError } = await supabase
        .from('story_sessions')
        .update({
          is_active: false,
          session_state: {
            ...session.session_state,
            completed: true,
            completion_summary: storySummary,
            context_tokens_used: (session.session_state?.context_tokens_used || 0) + summaryTokens,
            completion_date: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      
      // Track API usage for summary
      if (usage) {
        await trackApiUsage({
          tokens: usage.totalTokens,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          responseTime: usage.responseTime,
          modelType: usage.modelType,
          operationType: 'generate_summary',
          inputCost: usage.costs.inputCost,
          outputCost: usage.costs.outputCost,
          totalCost: usage.costs.totalCost
        });
      }
      
      // Set data for completion screen
      setSummary(storySummary);
      setSaveStatus('saved');
      setReachedEnd(true);
      setShowCompletionScreen(true);
      
    } catch (err) {
      console.error('Error ending story:', err);
      setSaveStatus('error');
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to complete the story';
      
      showNotification(errorMessage, 'error');
    }
  };

  // Start a new game with the same character
  const handleNewGameSameCharacter = async () => {
    if (!session || !character || !story || !user) return;
    
    try {
      // Create a new session with the same character
      const { data: newSession, error: sessionError } = await supabase
        .from('story_sessions')
        .insert({
          user_id: user.id,
          story_id: story.id,
          player_character_id: character.id,
          creativity_level: session.creativity_level,
          session_state: { context_tokens_used: 0 },
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      
      // Navigate to the new session
      navigate(`/game/${newSession.id}`);
      
    } catch (err) {
      console.error('Error starting new game:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to start a new game';
      
      showNotification(errorMessage, 'error');
    }
  };

  // Calculate time played
  const getTimePlayed = (): string => {
    if (!timeStarted) return '0 minutes';
    
    const now = reachedEnd ? new Date(session?.updated_at || '') : new Date();
    const diffMs = now.getTime() - timeStarted.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
  };

  // Loading state
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading your adventure</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center max-w-xl mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Error Loading Session</h2>
          <p className="text-[#1A1A1A] mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleRetry} 
              className="typewriter-btn-primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <Link to="/dashboard" className="typewriter-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Session not found
  if (!session || !story || !character) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Session Not Found</h2>
          <p className="text-[#1A1A1A] mb-4">This adventure session doesn't exist or you don't have permission to view it.</p>
          <Link to="/dashboard" className="typewriter-btn">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Completion screen
  if (showCompletionScreen) {
    return (
      <CompletionScreen
        storyTitle={story.title}
        characterName={character.name}
        totalConversations={messages.filter(m => m.message_type === 'user').length}
        timePlayed={getTimePlayed()}
        keyDecisions={memoryEvents
          .filter(m => m.importance === 'high')
          .map(m => m.description)}
        summary={summary}
        onExport={handleExportConversation}
        onNewGameSameCharacter={handleNewGameSameCharacter}
      />
    );
  }

  // Get avatar color from character
  const avatarColorIndex = parseInt(character.avatar_url?.split('-')[1] || '0');
  
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col game-chat">
      {/* Header */}
      <header className="typewriter-header">
        <div className="max-w-full mx-auto px-2 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-1 sm:gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm">Back</span>
              </Link>
              
              <div className="flex items-center gap-2 ml-4">
                <div className="w-6 h-6 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {character.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[#1A1A1A]">{character.name}</span>
                  <span className="text-xs text-[#1A1A1A] hidden sm:block">in {story.title}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStoryInfo(!showStoryInfo)}
                className="typewriter-btn text-xs py-1 px-2"
                aria-label="Story Info"
                title="Story Info"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportConversation}
                className="typewriter-btn text-xs py-1 px-2"
                aria-label="Export"
                title="Export Conversation"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content - 3-column layout with sidebars */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div 
          className={`${
            showLeftSidebar ? 'w-64 border-r-2 border-[#1A1A1A]' : 'w-0'
          } bg-[#FAFAF8] transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
        >
          {showLeftSidebar && (
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {character.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#1A1A1A]">{character.name}</h3>
                    <p className="text-xs text-[#1A1A1A]">Your Character</p>
                  </div>
                </div>
                {isMobile && (
                  <button 
                    onClick={() => setShowLeftSidebar(false)}
                    className="text-[#1A1A1A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Traits */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <User className="w-4 h-4 text-[#1A1A1A]" />
                  <span className="text-xs font-medium text-[#1A1A1A]">Traits</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {character.personality_traits?.map((trait) => (
                    <span 
                      key={trait} 
                      className="px-2 py-1 text-xs bg-[#1A1A1A] text-[#FAFAF8]"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Conversations Count */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Conversations</span>
                  </div>
                  <span className="text-[#1A1A1A] text-sm font-medium">
                    {messages.filter(m => m.message_type === 'user').length}
                  </span>
                </div>
              </div>

              {/* Key Memories */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Key Memories</span>
                  </div>
                  <span className="flex items-center gap-1 text-[#1A1A1A] text-xs">
                    {memoryEvents.filter(m => m.importance === 'high').length}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {memoryEvents
                    .filter(memory => memory.importance === 'high')
                    .map((memory) => (
                      <div 
                        key={memory.id} 
                        className="border-l-2 border-[#1A1A1A] pl-2 py-1 text-xs text-[#1A1A1A] font-light"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="inline-block w-2 h-2 bg-[#1A1A1A]"></span>
                          <span className="uppercase text-xs">HIGH</span>
                        </div>
                        {memory.description}
                      </div>
                    ))}
                  
                  {memoryEvents.filter(m => m.importance === 'high').length === 0 && (
                    <p className="text-xs text-[#1A1A1A] italic font-light">No key memories yet</p>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Relationships</span>
                  </div>
                  <span className="flex items-center gap-1 text-[#1A1A1A] text-xs">
                    {relationships.length}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {relationships.map((rel, index) => (
                    <div 
                      key={index} 
                      className="border-l-2 border-[#1A1A1A] pl-2 py-1 text-xs text-[#1A1A1A] font-light"
                    >
                      <div className="font-medium">{rel.character_name}</div>
                      <div>{rel.relationship_type} • Trust: {rel.trust_level}%</div>
                    </div>
                  ))}
                  
                  {relationships.length === 0 && (
                    <p className="text-xs text-[#1A1A1A] italic font-light">No relationships formed yet</p>
                  )}
                </div>
              </div>
              
              <div className="mt-auto">
                <button
                  onClick={handleEndStory}
                  className="w-full typewriter-btn text-sm"
                >
                  End Story & Generate Summary
                </button>
              </div>
            </div>
          )}
          
          {/* Toggle button for mobile */}
          {isMobile && !showLeftSidebar && (
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="absolute top-16 left-0 bg-[#1A1A1A] text-[#FAFAF8] p-2 rounded-r"
              aria-label="Show character info"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-[#1A1A1A] text-lg loading-dots">Loading conversation</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center max-w-md">
                  <Book className="w-16 h-16 text-[#1A1A1A] mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">Starting Your Adventure</h3>
                  <p className="text-[#1A1A1A] font-light">
                    Your journey in {story.title} is about to begin. Please wait while we set the scene...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.message_type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.message_type !== 'user' && (
                      <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-md md:max-w-2xl p-4 ${
                        message.message_type === 'user'
                          ? 'ml-12 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAFAF8]'
                          : 'mr-12 border-2 border-[#1A1A1A] bg-[#FAFAF8] text-[#1A1A1A]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed font-light">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2 font-mono">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {message.message_type === 'user' && (
                      <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {processing && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0 mt-1">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="max-w-md md:max-w-2xl p-4 mr-12 border-2 border-[#1A1A1A] bg-[#FAFAF8] text-[#1A1A1A]">
                      <p className="font-light loading-dots">Writing</p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Suggested actions */}
          {messages.length > 0 && !processing && (
            <div className="px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {messages[messages.length - 1]?.metadata?.suggested_actions?.slice(0, 3).map((action: any) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      setInputValue(action.text);
                      setTimeout(() => {
                        if (inputRef.current) {
                          inputRef.current.focus();
                          inputRef.current.style.height = 'auto';
                          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
                        }
                      }, 0);
                    }}
                    className="text-xs px-3 py-1 bg-[#E5E5E5] text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] transition-colors"
                  >
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="border-t-2 border-[#1A1A1A] p-4 bg-[#FAFAF8]">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onInput={handleTextareaInput}
                  placeholder={`What does ${character.name} do next?`}
                  className="w-full p-3 border-2 border-[#1A1A1A] resize-none bg-[#FAFAF8] text-[#1A1A1A] font-light"
                  style={{ minHeight: '2.5rem' }}
                  rows={1}
                  disabled={processing || loadingMessages}
                />
                <div className="absolute top-0 right-0 m-2">
                  <AutoSaveIndicator status={saveStatus} />
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || processing || loadingMessages}
                className="p-3 bg-[#1A1A1A] border-2 border-[#1A1A1A] text-[#FAFAF8] disabled:opacity-50"
              >
                {processing ? (
                  <span className="loading-dots">Sending</span>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-[#1A1A1A] font-light">
              <div className="flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1 py-0.5 border border-[#1A1A1A] text-[#1A1A1A]">Ctrl+Enter</kbd>
                <span>to send</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTimePlayed()}</span>
                </span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>{tokensUsed.toLocaleString()} tokens</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div 
          className={`${
            showRightSidebar ? 'w-64 border-l-2 border-[#1A1A1A]' : 'w-0'
          } bg-[#FAFAF8] transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
        >
          {showRightSidebar && (
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-[#1A1A1A]">Game Status</h3>
                {isMobile && (
                  <button 
                    onClick={() => setShowRightSidebar(false)}
                    className="text-[#1A1A1A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Context Usage */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <Activity className="w-4 h-4 text-[#1A1A1A]" />
                  <span className="text-xs font-medium text-[#1A1A1A]">Context Usage</span>
                </div>
                <div>
                  <div className="h-2 w-full bg-[#E5E5E5] border border-[#1A1A1A]">
                    <div 
                      className="h-full bg-[#1A1A1A]" 
                      style={{ 
                        width: `${Math.min((tokensUsed / 128000) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#1A1A1A] mt-1 font-mono">
                    <span>Context usage healthy</span>
                    <span>{Math.round((tokensUsed / 128000) * 100)}%</span>
                  </div>
                  <div className="text-xs text-[#1A1A1A] mt-1 font-mono">
                    {tokensUsed.toLocaleString()} / 128,000 tokens
                  </div>
                </div>
              </div>

              {/* Current Scene */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Book className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Current Scene</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-[#1A1A1A]" />
                </div>
                {messages.length > 0 && messages[0].metadata?.scene_description && (
                  <div className="text-xs text-[#1A1A1A] font-light">
                    <div className="mb-1">
                      <span className="font-medium">Time:</span> {messages[0].metadata.world_state?.time_of_day || 'unknown'}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">Mood:</span> {messages[0].metadata.world_state?.mood_atmosphere || 'unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {messages[0].metadata.scene_description}
                    </div>
                  </div>
                )}
              </div>

              {/* Characters Present */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Characters Present</span>
                  </div>
                  <span className="flex items-center gap-1 text-[#1A1A1A] text-xs">
                    {messages.length > 0 && messages[0].metadata?.npcs?.length || 0}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </div>
                {messages.length > 0 && messages[0].metadata?.npcs && (
                  <div>
                    {messages[0].metadata.npcs.map((npc: string, index: number) => (
                      <div key={index} className="text-xs text-[#1A1A1A] p-1 border-l-2 border-[#1A1A1A] mb-1 pl-2 font-light">
                        {npc}
                      </div>
                    ))}
                    {messages[0].metadata.npcs.length === 0 && (
                      <p className="text-xs text-[#1A1A1A] italic font-light">No characters present yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Story Freedom */}
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Story Freedom</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-[#1A1A1A]" />
                </div>

                {/* Creativity Level */}
                <div className="space-y-1 mb-4">
                  <div className={`p-2 text-xs border-2 ${session.creativity_level === 'faithful' ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAFAF8]' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}>
                    <div className="font-medium">Story-Focused</div>
                    <div className="text-xs font-light">Staying true to the original narrative</div>
                  </div>
                  
                  <div className={`p-2 text-xs border-2 ${session.creativity_level === 'balanced' ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAFAF8]' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}>
                    <div className="font-medium">Flexible Exploration</div>
                    <div className="text-xs font-light">Balanced adventure with creative possibilities</div>
                  </div>
                  
                  <div className={`p-2 text-xs border-2 ${session.creativity_level === 'creative' ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAFAF8]' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}>
                    <div className="font-medium">Open World</div>
                    <div className="text-xs font-light">Complete creative freedom</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Toggle button for mobile */}
          {isMobile && !showRightSidebar && (
            <button
              onClick={() => setShowRightSidebar(true)}
              className="absolute top-16 right-0 bg-[#1A1A1A] text-[#FAFAF8] p-2 rounded-l"
              aria-label="Show game info"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <EnhancedExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          messages={messages}
          storyTitle={story.title}
          characterName={character.name}
          memoryEvents={memoryEvents}
          totalConversations={messages.filter(m => m.message_type === 'user').length}
          storyPhase={reachedEnd ? 'complete' : 'ongoing'}
        />
      )}
    </div>
  );
};

export default Game;