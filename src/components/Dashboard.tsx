import React, { useState, useEffect } from 'react';
import { Book, LogOut, BookOpen, CheckCircle, XCircle, Play, User, Calendar, Loader2, Settings, BarChart3, RefreshCw, Crown, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, StorySession, Story, Character } from '../lib/supabase';

interface SessionWithDetails extends StorySession {
  story: Story;
  character: Character;
}

const Dashboard: React.FC = () => {
  const { user, profile, signOut, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<SessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Dashboard mounted. Auth loading:', authLoading, 'User:', !!user, 'Profile:', !!profile);
    
    if (!authLoading) {
      if (!user) {
        console.log('No user found, redirecting to signin');
        navigate('/signin');
        return;
      }
      
      // If user exists but profile doesn't, still try to fetch sessions
      console.log('User found, fetching sessions regardless of profile status');
      fetchActiveSessions();
    }
  }, [authLoading, user, navigate]);

  const fetchActiveSessions = async () => {
    if (!profile && !user) {
      console.log('Cannot fetch sessions - no profile or user');
      return;
    }
    
    const userId = profile?.id || user?.id;
    if (!userId) {
      console.log('Cannot fetch sessions - no user ID available');
      return;
    }

    try {
      console.log('Starting to fetch active sessions for user:', userId);
      setLoadingSessions(true);
      setError(null);
      
      // First, get the story sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('story_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw new Error('Failed to load your adventures');
      }

      console.log('Found sessions:', sessions?.length || 0);

      if (!sessions || sessions.length === 0) {
        console.log('No active sessions found');
        setActiveSessions([]);
        return;
      }

      // Then fetch related stories and characters for each session
      console.log('Fetching details for each session...');
      const sessionsWithDetails: SessionWithDetails[] = [];

      for (const session of sessions) {
        try {
          console.log('Fetching details for session:', session.id);
          
          // Fetch story
          const { data: story, error: storyError } = await supabase
            .from('stories')
            .select('*')
            .eq('id', session.story_id)
            .single();

          // Fetch character
          const { data: character, error: characterError } = await supabase
            .from('characters')
            .select('*')
            .eq('id', session.player_character_id)
            .single();

          if (storyError) {
            console.error('Error fetching story for session', session.id, ':', storyError);
          }
          
          if (characterError) {
            console.error('Error fetching character for session', session.id, ':', characterError);
          }

          if (!storyError && !characterError && story && character) {
            console.log('Successfully loaded session details for:', session.id);
            sessionsWithDetails.push({
              ...session,
              story,
              character
            });
          } else {
            console.log('Skipping session due to missing story or character:', session.id);
          }
        } catch (error) {
          console.error('Error fetching session details:', error);
          // Continue with next session
        }
      }

      console.log('Final sessions with details:', sessionsWithDetails.length);
      setActiveSessions(sessionsWithDetails);
    } catch (error) {
      console.error('Error in fetchActiveSessions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load your adventures';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      setActiveSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Dashboard: Attempting to sign out');
      await signOut();
      console.log('Dashboard: Sign out successful, navigating to home');
      showNotification('Signed out successfully', 'success');
      navigate('/');
    } catch (error) {
      console.error('Dashboard: Error signing out:', error);
      showNotification('Failed to sign out. Please try again.', 'error');
    }
  };

  const handleContinueSession = (sessionId: string) => {
    console.log('Continuing session:', sessionId);
    navigate(`/game/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this adventure? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting session:', sessionId);
      
      // Delete the session (this will cascade delete messages due to foreign key constraints)
      const { error } = await supabase
        .from('story_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting session:', error);
        showNotification('Failed to delete adventure. Please try again.', 'error');
        return;
      }

      showNotification('Adventure deleted successfully', 'success');
      
      // Remove from local state
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
      showNotification('An unexpected error occurred', 'error');
    }
  };

  const handleBrowseStories = () => {
    console.log('Navigating to stories');
    navigate('/stories');
  };

  const handleRetry = () => {
    setError(null);
    fetchActiveSessions();
  };

  // Show loading screen while auth is loading
  if (authLoading) {
    console.log('Dashboard: Auth is loading, showing loading screen');
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading</div>
        </div>
      </div>
    );
  }

  // Show error if no user but auth finished loading
  if (!user) {
    console.log('Dashboard: No user found after auth loaded');
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#1A1A1A] text-xl">Please sign in to continue</p>
          <Link to="/signin" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] mt-4 block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // If no profile, create a temporary one from user data
  const displayProfile = profile || (user ? {
    id: user.id,
    email: user.email || '',
    username: user.email?.split('@')[0] || 'User',
    beta_approved: true,
    is_admin: false,
    admin_level: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } : null);

  if (!displayProfile) {
    console.log('Dashboard: No profile or user found');
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#1A1A1A] text-xl">Unable to load user data</p>
          <button 
            onClick={handleSignOut}
            className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] mt-4 block"
          >
            Sign Out and Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('Dashboard: Rendering main dashboard for user:', displayProfile.username);

  const getAdminBadge = () => {
    if (isSuperAdmin) {
      return (
        <div className="typewriter-badge bg-[#1A1A1A] text-[#FAFAF8] text-xs sm:text-sm">
          <Crown className="w-4 h-4" />
          <span>Super Admin</span>
        </div>
      );
    }
    if (isAdmin) {
      return (
        <div className="typewriter-badge bg-[#1A1A1A] text-[#FAFAF8] text-xs sm:text-sm">
          <Shield className="w-4 h-4" />
          Admin
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="typewriter-header">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-xl sm:text-2xl font-medium text-[#1A1A1A] typewriter-cursor">Unbound</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/analytics"
                className="typewriter-btn text-sm sm:text-base"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="typewriter-btn text-sm sm:text-base"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="typewriter-btn text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
            <h1 className="text-4xl sm:text-5xl font-medium text-[#1A1A1A] typewriter-cursor">
              Welcome back, {displayProfile.username}!
            </h1>
            {getAdminBadge()}
          </div>
          <div className="ascii-divider mb-6"></div>
          <p className="text-xl text-[#1A1A1A] font-light">
            Ready to continue your literary adventure?
          </p>
        </div>

        {/* Show any errors */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 typewriter-card typewriter-error">
            <div className="flex items-center justify-between">
              <p className="text-[#E53E3E]">{error}</p>
              <button
                onClick={handleRetry}
                className="typewriter-btn"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Beta Status Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="typewriter-card">
            <div className="flex items-center gap-4">
              {displayProfile.beta_approved ? (
                <CheckCircle className="w-8 h-8 text-[#2B6CB0]" />
              ) : (
                <XCircle className="w-8 h-8 text-[#E53E3E]" />
              )}
              <div>
                <h3 className="text-xl font-medium text-[#1A1A1A] mb-1">
                  Beta Access Status
                </h3>
                <p className="text-[#1A1A1A] font-light">
                  {displayProfile.beta_approved 
                    ? "You have full access to all platform features!" 
                    : "Your beta access is pending approval."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        {loadingSessions ? (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="text-center py-8">
              <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading your adventures</div>
            </div>
          </div>
        ) : activeSessions.length > 0 ? (
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-6 text-center">
              Your Active Adventures
            </h2>
            <div className="typewriter-divider-dashed"></div>
            <div className="grid md:grid-cols-2 gap-6">
              {activeSessions.map((session) => {
                const avatarColorIndex = parseInt(session.character.avatar_url?.split('-')[1] || '0');
                return (
                  <div
                    key={session.id}
                    className="typewriter-card"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-medium">
                          {session.character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-[#1A1A1A] mb-1">
                          {session.story.title}
                        </h3>
                        <p className="text-[#1A1A1A] text-sm mb-2 font-light">
                          by {session.story.author}
                        </p>
                        <div className="flex items-center gap-2 text-[#1A1A1A] text-sm">
                          <User className="w-4 h-4" />
                          <span className="font-light">Playing as {session.character.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#1A1A1A] text-sm">
                        <Calendar className="w-4 h-4" />
                        <span className="font-light">{new Date(session.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleContinueSession(session.id)}
                          className="typewriter-btn-primary"
                        >
                          <Play className="w-4 h-4" />
                          Continue
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="typewriter-btn text-[#E53E3E] border-[#E53E3E]"
                          title="Delete Adventure"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="typewriter-card">
            <div className="w-16 h-16 bg-[#1A1A1A] flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-[#FAFAF8]" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">Browse Stories</h3>
            <p className="text-[#1A1A1A] mb-6 leading-relaxed font-light">
              Explore our curated collection of classic literature and choose your next adventure.
            </p>
            <button 
              className="typewriter-btn-primary"
              onClick={handleBrowseStories}
            >
              Explore Stories
            </button>
          </div>

          <div className="typewriter-card">
            <div className="w-16 h-16 bg-[#1A1A1A] flex items-center justify-center mb-6">
              <Book className="w-8 h-8 text-[#FAFAF8]" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">Create Character</h3>
            <p className="text-[#1A1A1A] mb-6 leading-relaxed font-light">
              Design unique characters with distinct personalities for your literary adventures.
            </p>
            <button 
              className="typewriter-btn-primary"
              onClick={handleBrowseStories}
            >
              Start New Adventure
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-8 text-center">
            Your Adventure Stats
          </h2>
          <div className="typewriter-divider-dashed"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="typewriter-card text-center">
              <div className="text-3xl font-medium text-[#1A1A1A] mb-2">{activeSessions.length}</div>
              <div className="text-[#1A1A1A] font-light">Active Adventures</div>
            </div>
            <div className="typewriter-card text-center">
              <div className="text-3xl font-medium text-[#1A1A1A] mb-2">
                {activeSessions.reduce((acc, session) => acc + (session.character.personality_traits?.length || 0), 0)}
              </div>
              <div className="text-[#1A1A1A] font-light">Character Traits</div>
            </div>
            <div className="typewriter-card text-center">
              <div className="text-3xl font-medium text-[#1A1A1A] mb-2">0</div>
              <div className="text-[#1A1A1A] font-light">Conversations</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;