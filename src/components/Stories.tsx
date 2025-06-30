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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading stories</div>
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
                to="/dashboard"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
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
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
            Choose Your Adventure
          </h1>
          <div className="ascii-divider mb-6"></div>
          <p className="text-xl text-[#1A1A1A] max-w-2xl mx-auto font-light">
            Select a classic story to begin your literary journey. Use <strong>Quick Play</strong> to start instantly 
            or <strong>Customize Character</strong> for a personalized experience.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 typewriter-card typewriter-error flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#E53E3E] flex-shrink-0" />
            <p className="text-[#E53E3E]">{error}</p>
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
                className="typewriter-card typewriter-hover"
              >
                {/* Cover Image */}
                <div className="h-64 overflow-hidden border-b-2 border-[#1A1A1A]">
                  <img
                    src={story.cover_image_url || 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg'}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="typewriter-badge bg-[#2B6CB0] text-[#FAFAF8] text-sm">
                        {story.genre}
                      </span>
                    </div>
                    <h3 className="text-2xl font-medium text-[#1A1A1A] mb-1 typewriter-cursor">
                      {story.title}
                    </h3>
                    <p className="text-[#1A1A1A] font-medium mb-3">
                      by {story.author}
                    </p>
                  </div>

                  <p className="text-[#1A1A1A] text-sm leading-relaxed mb-4 line-clamp-3 font-light">
                    {story.description}
                  </p>

                  {/* Story Suggestions */}
                  {suggestions && (
                    <div className="mb-6 p-3 bg-[#E5E5E5] border border-[#1A1A1A]">
                      <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">Popular in this story:</h4>
                      <div className="space-y-1">
                        <div className="text-xs text-[#1A1A1A] font-light">
                          <strong>Scenarios:</strong> {suggestions.scenarios.slice(0, 2).join(', ')}
                        </div>
                        <div className="text-xs text-[#1A1A1A] font-light">
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
                      className="w-full typewriter-btn-primary py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isStarting ? (
                        <>
                          <span className="loading-dots">Creating Adventure</span>
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
                      className="w-full typewriter-btn py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      Customize Character
                    </button>
                  </div>

                  <p className="text-xs text-[#1A1A1A] text-center mt-3 font-light">
                    Quick Play uses balanced settings with a randomized character
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {stories.length === 0 && !loading && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-[#1A1A1A] opacity-50 mx-auto mb-4" />
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">No Stories Available</h3>
            <p className="text-[#1A1A1A] font-light">
              Check back soon for new adventures to explore.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Stories;