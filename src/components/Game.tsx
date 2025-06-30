import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Download, 
  Info, 
  X, 
  RefreshCw, 
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Users,
  MapPin,
  Clock,
  Loader2,
  User,
  Heart,
  MessageCircle,
  Calendar,
  Eye,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase, Message, Character, Story, StorySession } from '../lib/supabase';
import { openaiService } from '../lib/openai';
import { validateAndCleanContent } from '../lib/contentCleaner';
import { MemoryEvent, CharacterRelationship, WorldState } from '../lib/types';
import EnhancedExportModal from './EnhancedExportModal';
import ContextProgressBar from './ContextProgressBar';
import AutoSaveIndicator from './AutoSaveIndicator';

// Utility function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const Game: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showNotification } = useNotifications();
  
  // Core state
  const [session, setSession] = useState<StorySession | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state
  const [memoryEvents, setMemoryEvents] = useState<MemoryEvent[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [worldState, setWorldState] = useState<WorldState>({
    current_location: '',
    time_of_day: 'morning',
    present_npcs: [],
    mood_atmosphere: '',
    important_objects: []
  });
  
  // UI state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStoryInfo, setShowStoryInfo] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setLeftSidebarCollapsed(true);
        setRightSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Load session data
  useEffect(() => {
    if (!sessionId || !isValidUUID(sessionId)) {
      console.error('Invalid session ID:', sessionId);
      setError('Invalid session ID');
      setLoading(false);
      return;
    }

    if (!user) {
      console.log('No user found, redirecting to signin');
      navigate('/signin');
      return;
    }

    fetchSessionData();
  }, [sessionId, user, navigate]);

  const fetchSessionData = async () => {
    if (!sessionId || !user) return;

    try {
      console.log('Fetching session data for:', sessionId);
      setLoading(true);
      setError(null);

      // Fetch session with related data
      const { data: sessionData, error: sessionError } = await supabase
        .from('story_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        throw new Error('Session not found or access denied');
      }

      if (!sessionData) {
        throw new Error('Session not found');
      }

      console.log('Session data loaded:', sessionData);
      setSession(sessionData);

      // Extract world state from session
      if (sessionData.session_state?.world_state) {
        setWorldState(sessionData.session_state.world_state);
      }

      // Fetch story
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', sessionData.story_id)
        .single();

      if (storyError) {
        console.error('Error fetching story:', storyError);
        throw new Error('Story not found');
      }

      console.log('Story data loaded:', storyData);
      setStory(storyData);

      // Fetch character
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', sessionData.player_character_id)
        .single();

      if (characterError) {
        console.error('Error fetching character:', characterError);
        throw new Error('Character not found');
      }

      console.log('Character data loaded:', characterData);
      setCharacter(characterData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw new Error('Failed to load conversation history');
      }

      console.log('Messages loaded:', messagesData?.length || 0);
      setMessages(messagesData || []);

      // Load enhanced data from session state
      if (sessionData.session_state) {
        const state = sessionData.session_state;
        if (state.memory_events) setMemoryEvents(state.memory_events);
        if (state.relationships) setRelationships(state.relationships);
      }

    } catch (err) {
      console.error('Error in fetchSessionData:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session data';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !session || !story || !character) {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setAutoSaveStatus('saving');

    try {
      console.log('Sending message:', userMessage);

      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        session_id: sessionId!,
        character_id: character.id,
        content: userMessage,
        message_type: 'user',
        metadata: {},
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempUserMessage]);

      // Save user message to database
      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId!,
          character_id: character.id,
          content: userMessage,
          message_type: 'user',
          metadata: {}
        })
        .select()
        .single();

      if (userMessageError) {
        console.error('Error saving user message:', userMessageError);
        throw new Error('Failed to save your message');
      }

      // Update the temporary message with the real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempUserMessage.id ? savedUserMessage : msg
        )
      );

      // Prepare conversation history for AI
      const conversationHistory = [...messages, savedUserMessage].map(msg => ({
        role: msg.message_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // Get creativity level
      const creativityLevel = session.creativity_level === 'faithful' ? 1 : 
                             session.creativity_level === 'creative' ? 3 : 2;

      console.log('Calling AI service with creativity level:', creativityLevel);

      // Call AI service
      const aiResponse = await openaiService.continueConversation(
        story,
        character,
        conversationHistory,
        userMessage,
        creativityLevel,
        memoryEvents,
        worldState,
        relationships
      );

      console.log('AI response received:', aiResponse);

      // Clean the AI response
      const cleanedResponse = validateAndCleanContent(aiResponse.response.response);

      // Create system message
      const systemMessage: Message = {
        id: `temp-system-${Date.now()}`,
        session_id: sessionId!,
        character_id: character.id,
        content: cleanedResponse,
        message_type: 'character',
        metadata: {
          suggested_actions: aiResponse.response.suggested_actions || [],
          world_state_updates: aiResponse.response.world_state_updates || {},
          memory_updates: aiResponse.response.memory_updates || [],
          relationship_updates: aiResponse.response.relationship_updates || [],
          tokens_used: aiResponse.tokensUsed || 0,
          context_usage: aiResponse.response.context_usage || 0
        },
        created_at: new Date().toISOString()
      };

      // Add to UI immediately
      setMessages(prev => [...prev, systemMessage]);

      // Save system message to database
      const { data: savedSystemMessage, error: systemMessageError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId!,
          character_id: character.id,
          content: cleanedResponse,
          message_type: 'character',
          metadata: systemMessage.metadata
        })
        .select()
        .single();

      if (systemMessageError) {
        console.error('Error saving system message:', systemMessageError);
        throw new Error('Failed to save AI response');
      }

      // Update with saved message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id ? savedSystemMessage : msg
        )
      );

      // Update enhanced state
      if (aiResponse.response.memory_updates?.length > 0) {
        setMemoryEvents(prev => [...prev, ...aiResponse.response.memory_updates]);
      }

      if (aiResponse.response.relationship_updates?.length > 0) {
        setRelationships(prev => {
          const updated = [...prev];
          aiResponse.response.relationship_updates.forEach(update => {
            const existingIndex = updated.findIndex(r => r.character_name === update.character_name);
            if (existingIndex >= 0) {
              updated[existingIndex] = { ...updated[existingIndex], ...update };
            } else {
              updated.push({
                character_name: update.character_name,
                relationship_type: update.relationship_type || 'neutral',
                trust_level: update.trust_level || 50,
                notes: update.notes || '',
                last_interaction: new Date().toISOString()
              });
            }
          });
          return updated;
        });
      }

      if (aiResponse.response.world_state_updates) {
        setWorldState(prev => ({ ...prev, ...aiResponse.response.world_state_updates }));
      }

      // Save enhanced state to session
      const enhancedState = {
        ...session.session_state,
        memory_events: memoryEvents,
        relationships: relationships,
        world_state: worldState,
        context_tokens_used: aiResponse.response.context_usage || 0
      };

      await supabase
        .from('story_sessions')
        .update({ 
          session_state: enhancedState,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId!);

      // Track API usage
      if (aiResponse.usage) {
        await supabase.from('api_usage').insert({
          user_id: user.id,
          session_id: sessionId!,
          tokens_used: aiResponse.usage.totalTokens,
          input_tokens: aiResponse.usage.inputTokens,
          output_tokens: aiResponse.usage.outputTokens,
          operation_type: 'continue_conversation',
          model_type: aiResponse.usage.modelType,
          response_time_ms: aiResponse.usage.responseTime,
          input_cost: aiResponse.usage.costs.inputCost,
          output_cost: aiResponse.usage.costs.outputCost,
          total_cost: aiResponse.usage.costs.totalCost,
          api_provider: 'openai'
        });
      }

      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);

    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCreativityLevelDisplay = () => {
    switch (session?.creativity_level) {
      case 'faithful': return { name: 'Story-Focused', description: 'Staying true to the original narrative' };
      case 'creative': return { name: 'Open World', description: 'Complete creative freedom' };
      default: return { name: 'Flexible Exploration', description: 'Balanced adventure with creative possibilities' };
    }
  };

  const toggleLeftSidebar = () => setLeftSidebarCollapsed(!leftSidebarCollapsed);
  const toggleRightSidebar = () => setRightSidebarCollapsed(!rightSidebarCollapsed);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading your adventure</div>
        </div>
      </div>
    );
  }

  if (error || !session || !story || !character) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Unable to Load Adventure</h2>
          <p className="text-[#1A1A1A] mb-4 font-light">{error || 'Session data not found'}</p>
          <Link to="/dashboard" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8]">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const avatarColorIndex = parseInt(character.avatar_url?.split('-')[1] || '0');
  const currentContextUsage = session.session_state?.context_tokens_used || 0;
  const creativityDisplay = getCreativityLevelDisplay();

  return (
    <div className="h-screen bg-[#FAFAF8] flex flex-col overflow-hidden game-chat">
      {/* Header */}
      <header className="typewriter-header flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {character.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-[#1A1A1A] font-medium">{character.name}</div>
                  <div className="text-[#1A1A1A] text-sm font-light">in {story.title}</div>
                </div>
              </div>
            </div>
            
            {/* Mobile toggle buttons */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLeftSidebar}
                  className="typewriter-btn"
                  aria-label="Toggle character info"
                >
                  <User className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleRightSidebar}
                  className="typewriter-btn"
                  aria-label="Toggle game status"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Desktop controls */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <AutoSaveIndicator status={autoSaveStatus} />
                <button
                  onClick={() => setShowStoryInfo(true)}
                  className="typewriter-btn"
                >
                  <Info className="w-4 h-4" />
                  Info
                </button>
                <button
                  onClick={handleExport}
                  className="typewriter-btn"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Character Info */}
        <div className={`bg-[#FAFAF8] border-r-2 border-[#1A1A1A] flex-shrink-0 transition-all duration-300 ${
          leftSidebarCollapsed ? (isMobile ? 'w-0' : 'w-0') : 'w-80'
        } ${leftSidebarCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="p-6 space-y-6">
            {/* Character Header */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[#1A1A1A]">{character.name}</h3>
                {!isMobile && (
                  <button
                    onClick={toggleLeftSidebar}
                    className="typewriter-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[#1A1A1A] text-sm font-light">Your Character</p>
            </div>

            {/* Character Traits */}
            <div className="typewriter-card">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-[#2B6CB0]" />
                <h4 className="text-[#1A1A1A] font-medium">Traits</h4>
              </div>
              {character.personality_traits && character.personality_traits.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {character.personality_traits.map((trait, index) => (
                    <span
                      key={index}
                      className="typewriter-badge bg-[#1A1A1A] text-[#FAFAF8] text-xs"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[#1A1A1A] text-sm font-light">No traits defined</p>
              )}
            </div>

            {/* Conversation Count */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A] font-medium">Conversations</span>
                </div>
                <span className="text-2xl font-medium text-[#1A1A1A]">
                  {messages.filter(m => m.message_type === 'user').length}
                </span>
              </div>
            </div>

            {/* Key Memories */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A] font-medium">Key Memories</span>
                </div>
                <span className="text-[#1A1A1A] font-medium">
                  {memoryEvents.filter(e => e.importance === 'high').length}
                </span>
              </div>
              {memoryEvents.length > 0 ? (
                <div className="space-y-2">
                  {memoryEvents.slice(-3).map((memory, index) => (
                    <div key={index} className="p-2 bg-[#E5E5E5] border border-[#1A1A1A]">
                      <p className="text-[#1A1A1A] text-sm font-light">{memory.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#1A1A1A] text-sm font-light">No key memories yet</p>
              )}
            </div>

            {/* Relationships */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A] font-medium">Relationships</span>
                </div>
                <span className="text-[#1A1A1A] font-medium">
                  {relationships.length}
                </span>
              </div>
              {relationships.length > 0 ? (
                <div className="space-y-2">
                  {relationships.slice(-4).map((rel, index) => (
                    <div key={index} className="p-2 bg-[#E5E5E5] border border-[#1A1A1A]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1A1A1A] font-medium text-sm">{rel.character_name}</span>
                        <span className="text-[#1A1A1A] text-xs">{rel.trust_level}%</span>
                      </div>
                      <p className="text-[#1A1A1A] text-xs font-light">{rel.relationship_type} • Trust: {rel.trust_level}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#1A1A1A] text-sm font-light">No relationships yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Container - Fixed height with internal scrolling */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#1A1A1A] font-light">Your adventure begins...</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex gap-3 ${
                    message.message_type === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {message.message_type !== 'user' && (
                      <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-md lg:max-w-2xl p-4 border-2 border-[#1A1A1A] ${
                      message.message_type === 'user'
                        ? 'bg-[#1A1A1A] text-[#FAFAF8] ml-12'
                        : 'bg-[#FAFAF8] text-[#1A1A1A]'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed font-light">
                        {message.content}
                      </p>
                      <p className="text-xs mt-2 opacity-70 font-light">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    {message.message_type === 'user' && (
                      <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Suggested Actions */}
                  {message.message_type === 'character' && message.metadata?.suggested_actions && (
                    <div className="flex flex-wrap gap-2 ml-11">
                      {message.metadata.suggested_actions.slice(0, 3).map((action: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setInput(action.text)}
                          className="typewriter-btn text-sm"
                        >
                          {action.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="p-4 border-2 border-[#1A1A1A] bg-[#FAFAF8]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#1A1A1A] animate-spin" />
                    <span className="text-[#1A1A1A] font-light loading-dots">Writing</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="border-t-2 border-[#1A1A1A] p-4 bg-[#FAFAF8] flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`What does ${character.name} do next?`}
                className="flex-1 p-3 typewriter-input resize-none"
                rows={2}
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || sending}
                className="typewriter-btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-[#1A1A1A] font-light">
              <span>Press Ctrl+Enter to send</span>
              <span>{Math.floor(currentContextUsage / 1000)}k / 128,000 tokens</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Game Status */}
        <div className={`bg-[#FAFAF8] border-l-2 border-[#1A1A1A] flex-shrink-0 transition-all duration-300 ${
          rightSidebarCollapsed ? (isMobile ? 'w-0' : 'w-0') : 'w-80'
        } ${rightSidebarCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="p-6 space-y-6">
            {/* Game Status Header */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[#1A1A1A]">Game Status</h3>
                {!isMobile && (
                  <button
                    onClick={toggleRightSidebar}
                    className="typewriter-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Context Usage */}
            <div className="typewriter-card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-[#2B6CB0]" />
                <h4 className="text-[#1A1A1A] font-medium">Context Usage</h4>
              </div>
              <ContextProgressBar 
                tokensUsed={currentContextUsage}
                className="mb-2"
              />
              <p className="text-[#1A1A1A] text-xs font-light">
                Context usage healthy • {currentContextUsage.toLocaleString()} tokens
              </p>
            </div>

            {/* Current Scene */}
            <div className="typewriter-card">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#2B6CB0]" />
                <h4 className="text-[#1A1A1A] font-medium">Current Scene</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[#1A1A1A] text-sm font-medium">Time:</span>
                  <span className="text-[#1A1A1A] text-sm font-light ml-2">
                    {worldState.time_of_day}
                  </span>
                </div>
                <div>
                  <span className="text-[#1A1A1A] text-sm font-medium">Mood:</span>
                  <span className="text-[#1A1A1A] text-sm font-light ml-2">
                    {worldState.mood_atmosphere || 'exploring, vibrant, curious'}
                  </span>
                </div>
                <div>
                  <span className="text-[#1A1A1A] text-sm font-medium">Location:</span>
                  <span className="text-[#1A1A1A] text-sm font-light ml-2">
                    {worldState.current_location || 'Meryton village green'}
                  </span>
                </div>
              </div>
            </div>

            {/* Characters Present */}
            <div className="typewriter-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2B6CB0]" />
                  <h4 className="text-[#1A1A1A] font-medium">Characters Present</h4>
                </div>
                <span className="text-[#1A1A1A] font-medium">
                  {worldState.present_npcs?.length || 2}
                </span>
              </div>
              <div className="space-y-2">
                {(worldState.present_npcs && worldState.present_npcs.length > 0 ? 
                  worldState.present_npcs : ['Miss Bingley', 'Miss Bennet']
                ).map((npc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#2B6CB0] text-[#FAFAF8] flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {npc.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[#1A1A1A] text-sm font-light">{npc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Story Freedom */}
            <div className="typewriter-card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#2B6CB0]" />
                <h4 className="text-[#1A1A1A] font-medium">Story Freedom</h4>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-[#E5E5E5] border border-[#1A1A1A]">
                  <h5 className="text-[#1A1A1A] font-medium text-sm">{creativityDisplay.name}</h5>
                  <p className="text-[#1A1A1A] text-xs font-light mt-1">
                    {creativityDisplay.description}
                  </p>
                </div>
                <div className="text-xs text-[#1A1A1A] font-light">
                  Change Mode:
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-[#FAFAF8] border border-[#1A1A1A]">
                    <span className="text-[#1A1A1A] text-xs font-medium">Story-Focused</span>
                    <p className="text-[#1A1A1A] text-xs font-light">Staying true to the original narrative</p>
                  </div>
                  <div className="p-2 bg-[#FAFAF8] border border-[#1A1A1A]">
                    <span className="text-[#1A1A1A] text-xs font-medium">Flexible Exploration</span>
                    <p className="text-[#1A1A1A] text-xs font-light">Balanced adventure with creative possibilities</p>
                  </div>
                  <div className="p-2 bg-[#FAFAF8] border border-[#1A1A1A]">
                    <span className="text-[#1A1A1A] text-xs font-medium">Open World</span>
                    <p className="text-[#1A1A1A] text-xs font-light">Complete creative freedom</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
        />
      )}
    </div>
  );
};

export default Game;