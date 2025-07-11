import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, ArrowLeft, Play, Loader2, AlertCircle, Zap, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase, Story } from '../lib/supabase';
import { 
  generateFirstName, 
  getRandomPresetBackground, 
  BALANCED_PERSONALITY_TRAITS,
  getRandomAvatarColor
} from '../utils/nameGenerator';

// Utility function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Story-specific suggestions
const STORY_SUGGESTIONS = {
  'Pride and Prejudice': {
    scenarios: ['Navigate high society balls', 'Engage in witty repartee', 'Explore family dynamics'],
    characterTypes: ['Spirited young lady', 'Gentleman of property', 'Social observer']
  },
  'The Great Gatsby': {
    scenarios: ['Attend lavish parties', 'Explore the American Dream', 'Navigate moral complexity'],
    characterTypes: ['Ambitious newcomer', 'Wealthy socialite', 'Moral observer']
  },
  'Alice in Wonderland': {
    scenarios: ['Question strange logic', 'Meet peculiar characters', 'Explore impossible worlds'],
    characterTypes: ['Curious explorer', 'Logical thinker', 'Whimsical dreamer']
  },
  'To Kill a Mockingbird': {
    scenarios: ['Witness moral courage', 'Explore childhood innocence', 'Confront injustice'],
    characterTypes: ['Idealistic youth', 'Moral advocate', 'Community observer']
  },
  'The Catcher in the Rye': {
    scenarios: ['Navigate alienation', 'Search for authenticity', 'Explore coming of age'],
    characterTypes: ['Rebellious teen', 'Philosophical wanderer', 'Cynical observer']
  },
  'Wuthering Heights': {
    scenarios: ['Experience passionate love', 'Confront family secrets', 'Navigate revenge'],
    characterTypes: ['Passionate romantic', 'Mysterious stranger', 'Family mediator']
  }
};

const Stories: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingStory, setStartingStory] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      console.log('Fetching stories...');
      
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching stories:', error);
        throw error;
      }

      console.log('Stories fetched successfully:', data?.length || 0);
      setStories(data || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (storyId: string) => {
    if (!user || !profile) {
      console.log('No user or profile found, redirecting to signin');
      navigate('/signin');
      return;
    }

    console.log('=== STARTING QUICK ADVENTURE ===');
    console.log('Story ID:', storyId);
    console.log('User ID:', user.id);

    // Validate inputs
    if (!isValidUUID(storyId)) {
      console.error('Invalid story ID format:', storyId);
      setError('Invalid story ID format');
      return;
    }

    if (!isValidUUID(user.id)) {
      console.error('Invalid user ID format:', user.id);
      setError('Invalid user ID format');
      return;
    }

    try {
      setStartingStory(storyId);
      setError(null);

      showNotification('Creating your adventure...', 'info');

      // Generate character with smart defaults
      const randomBackground = getRandomPresetBackground();
      const characterData = {
        name: generateFirstName(),
        description: randomBackground.description,
        personality_traits: [...BALANCED_PERSONALITY_TRAITS],
        avatar_url: `avatar-${getRandomAvatarColor()}`,
        character_type: 'player' as const,
        story_id: storyId,
        user_id: user.id,
        is_active: true,
      };

      console.log('Creating character with quick start data:', characterData);

      // Create the character
      const { data: newCharacter, error: characterError } = await supabase
        .from('characters')
        .insert(characterData)
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

      console.log('Character created successfully:', newCharacter.id);

      // Create the story session with default creativity level (balanced)
      const sessionData = {
        user_id: user.id,
        story_id: storyId,
        player_character_id: newCharacter.id,
        creativity_level: 'balanced' as const, // Default to balanced
        session_state: { context_tokens_used: 0 },
        is_active: true,
      };

      console.log('Creating session with quick start data:', sessionData);

      const { data: newSession, error: sessionError } = await supabase
        .from('story_sessions')
        .insert(sessionData)
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

      console.log('=== QUICK START SESSION CREATED SUCCESSFULLY ===');
      console.log('Session ID:', newSession.id);

      // Show success notification
      showNotification(
        `Adventure started with ${characterData.name}!`,
        'success'
      );

      // Navigate to the game page
      navigate(`/game/${newSession.id}`);
    } catch (err) {
      console.error('=== QUICK START FAILED ===');
      console.error('Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start adventure. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setStartingStory(null);
    }
  };

  const handleStartAdventure = async (storyId: string) => {
    if (!user || !profile) {
      console.log('No user or profile found, redirecting to signin');
      navigate('/signin');
      return;
    }

    console.log('=== STARTING CUSTOM ADVENTURE ===');
    console.log('Story ID:', storyId);

    // Validate inputs
    if (!isValidUUID(storyId)) {
      console.error('Invalid story ID format:', storyId);
      setError('Invalid story ID format');
      return;
    }

    try {
      console.log('Navigating to character creation');
      // Navigate to character creation for customization
      navigate(`/character-creation/story/${storyId}`);
    } catch (err) {
      console.error('=== NAVIGATION FAILED ===');
      console.error('Error details:', err);
      setError('Failed to navigate to character creation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-white" />
              <span className="text-2xl font-serif font-bold text-white">Unbound</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
            Choose Your Adventure
          </h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            Select a classic story to begin your literary journey. Use <strong>Quick Play</strong> to start instantly 
            or <strong>Customize Character</strong> for a personalized experience.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story) => {
            const suggestions = STORY_SUGGESTIONS[story.title as keyof typeof STORY_SUGGESTIONS];
            const isStarting = startingStory === story.id;
            
            return (
              <div
                key={story.id}
                className="group bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Cover Image */}
                <div className="h-64 overflow-hidden">
                  <img
                    src={story.cover_image_url || 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg'}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-200 text-sm rounded-full">
                        {story.genre}
                      </span>
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-1">
                      {story.title}
                    </h3>
                    <p className="text-purple-200 font-medium mb-3">
                      by {story.author}
                    </p>
                  </div>

                  <p className="text-purple-100 text-sm leading-relaxed mb-4 line-clamp-3">
                    {story.description}
                  </p>

                  {/* Story Suggestions */}
                  {suggestions && (
                    <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                      <h4 className="text-sm font-semibold text-purple-200 mb-2">Popular in this story:</h4>
                      <div className="space-y-1">
                        <div className="text-xs text-purple-300">
                          <strong>Scenarios:</strong> {suggestions.scenarios.slice(0, 2).join(', ')}
                        </div>
                        <div className="text-xs text-purple-300">
                          <strong>Character types:</strong> {suggestions.characterTypes.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleQuickStart(story.id)}
                      disabled={isStarting}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Adventure...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Quick Play
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleStartAdventure(story.id)}
                      disabled={isStarting}
                      className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
                    >
                      <Settings className="w-5 h-5" />
                      Customize Character
                    </button>
                  </div>

                  <p className="text-xs text-purple-300 text-center mt-3">
                    Quick Play uses balanced settings with a randomized character
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {stories.length === 0 && !loading && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <h3 className="text-2xl font-serif font-bold text-white mb-2">No Stories Available</h3>
            <p className="text-purple-100">
              Check back soon for new adventures to explore.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Stories;