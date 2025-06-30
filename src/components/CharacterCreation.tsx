import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Book, ArrowLeft, User, Palette, Heart, Sparkles, Loader2, AlertCircle, RefreshCw, Shuffle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase, Story, Character } from '../lib/supabase';
import { 
  generateRandomName, 
  generateFirstName, 
  PRESET_BACKGROUNDS, 
  BALANCED_PERSONALITY_TRAITS,
  getRandomPresetBackground,
  getRandomAvatarColor
} from '../utils/nameGenerator';

const personalityTraits = [
  'Brave', 'Cautious', 'Witty', 'Compassionate',
  'Ambitious', 'Mysterious', 'Cheerful', 'Serious',
  'Curious', 'Loyal', 'Independent', 'Diplomatic'
];

const creativityLevels = [
  {
    level: 1,
    title: 'Story-Focused',
    description: 'Urgent, plot-driven experience where NPCs push the canonical story forward with purpose'
  },
  {
    level: 2,
    title: 'Flexible Exploration', 
    description: 'Responsive NPCs acknowledge your interests and adapt, balancing canon with creativity'
  },
  {
    level: 3,
    title: 'Open World',
    description: '"Yes, and" improv style where NPCs embrace any idea and reality becomes flexible'
  }
];

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

// Utility function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const CharacterCreation: React.FC = () => {
  // Handle both new flow (/character-creation/story/:storyId) and legacy flow (/character-creation/:sessionId/:storyId)
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  
  // Determine which flow we're using based on URL structure
  const isNewFlow = window.location.pathname.includes('/character-creation/story/');
  const storyId = isNewFlow ? params.storyId : params.storyId;
  const sessionId = isNewFlow ? undefined : params.sessionId;
  
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate smart defaults
  const [character, setCharacter] = useState({
    name: generateFirstName(),
    backstory: getRandomPresetBackground().description,
    personalityTraits: [...BALANCED_PERSONALITY_TRAITS],
    avatarColor: getRandomAvatarColor(),
    creativityLevel: 2 // Default to Balanced Adventure
  });

  useEffect(() => {
    console.log('CharacterCreation mounted with params:', params);
    console.log('Flow type:', isNewFlow ? 'NEW (story-first)' : 'LEGACY (session-first)');
    console.log('Story ID:', storyId);
    console.log('Session ID:', sessionId);
    
    // Validate URL parameters
    if (!storyId) {
      console.error('Missing story ID in URL parameters');
      setError('Story ID is required');
      setLoading(false);
      return;
    }

    if (!isValidUUID(storyId)) {
      console.error('Invalid story ID format in URL parameters:', storyId);
      setError('Invalid story ID format');
      setLoading(false);
      return;
    }

    // For legacy flow, also validate session ID
    if (!isNewFlow) {
      if (!sessionId) {
        console.error('Missing session ID in legacy flow');
        setError('Session ID is required for legacy flow');
        setLoading(false);
        return;
      }

      if (!isValidUUID(sessionId)) {
        console.error('Invalid session ID format in legacy flow:', sessionId);
        setError('Invalid session ID format');
        setLoading(false);
        return;
      }
    }

    fetchStory();
  }, [storyId, sessionId, isNewFlow]);

  const fetchStory = async () => {
    if (!storyId) {
      console.error('No storyId provided to fetchStory');
      setError('Story ID is required');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching story with ID:', storyId);
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (error) {
        console.error('Error fetching story:', error);
        throw new Error('Failed to load story details');
      }

      if (!data) {
        console.error('No story found with ID:', storyId);
        throw new Error('Story not found');
      }

      console.log('Story fetched successfully:', data);
      setStory(data);
    } catch (err) {
      console.error('Error in fetchStory:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load story details';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const randomizeCharacter = () => {
    const randomBackground = getRandomPresetBackground();
    setCharacter({
      name: generateFirstName(),
      backstory: randomBackground.description,
      personalityTraits: [...BALANCED_PERSONALITY_TRAITS],
      avatarColor: getRandomAvatarColor(),
      creativityLevel: 2
    });
    showNotification('Character randomized!', 'success');
  };

  const randomizeName = () => {
    setCharacter(prev => ({ ...prev, name: generateFirstName() }));
  };

  const handleTraitToggle = (trait: string) => {
    setCharacter(prev => {
      const newTraits = prev.personalityTraits.includes(trait)
        ? prev.personalityTraits.filter(t => t !== trait)
        : prev.personalityTraits.length < 3
        ? [...prev.personalityTraits, trait]
        : prev.personalityTraits;
      
      return { ...prev, personalityTraits: newTraits };
    });
  };

  const handleBackgroundSelect = (background: typeof PRESET_BACKGROUNDS[0]) => {
    setCharacter(prev => ({ ...prev, backstory: background.description }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log('=== STARTING CHARACTER CREATION ===');
    console.log('Flow type:', isNewFlow ? 'NEW (story-first)' : 'LEGACY (session-first)');
    console.log('Form data:', character);
    console.log('Story ID:', storyId);
    console.log('Session ID (if legacy):', sessionId);
    console.log('User ID:', user?.id);

    // Validate required fields - only name is required now
    if (!character.name.trim()) {
      const errorMessage = 'Please enter a character name';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    if (!user || !storyId) {
      console.error('Missing required data:', { user: !!user, storyId });
      const errorMessage = 'Invalid user or story data';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    // Validate UUIDs
    if (!isValidUUID(user.id)) {
      console.error('Invalid user ID format:', user.id);
      const errorMessage = 'Invalid user ID';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    if (!isValidUUID(storyId)) {
      console.error('Invalid story ID format:', storyId);
      const errorMessage = 'Invalid story ID';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    // For legacy flow, validate session ID
    if (!isNewFlow && sessionId && !isValidUUID(sessionId)) {
      console.error('Invalid session ID format:', sessionId);
      const errorMessage = 'Invalid session ID';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    try {
      setSaving(true);
      console.log('Starting character creation process...');

      // Create the character
      console.log('Creating character with data:', {
        name: character.name.trim(),
        description: character.backstory.trim() || null,
        personality_traits: character.personalityTraits,
        avatar_url: `avatar-${character.avatarColor}`,
        character_type: 'player',
        story_id: storyId,
        user_id: user.id,
        is_active: true,
      });

      const { data: newCharacter, error: characterError } = await supabase
        .from('characters')
        .insert({
          name: character.name.trim(),
          description: character.backstory.trim() || null,
          personality_traits: character.personalityTraits,
          avatar_url: `avatar-${character.avatarColor}`,
          character_type: 'player',
          story_id: storyId,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (characterError) {
        console.error('Error creating character:', characterError);
        throw new Error(`Failed to create character: ${characterError.message}`);
      }

      if (!newCharacter) {
        console.error('No character data returned from insert');
        throw new Error('Character creation failed - no data returned');
      }

      console.log('=== CHARACTER CREATED SUCCESSFULLY ===');
      console.log('Character ID:', newCharacter.id);
      console.log('Character data:', newCharacter);

      // Validate the character ID
      if (!isValidUUID(newCharacter.id)) {
        console.error('Invalid character ID returned:', newCharacter.id);
        throw new Error('Invalid character ID format');
      }

      let finalSessionId: string;

      if (isNewFlow) {
        // NEW FLOW: Create the story session now that we have the character
        console.log('=== CREATING STORY SESSION (NEW FLOW) ===');
        
        // Map creativity level to string
        const creativityLevelString = character.creativityLevel === 1 ? 'faithful' : 
                                    character.creativityLevel === 3 ? 'creative' : 'balanced';
        
        console.log('Creating session with:', {
          user_id: user.id,
          story_id: storyId,
          player_character_id: newCharacter.id,
          creativity_level: creativityLevelString,
          session_state: { context_tokens_used: 0 },
          is_active: true,
        });

        const { data: newSession, error: sessionError } = await supabase
          .from('story_sessions')
          .insert({
            user_id: user.id,
            story_id: storyId,
            player_character_id: newCharacter.id,
            creativity_level: creativityLevelString,
            session_state: { context_tokens_used: 0 },
            is_active: true,
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating story session:', sessionError);
          throw new Error(`Failed to create session: ${sessionError.message}`);
        }

        if (!newSession) {
          console.error('No session data returned from insert');
          throw new Error('Session creation failed - no data returned');
        }

        console.log('=== SESSION CREATED SUCCESSFULLY ===');
        console.log('Session ID:', newSession.id);
        
        finalSessionId = newSession.id;
      } else {
        // LEGACY FLOW: Update existing session with the character ID
        console.log('=== UPDATING EXISTING STORY SESSION (LEGACY FLOW) ===');
        console.log('Session ID:', sessionId);
        console.log('Character ID to set:', newCharacter.id);

        const { error: sessionError } = await supabase
          .from('story_sessions')
          .update({
            player_character_id: newCharacter.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (sessionError) {
          console.error('Error updating story session:', sessionError);
          throw new Error(`Failed to update session: ${sessionError.message}`);
        }

        console.log('=== SESSION UPDATED SUCCESSFULLY ===');
        finalSessionId = sessionId!;
      }

      console.log('Navigating to game with session ID:', finalSessionId);

      // Show success notification
      showNotification(
        `Character "${character.name}" created successfully!`,
        'success'
      );

      // Navigate to the game page
      navigate(`/game/${finalSessionId}`);
    } catch (err) {
      console.error('=== CHARACTER CREATION FAILED ===');
      console.error('Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create character. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading story details...</p>
        </div>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Story</h2>
          <p className="text-purple-100 mb-4">{error}</p>
          <Link to="/stories" className="text-purple-300 hover:text-white transition-colors">
            ← Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Story Not Found</h2>
          <Link to="/stories" className="text-purple-300 hover:text-white transition-colors">
            ← Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] paper-texture">
      {/* Header */}
      <header className="nav-typewriter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/stories"
                className="nav-link flex items-center gap-2 font-mono"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Stories
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-mono font-medium text-[#1A1A1A] typewriter-cursor">Unbound</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Story Info */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-mono font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
            Create Your Character
          </h1>
          <div className="max-w-2xl mx-auto mb-6">
            <h2 className="text-2xl font-mono font-medium text-[#2B6CB0] mb-2">
              {story.title}
            </h2>
            <p className="text-[#666666] text-lg font-mono">
              by {story.author}
            </p>
          </div>
          <p className="text-[#666666] max-w-3xl mx-auto leading-relaxed font-mono">
            {story.description}
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-[#E53E3E] border-2 border-[#1A1A1A] text-[#FAFAF8] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-mono">{error}</p>
          </div>
        )}

        {/* Character Creation Form */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Form */}
          <div className="card-typewriter">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-mono font-medium text-[#1A1A1A]">[Character Details]</h3>
              <button
                type="button"
                onClick={randomizeCharacter}
                className="btn-typewriter flex items-center gap-2 font-mono"
              >
                <Shuffle className="w-4 h-4" />
                <span>&gt; Randomize All</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Character Name */}
              <div>
                <label className="block text-lg font-mono text-[#1A1A1A] mb-3">
                  Character Name *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    className="input-typewriter flex-1 font-mono"
                    placeholder="Enter your character's name"
                    maxLength={50}
                    required
                  />
                  <button
                    type="button"
                    onClick={randomizeName}
                    className="btn-typewriter px-4 py-3"
                    title="Generate random name"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="block text-lg font-mono text-[#1A1A1A] mb-3">
                  Background <span className="text-[#666666] font-normal text-sm">(Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {PRESET_BACKGROUNDS.map((background) => (
                    <button
                      key={background.title}
                      type="button"
                      onClick={() => handleBackgroundSelect(background)}
                      className={`p-3 border-2 text-left transition-all font-mono ${
                        character.backstory === background.description
                          ? 'bg-[#2B6CB0] border-[#1A1A1A] text-[#FAFAF8]'
                          : 'bg-[#FAFAF8] border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#E5E5E5]'
                      }`}
                    >
                      <div className="font-medium">{background.title}</div>
                      <div className="text-sm opacity-70 mt-1">{background.description}</div>
                    </button>
                  ))}
                </div>
                <textarea
                  value={character.backstory}
                  onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                  className="input-typewriter w-full font-mono resize-none"
                  placeholder="Customize your character's background..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Personality Traits */}
              <div>
                <label className="block text-lg font-mono text-[#1A1A1A] mb-3">
                  Personality Traits <span className="text-[#666666] font-normal text-sm">(Choose up to 3)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {personalityTraits.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => handleTraitToggle(trait)}
                      className={`px-3 py-2 text-sm font-mono transition-all duration-200 border-2 ${
                        character.personalityTraits.includes(trait)
                          ? 'bg-[#2B6CB0] text-[#FAFAF8] border-[#1A1A1A]'
                          : 'bg-[#FAFAF8] text-[#1A1A1A] hover:bg-[#E5E5E5] border-[#1A1A1A]'
                      }`}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity Level */}
              <div>
                <label className="block text-lg font-mono text-[#1A1A1A] mb-3">
                  Adventure Style
                </label>
                <div className="space-y-3">
                  {creativityLevels.map((level) => (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => setCharacter(prev => ({ ...prev, creativityLevel: level.level }))}
                      className={`w-full p-4 border-2 text-left transition-all font-mono ${
                        character.creativityLevel === level.level
                          ? 'bg-[#2B6CB0] border-[#1A1A1A] text-[#FAFAF8]'
                          : 'bg-[#FAFAF8] border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#E5E5E5]'
                      }`}
                    >
                      <div className="font-medium text-lg">{level.title}</div>
                      <div className="text-sm opacity-80 mt-1">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-lg font-mono text-[#1A1A1A] mb-3">
                  Avatar Color
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {avatarColors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCharacter(prev => ({ ...prev, avatarColor: index }))}
                      className={`w-12 h-12 ${color} border-2 border-[#1A1A1A] transition-all duration-200 ${
                        character.avatarColor === index
                          ? 'scale-110 border-4'
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving || !character.name.trim()}
                className="btn-typewriter-blue w-full py-4 px-6 font-mono text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="loading-typewriter">Creating Character</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>&gt; Begin Adventure</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Character Preview */}
          <div className="card-typewriter">
            <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-6 text-center">
              Character Preview
            </h3>

            <div className="text-center">
              {/* Avatar */}
              <div className={`w-32 h-32 ${avatarColors[character.avatarColor]} border-4 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6`}>
                <span className="text-4xl font-mono text-[#FAFAF8]">
                  {character.name.charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              {/* Character Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-mono font-medium text-[#1A1A1A] mb-1">
                    {character.name || 'Character Name'}
                  </h4>
                  <p className="text-[#666666] font-mono">
                    Adventurer in {story.title}
                  </p>
                </div>

                {character.backstory && (
                  <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                    <h5 className="text-sm font-mono text-[#1A1A1A] mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>&gt; Background</span>
                    </h5>
                    <p className="text-[#1A1A1A] text-sm leading-relaxed font-mono">
                      {character.backstory}
                    </p>
                  </div>
                )}

                {character.personalityTraits.length > 0 && (
                  <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                    <h5 className="text-sm font-mono text-[#1A1A1A] mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span>&gt; Personality Traits</span>
                    </h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {character.personalityTraits.map((trait) => (
                        <span
                          key={trait}
                          className="px-3 py-1 bg-[#2B6CB0] text-[#FAFAF8] text-xs border border-[#1A1A1A] font-mono"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                  <h5 className="text-sm font-mono text-[#1A1A1A] mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>&gt; Adventure Style</span>
                  </h5>
                  <p className="text-[#1A1A1A] text-sm font-mono">
                    {creativityLevels.find(l => l.level === character.creativityLevel)?.title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CharacterCreation;