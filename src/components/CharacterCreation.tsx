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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading story details</div>
        </div>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Error Loading Story</h2>
          <p className="text-[#1A1A1A] mb-4 font-light">{error}</p>
          <Link to="/stories" className="text-[#2B6CB0] typewriter-hover">
            ← Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Story Not Found</h2>
          <Link to="/stories" className="text-[#2B6CB0] typewriter-hover">
            ← Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="typewriter-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/stories"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Stories
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">Unbound</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Story Info */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
            Create Your Character
          </h1>
          <div className="ascii-divider mb-6"></div>
          <div className="max-w-2xl mx-auto mb-6">
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">
              {story.title}
            </h2>
            <p className="text-[#1A1A1A] text-lg font-light">
              by {story.author}
            </p>
          </div>
          <p className="text-[#1A1A1A] max-w-3xl mx-auto leading-relaxed font-light">
            {story.description}
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 typewriter-card typewriter-error flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#E53E3E] flex-shrink-0" />
            <p className="text-[#E53E3E]">{error}</p>
          </div>
        )}

        {/* Character Creation Form */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Form */}
          <div className="typewriter-form">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-[#1A1A1A] typewriter-cursor">Character Details</h3>
              <button
                type="button"
                onClick={randomizeCharacter}
                className="typewriter-btn"
              >
                <Shuffle className="w-4 h-4" />
                Randomize All
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Character Name */}
              <div className="typewriter-form-field">
                <label className="typewriter-form-label text-lg">
                  Character Name *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 typewriter-input px-4 py-3"
                    placeholder="Enter your character's name"
                    maxLength={50}
                    required
                  />
                  <button
                    type="button"
                    onClick={randomizeName}
                    className="typewriter-btn px-4 py-3"
                    title="Generate random name"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Background */}
              <div className="typewriter-form-field">
                <label className="typewriter-form-label text-lg">
                  Background <span className="text-[#1A1A1A] font-light text-sm">(Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {PRESET_BACKGROUNDS.map((background) => (
                    <button
                      key={background.title}
                      type="button"
                      onClick={() => handleBackgroundSelect(background)}
                      className={`p-3 border-2 text-left transition-all ${
                        character.backstory === background.description
                          ? 'bg-[#1A1A1A] text-[#FAFAF8] border-[#1A1A1A]'
                          : 'bg-[#FAFAF8] border-[#1A1A1A] text-[#1A1A1A] typewriter-hover'
                      }`}
                    >
                      <div className="font-medium">{background.title}</div>
                      <div className="text-sm font-light mt-1">{background.description}</div>
                    </button>
                  ))}
                </div>
                <textarea
                  value={character.backstory}
                  onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                  className="w-full px-4 py-3 typewriter-input resize-none"
                  placeholder="Customize your character's background..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Personality Traits */}
              <div className="typewriter-form-field">
                <label className="typewriter-form-label text-lg">
                  Personality Traits <span className="text-[#1A1A1A] font-light text-sm">(Choose up to 3)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {personalityTraits.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => handleTraitToggle(trait)}
                      className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-2 ${
                        character.personalityTraits.includes(trait)
                          ? 'bg-[#1A1A1A] text-[#FAFAF8] border-[#1A1A1A]'
                          : 'bg-[#FAFAF8] text-[#1A1A1A] border-[#1A1A1A] typewriter-hover'
                      }`}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity Level */}
              <div className="typewriter-form-field">
                <label className="typewriter-form-label text-lg">
                  Adventure Style
                </label>
                <div className="space-y-3">
                  {creativityLevels.map((level) => (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => setCharacter(prev => ({ ...prev, creativityLevel: level.level }))}
                      className={`w-full p-4 border-2 text-left transition-all ${
                        character.creativityLevel === level.level
                          ? 'bg-[#1A1A1A] text-[#FAFAF8] border-[#1A1A1A]'
                          : 'bg-[#FAFAF8] border-[#1A1A1A] text-[#1A1A1A] typewriter-hover'
                      }`}
                    >
                      <div className="font-medium text-lg">{level.title}</div>
                      <div className="text-sm font-light mt-1">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Color */}
              <div className="typewriter-form-field">
                <label className="typewriter-form-label text-lg">
                  Avatar Color
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {Array.from({length: 8}, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCharacter(prev => ({ ...prev, avatarColor: index }))}
                      className={`w-12 h-12 bg-[#1A1A1A] transition-all duration-200 border-2 ${
                        character.avatarColor === index
                          ? 'border-[#E53E3E] scale-110'
                          : 'border-[#1A1A1A] typewriter-hover'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving || !character.name.trim()}
                className="w-full typewriter-btn-primary py-4 px-6 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="loading-dots">Creating Character</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Begin Adventure
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Character Preview */}
          <div className="typewriter-card">
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 text-center typewriter-cursor">
              Character Preview
            </h3>
            <div className="typewriter-divider-dashed"></div>

            <div className="text-center">
              {/* Avatar */}
              <div className="w-32 h-32 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mx-auto mb-6 border-4 border-[#1A1A1A]">
                <span className="text-4xl font-medium">
                  {character.name.charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              {/* Character Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-medium text-[#1A1A1A] mb-1 typewriter-cursor">
                    {character.name || 'Character Name'}
                  </h4>
                  <p className="text-[#1A1A1A] font-light">
                    Adventurer in {story.title}
                  </p>
                </div>

                {character.backstory && (
                  <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                    <h5 className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Background
                    </h5>
                    <p className="text-[#1A1A1A] text-sm leading-relaxed font-light">
                      {character.backstory}
                    </p>
                  </div>
                )}

                {character.personalityTraits.length > 0 && (
                  <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                    <h5 className="text-sm font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Personality Traits
                    </h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {character.personalityTraits.map((trait) => (
                        <span
                          key={trait}
                          className="typewriter-badge bg-[#1A1A1A] text-[#FAFAF8] text-xs"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#E5E5E5] border border-[#1A1A1A] p-4">
                  <h5 className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Adventure Style
                  </h5>
                  <p className="text-[#1A1A1A] text-sm font-light">
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