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
    <div className="min-h-screen bg-[#FAFAF8] paper-texture">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-[#FAFAF8] overflow-hidden">
        {/* Header for logged-in users */}
        {user && !authLoading && (
          <header className="absolute top-0 left-0 right-0 z-20 bg-[#FAFAF8] border-b-2 border-[#1A1A1A]">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-8 h-8 text-[#1A1A1A]" />
                  <span className="text-xl sm:text-2xl font-mono font-medium text-[#1A1A1A] typewriter-cursor">Unbound</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  {profile && (
                    <div className="flex items-center gap-2 sm:gap-3 text-[#1A1A1A]">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#2B6CB0] border-2 border-[#1A1A1A] flex items-center justify-center">
                        <span className="text-sm font-mono text-[#FAFAF8]">
                          {profile.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm hidden sm:inline font-mono">Welcome back, {profile.username}!</span>
                      <span className="text-xs sm:hidden font-mono">Welcome back!</span>
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="btn-typewriter flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}


        <div className={`relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 ${user ? 'pt-20' : ''}`}>
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FAFAF8] border-4 border-[#1A1A1A] mb-6">
                <Book className="w-10 h-10 text-[#1A1A1A]" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-mono font-medium text-[#1A1A1A] mb-6 leading-tight typewriter-cursor">
              Step Into Your
              <span className="block text-[#2B6CB0] underline decoration-4">
                Favorite Stories
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-[#1A1A1A] mb-8 max-w-3xl mx-auto leading-relaxed font-mono">
              Create your own character and experience classic literature through 
              interactive conversations with beloved characters from famous books.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {authLoading ? (
                <div className="btn-typewriter px-8 py-4 font-mono text-lg flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </div>
              ) : user ? (
                <>
                  <button
                    onClick={handleContinueAdventure}
                    className="btn-typewriter-blue px-8 py-4 font-mono text-lg"
                  >
                    Continue Your Adventure
                  </button>
                  {profile && !profile.beta_approved && (
                    <div className="bg-[#E53E3E] text-[#FAFAF8] px-6 py-3 text-sm border-2 border-[#1A1A1A] font-mono">
                      Beta access pending approval
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/signin"
                  className="btn-typewriter-blue px-8 py-4 font-mono text-lg"
                >
                  Start Your Adventure
                </Link>
              )}
              {!user && !authLoading && (
                <button className="btn-typewriter px-8 py-4 font-mono text-lg">
                  Learn More
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="divider-ascii"></div>
            <h2 className="text-4xl sm:text-5xl font-mono font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
              Your Literary Journey Awaits
            </h2>
            <p className="text-xl text-[#666666] max-w-3xl mx-auto font-mono">
              Experience stories like never before with our AI-powered platform that adapts to your choices and creativity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-typewriter">
              <div className="w-16 h-16 bg-[#2B6CB0] border-2 border-[#1A1A1A] flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-[#FAFAF8]" />
              </div>
              <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-4">[Three Creativity Levels]</h3>
              <p className="text-[#666666] leading-relaxed font-mono">
                Choose your adventure style: stay true to the original story, explore with balanced freedom, 
                or unleash complete creative control over your narrative journey.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-typewriter">
              <div className="w-16 h-16 bg-[#E53E3E] border-2 border-[#1A1A1A] flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8 text-[#FAFAF8]" />
              </div>
              <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-4">[AI-Powered Conversations]</h3>
              <p className="text-[#666666] leading-relaxed font-mono">
                Engage in natural dialogues with literary characters who respond authentically while 
                maintaining their unique personalities and staying true to their stories.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-typewriter">
              <div className="w-16 h-16 bg-[#1A1A1A] border-2 border-[#1A1A1A] flex items-center justify-center mb-6">
                <User className="w-8 h-8 text-[#FAFAF8]" />
              </div>
              <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-4">[Your Story, Your Way]</h3>
              <p className="text-[#666666] leading-relaxed font-mono">
                Create unique characters with distinct personality traits and watch as your choices 
                shape the narrative, creating a truly personalized literary experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#E5E5E5]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="divider-dashes"></div>
            <h2 className="text-4xl sm:text-5xl font-mono font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
              How It Works
            </h2>
            <p className="text-xl text-[#666666] font-mono">
              Four simple steps to begin your literary adventure
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#2B6CB0] border-4 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-[#FAFAF8]" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#1A1A1A] mb-3">> Choose Your Story</h3>
              <p className="text-[#666666] font-mono">
                Select from our curated library of classic literature and timeless tales.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#E53E3E] border-4 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-[#FAFAF8]" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#1A1A1A] mb-3">> Create Your Character</h3>
              <p className="text-[#666666] font-mono">
                Design a unique character with personality traits that will shape your journey.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1A1A1A] border-4 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-[#FAFAF8]" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#1A1A1A] mb-3">> Start Conversations</h3>
              <p className="text-[#666666] font-mono">
                Engage with beloved characters in natural, flowing conversations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-[#666666] border-4 border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#FAFAF8]" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#1A1A1A] mb-3">> Shape the Narrative</h3>
              <p className="text-[#666666] font-mono">
                Watch as your choices and decisions influence the story's direction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="divider-ascii"></div>
            <h2 className="text-4xl sm:text-5xl font-mono font-medium text-[#1A1A1A] mb-4 typewriter-cursor">
              Explore Classic Tales
            </h2>
            <p className="text-xl text-[#666666] font-mono">
              Step into these beloved stories and create your own adventure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pride and Prejudice */}
            <div className="card-typewriter">
              <div className="h-48 bg-[#E5E5E5] border-b-2 border-[#1A1A1A] flex items-center justify-center">
                <div className="text-center text-[#1A1A1A]">
                  <Book className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-mono text-sm">Jane Austen</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-3">[Pride and Prejudice]</h3>
                <p className="text-[#666666] mb-4 font-mono">
                  Navigate the complex social world of Regency England, where wit and romance 
                  intertwine in the drawing rooms of the English countryside.
                </p>
                <button className="flex items-center gap-2 text-[#2B6CB0] font-mono hover:underline">
                  > Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Great Gatsby */}
            <div className="card-typewriter">
              <div className="h-48 bg-[#E5E5E5] border-b-2 border-[#1A1A1A] flex items-center justify-center">
                <div className="text-center text-[#1A1A1A]">
                  <Sparkles className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-mono text-sm">F. Scott Fitzgerald</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-3">[The Great Gatsby]</h3>
                <p className="text-[#666666] mb-4 font-mono">
                  Experience the glittering world of the Jazz Age, where dreams and reality 
                  collide in the lavish parties of West Egg.
                </p>
                <button className="flex items-center gap-2 text-[#2B6CB0] font-mono hover:underline">
                  > Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alice in Wonderland */}
            <div className="card-typewriter">
              <div className="h-48 bg-[#E5E5E5] border-b-2 border-[#1A1A1A] flex items-center justify-center">
                <div className="text-center text-[#1A1A1A]">
                  <Heart className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-mono text-sm">Lewis Carroll</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-mono font-medium text-[#1A1A1A] mb-3">[Alice in Wonderland]</h3>
                <p className="text-[#666666] mb-4 font-mono">
                  Tumble down the rabbit hole into a whimsical world where logic bends 
                  and imagination reigns supreme in curious adventures.
                </p>
                <button className="flex items-center gap-2 text-[#2B6CB0] font-mono hover:underline">
                  > Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Access Section - Only show if not logged in */}
      {!user && !authLoading && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1A1A1A]">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FAFAF8] border-4 border-[#FAFAF8] mb-6">
                <Mail className="w-8 h-8 text-[#1A1A1A]" />
              </div>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-mono font-medium text-[#FAFAF8] mb-6 typewriter-cursor">
              Request Beta Access
            </h2>
            <p className="text-xl text-[#E5E5E5] mb-8 font-mono">
              Be among the first to step into your favorite stories. Beta spaces are limited.
            </p>
            
            <div className="max-w-md mx-auto">
              {betaMessage && (
                <div className={`mb-6 p-4 border-2 border-[#FAFAF8] flex items-center gap-3 ${
                  betaMessage.type === 'success' 
                    ? 'bg-[#2B6CB0] text-[#FAFAF8]' 
                    : 'bg-[#E53E3E] text-[#FAFAF8]'
                }`}>
                  {betaMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-[#FAFAF8] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#FAFAF8] flex-shrink-0" />
                  )}
                  <p className="text-sm font-mono">
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
                  className="input-typewriter flex-1 px-6 py-4 bg-[#FAFAF8] text-[#1A1A1A] placeholder-[#666666] font-mono"
                />
                <button
                  type="submit"
                  disabled={betaLoading}
                  className="btn-typewriter-blue px-8 py-4 font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <p className="text-[#E5E5E5] text-sm mt-4 font-mono">
                We'll create your account instantly so you can start exploring. No spam, promise.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-[#FAFAF8] py-12 px-4 sm:px-6 lg:px-8 border-t-2 border-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Book className="w-6 h-6" />
              <span className="text-xl font-mono font-medium">Unbound</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 text-[#E5E5E5] font-mono">
              <p>(c) 2025 Unbound. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:underline">Terms</a>
                <span>|</span>
                <a href="#" className="hover:underline">Privacy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;