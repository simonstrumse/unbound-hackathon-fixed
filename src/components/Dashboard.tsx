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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user but auth finished loading
  if (!user) {
    console.log('Dashboard: No user found after auth loaded');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">Please sign in to continue</p>
          <Link to="/signin" className="text-purple-300 hover:text-white transition-colors mt-4 block">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">Unable to load user data</p>
          <button 
            onClick={handleSignOut}
            className="text-purple-300 hover:text-white transition-colors mt-4 block"
          >
            Sign Out and Try Again
          </button>
        </div>
      </div>
    );
  }

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

  console.log('Dashboard: Rendering main dashboard for user:', displayProfile.username);

  const getAdminBadge = () => {
    if (isSuperAdmin) {
      return (
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-yellow-500/20 text-yellow-200 rounded-full text-xs sm:text-sm">
          <Crown className="w-4 h-4" />
          <span className="hidden sm:inline">Super Admin</span>
          <span className="sm:hidden">Super</span>
        </div>
      );
    }
    if (isAdmin) {
      return (
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full text-xs sm:text-sm">
          <Shield className="w-4 h-4" />
          Admin
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-white" />
              <span className="text-xl sm:text-2xl font-serif font-bold text-white">Unbound</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/analytics"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors text-sm sm:text-base"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg transition-colors text-sm sm:text-base"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm sm:text-base"
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
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">
              Welcome back, {displayProfile.username}!
            </h1>
            {getAdminBadge()}
          </div>
          <p className="text-xl text-purple-100">
            Ready to continue your literary adventure?
          </p>
        </div>

        {/* Show any errors */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-100">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Beta Status Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-4">
              {displayProfile.beta_approved ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Beta Access Status
                </h3>
                <p className="text-purple-100">
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
              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
              <p className="text-purple-100">Loading your adventures...</p>
            </div>
          </div>
        ) : activeSessions.length > 0 ? (
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl font-serif font-bold text-white mb-6 text-center">
              Your Active Adventures
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {activeSessions.map((session) => {
                const avatarColorIndex = parseInt(session.character.avatar_url?.split('-')[1] || '0');
                return (
                  <div
                    key={session.id}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-lg font-bold text-white">
                          {session.character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-serif font-bold text-white mb-1">
                          {session.story.title}
                        </h3>
                        <p className="text-purple-200 text-sm mb-2">
                          by {session.story.author}
                        </p>
                        <div className="flex items-center gap-2 text-purple-100 text-sm">
                          <User className="w-4 h-4" />
                          Playing as {session.character.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-200 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleContinueSession(session.id)}
                          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                        >
                          <Play className="w-4 h-4" />
                          Continue
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
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
          <div className="group bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Browse Stories</h3>
            <p className="text-purple-100 mb-6 leading-relaxed">
              Explore our curated collection of classic literature and choose your next adventure.
            </p>
            <button 
              className="bg-white text-purple-900 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              onClick={handleBrowseStories}
            >
              Explore Stories
            </button>
          </div>

          <div className="group bg-gradient-to-br from-green-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Book className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Create Character</h3>
            <p className="text-purple-100 mb-6 leading-relaxed">
              Design unique characters with distinct personalities for your literary adventures.
            </p>
            <button 
              className="bg-white text-purple-900 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              onClick={handleBrowseStories}
            >
              Start New Adventure
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-white mb-8 text-center">
            Your Adventure Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
              <div className="text-3xl font-bold text-white mb-2">{activeSessions.length}</div>
              <div className="text-purple-200">Active Adventures</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
              <div className="text-3xl font-bold text-white mb-2">
                {activeSessions.reduce((acc, session) => acc + (session.character.personality_traits?.length || 0), 0)}
              </div>
              <div className="text-purple-200">Character Traits</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
              <div className="text-3xl font-bold text-white mb-2">0</div>
              <div className="text-purple-200">Conversations</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;