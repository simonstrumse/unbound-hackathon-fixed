import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Book, 
  MessageCircle, 
  User, 
  Sparkles, 
  ArrowRight, 
  Mail,
  BookOpen,
  Feather,
  Heart,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { user, profile, signUp, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [betaEmail, setBetaEmail] = useState('');
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaMessage, setBetaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleBetaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaMessage(null);

    if (!betaEmail) {
      setBetaMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(betaEmail)) {
      setBetaMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      setBetaLoading(true);
      
      // Generate a temporary username from email
      const tempUsername = betaEmail.split('@')[0] + Math.random().toString(36).substr(2, 4);
      const tempPassword = Math.random().toString(36).substr(2, 12);
      
      const { error } = await signUp(betaEmail, tempPassword, tempUsername);
      
      if (error) {
        setBetaMessage({ type: 'error', text: error.message });
      } else {
        setBetaMessage({ 
          type: 'success', 
          text: 'Account created successfully! You can now sign in to start your adventure.' 
        });
        setBetaEmail('');
      }
    } catch (err) {
      setBetaMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setBetaLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('LandingPage: Attempting to sign out');
      await signOut();
      console.log('LandingPage: Sign out successful');
      // No need to reload - the auth context will handle the state change
    } catch (error) {
      console.error('LandingPage: Error signing out:', error);
    }
  };

  const handleContinueAdventure = () => {
    console.log('LandingPage: Navigating to dashboard');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 overflow-hidden">
        {/* Header for logged-in users */}
        {user && !authLoading && (
          <header className="absolute top-0 left-0 right-0 z-20 bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-8 h-8 text-white" />
                  <span className="text-2xl font-serif font-bold text-white">Unbound</span>
                </div>
                <div className="flex items-center gap-4">
                  {profile && (
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {profile.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">Welcome back, {profile.username}!</span>
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Floating Book Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 opacity-20 animate-pulse">
            <Book className="w-8 h-8 text-white transform rotate-12" />
          </div>
          <div className="absolute top-40 right-20 opacity-30 animate-bounce">
            <BookOpen className="w-6 h-6 text-purple-200 transform -rotate-12" />
          </div>
          <div className="absolute bottom-40 left-20 opacity-25 animate-pulse delay-300">
            <Feather className="w-10 h-10 text-purple-300 transform rotate-45" />
          </div>
          <div className="absolute top-60 right-40 opacity-20 animate-bounce delay-500">
            <Star className="w-5 h-5 text-white transform rotate-12" />
          </div>
        </div>

        <div className={`relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 ${user ? 'pt-20' : ''}`}>
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full backdrop-blur-sm mb-6">
                <Book className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight">
              Step Into Your
              <span className="block bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                Favorite Stories
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create your own character and experience classic literature through 
              interactive conversations with beloved characters from famous books.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {authLoading ? (
                <div className="bg-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg backdrop-blur-sm flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </div>
              ) : user ? (
                <>
                  <button
                    onClick={handleContinueAdventure}
                    className="bg-white text-purple-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
                  >
                    Continue Your Adventure
                  </button>
                  {profile && !profile.beta_approved && (
                    <div className="bg-orange-500/20 text-orange-200 px-6 py-3 rounded-full text-sm backdrop-blur-sm border border-orange-500/30">
                      Beta access pending approval
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/signin"
                  className="bg-white text-purple-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
                >
                  Start Your Adventure
                </Link>
              )}
              {!user && !authLoading && (
                <button className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                  Learn More
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4">
              Your Literary Journey Awaits
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience stories like never before with our AI-powered platform that adapts to your choices and creativity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">Three Creativity Levels</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose your adventure style: stay true to the original story, explore with balanced freedom, 
                or unleash complete creative control over your narrative journey.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">AI-Powered Conversations</h3>
              <p className="text-gray-600 leading-relaxed">
                Engage in natural dialogues with literary characters who respond authentically while 
                maintaining their unique personalities and staying true to their stories.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-gradient-to-br from-rose-50 to-pink-50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">Your Story, Your Way</h3>
              <p className="text-gray-600 leading-relaxed">
                Create unique characters with distinct personality traits and watch as your choices 
                shape the narrative, creating a truly personalized literary experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Four simple steps to begin your literary adventure
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Choose Your Story</h3>
              <p className="text-gray-600">
                Select from our curated library of classic literature and timeless tales.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create Your Character</h3>
              <p className="text-gray-600">
                Design a unique character with personality traits that will shape your journey.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Conversations</h3>
              <p className="text-gray-600">
                Engage with beloved characters in natural, flowing conversations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Shape the Narrative</h3>
              <p className="text-gray-600">
                Watch as your choices and decisions influence the story's direction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4">
              Explore Classic Tales
            </h2>
            <p className="text-xl text-gray-600">
              Step into these beloved stories and create your own adventure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pride and Prejudice */}
            <div className="group bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center">
                <div className="text-center text-white">
                  <Book className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-serif text-sm">Jane Austen</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">Pride and Prejudice</h3>
                <p className="text-gray-600 mb-4">
                  Navigate the complex social world of Regency England, where wit and romance 
                  intertwine in the drawing rooms of the English countryside.
                </p>
                <button className="flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-800 transition-colors">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Great Gatsby */}
            <div className="group bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-green-300 to-teal-300 flex items-center justify-center">
                <div className="text-center text-white">
                  <Sparkles className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-serif text-sm">F. Scott Fitzgerald</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">The Great Gatsby</h3>
                <p className="text-gray-600 mb-4">
                  Experience the glittering world of the Jazz Age, where dreams and reality 
                  collide in the lavish parties of West Egg.
                </p>
                <button className="flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-800 transition-colors">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alice in Wonderland */}
            <div className="group bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-blue-300 to-indigo-300 flex items-center justify-center">
                <div className="text-center text-white">
                  <Heart className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-serif text-sm">Lewis Carroll</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">Alice in Wonderland</h3>
                <p className="text-gray-600 mb-4">
                  Tumble down the rabbit hole into a whimsical world where logic bends 
                  and imagination reigns supreme in curious adventures.
                </p>
                <button className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Access Section - Only show if not logged in */}
      {!user && !authLoading && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full backdrop-blur-sm mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-6">
              Request Beta Access
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Be among the first to step into your favorite stories. Beta spaces are limited.
            </p>
            
            <div className="max-w-md mx-auto">
              {betaMessage && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  betaMessage.type === 'success' 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {betaMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${
                    betaMessage.type === 'success' ? 'text-green-100' : 'text-red-100'
                  }`}>
                    {betaMessage.text}
                  </p>
                </div>
              )}

              <form onSubmit={handleBetaSignup} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={betaEmail}
                  onChange={(e) => setBetaEmail(e.target.value)}
                  className="flex-1 px-6 py-4 rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-300/50"
                />
                <button
                  type="submit"
                  disabled={betaLoading}
                  className="bg-white text-purple-900 px-8 py-4 rounded-full font-semibold hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {betaLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Request Access'
                  )}
                </button>
              </form>
              <p className="text-purple-200 text-sm mt-4">
                We'll create your account instantly so you can start exploring. No spam, promise.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Book className="w-6 h-6" />
              <span className="text-xl font-serif font-bold">Unbound</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 text-gray-400">
              <p>&copy; 2025 Unbound. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;