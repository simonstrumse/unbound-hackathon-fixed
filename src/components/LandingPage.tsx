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
    <div className="min-h-screen bg-literary-gradient paper-texture">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-literary-dark overflow-hidden">
        {/* Header for logged-in users */}
        {user && !authLoading && (
          <header className="absolute top-0 left-0 right-0 z-20 bg-charcoal/80 backdrop-blur-sm border-b border-antique-gold/20">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-8 h-8 text-antique-gold" />
                  <span className="text-xl sm:text-2xl font-display font-bold text-warm-white">Unbound</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  {profile && (
                    <div className="flex items-center gap-2 sm:gap-3 text-warm-white">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-burgundy to-burgundy-light rounded-full flex items-center justify-center border border-antique-gold/30">
                        <span className="text-sm font-bold font-display">
                          {profile.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm hidden sm:inline font-reading">Welcome back, {profile.username}!</span>
                      <span className="text-xs sm:hidden font-reading">Welcome back!</span>
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-burgundy/20 hover:bg-burgundy/30 text-warm-white border border-antique-gold/30 transition-colors text-sm sm:text-base font-ui"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Floating Book Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 opacity-30 animate-pulse">
            <Book className="w-8 h-8 text-antique-gold transform rotate-12" />
          </div>
          <div className="absolute top-40 right-20 opacity-40 animate-bounce">
            <BookOpen className="w-6 h-6 text-sepia transform -rotate-12" />
          </div>
          <div className="absolute bottom-40 left-20 opacity-35 animate-pulse delay-300">
            <Feather className="w-10 h-10 text-antique-gold transform rotate-45" />
          </div>
          <div className="absolute top-60 right-40 opacity-30 animate-bounce delay-500">
            <Star className="w-5 h-5 text-sepia transform rotate-12" />
          </div>
        </div>

        <div className={`relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 ${user ? 'pt-20' : ''}`}>
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-antique-gold/20 border-2 border-antique-gold/40 backdrop-blur-sm mb-6">
                <Book className="w-10 h-10 text-antique-gold" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-warm-white mb-6 leading-tight">
              Step Into Your
              <span className="block bg-gradient-to-r from-antique-gold to-sepia bg-clip-text text-transparent">
                Favorite Stories
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-sepia-light mb-8 max-w-3xl mx-auto leading-relaxed font-reading">
              Create your own character and experience classic literature through 
              interactive conversations with beloved characters from famous books.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {authLoading ? (
                <div className="bg-antique-gold/20 text-warm-white px-8 py-4 font-semibold text-lg backdrop-blur-sm flex items-center gap-2 border border-antique-gold/30 font-ui">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </div>
              ) : user ? (
                <>
                  <button
                    onClick={handleContinueAdventure}
                    className="btn-literary px-8 py-4 font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl font-ui"
                  >
                    Continue Your Adventure
                  </button>
                  {profile && !profile.beta_approved && (
                    <div className="bg-forest/20 text-forest-light px-6 py-3 text-sm backdrop-blur-sm border border-forest/30 font-ui">
                      Beta access pending approval
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/signin"
                  className="btn-literary px-8 py-4 font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl font-ui"
                >
                  Start Your Adventure
                </Link>
              )}
              {!user && !authLoading && (
                <button className="btn-secondary px-8 py-4 font-semibold text-lg transition-all duration-300 backdrop-blur-sm font-ui">
                  Learn More
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-warm-white paper-texture">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-4">
              Your Literary Journey Awaits
            </h2>
            <p className="text-xl text-charcoal/70 max-w-3xl mx-auto font-reading">
              Experience stories like never before with our AI-powered platform that adapts to your choices and creativity.
            </p>
            <div className="ornamental-divider"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group literary-card p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-burgundy to-burgundy-light flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-antique-gold/30">
                <Sparkles className="w-8 h-8 text-warm-white" />
              </div>
              <h3 className="text-2xl font-display font-bold text-charcoal mb-4">Three Creativity Levels</h3>
              <p className="text-charcoal/70 leading-relaxed font-reading">
                Choose your adventure style: stay true to the original story, explore with balanced freedom, 
                or unleash complete creative control over your narrative journey.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group literary-card p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-forest to-forest-light flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-antique-gold/30">
                <MessageCircle className="w-8 h-8 text-warm-white" />
              </div>
              <h3 className="text-2xl font-display font-bold text-charcoal mb-4">AI-Powered Conversations</h3>
              <p className="text-charcoal/70 leading-relaxed font-reading">
                Engage in natural dialogues with literary characters who respond authentically while 
                maintaining their unique personalities and staying true to their stories.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group literary-card p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-antique-gold to-antique-gold-light flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-burgundy/30">
                <User className="w-8 h-8 text-charcoal" />
              </div>
              <h3 className="text-2xl font-display font-bold text-charcoal mb-4">Your Story, Your Way</h3>
              <p className="text-charcoal/70 leading-relaxed font-reading">
                Create unique characters with distinct personality traits and watch as your choices 
                shape the narrative, creating a truly personalized literary experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-sepia-light paper-texture">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-4">
              How It Works
            </h2>
            <p className="text-xl text-charcoal/70 font-reading">
              Four simple steps to begin your literary adventure
            </p>
            <div className="ornamental-divider"></div>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-burgundy to-burgundy-light flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border-2 border-antique-gold/40">
                <BookOpen className="w-10 h-10 text-warm-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3 font-display">Choose Your Story</h3>
              <p className="text-charcoal/70 font-reading">
                Select from our curated library of classic literature and timeless tales.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-forest to-forest-light flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border-2 border-antique-gold/40">
                <User className="w-10 h-10 text-warm-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3 font-display">Create Your Character</h3>
              <p className="text-charcoal/70 font-reading">
                Design a unique character with personality traits that will shape your journey.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-antique-gold to-antique-gold-light flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border-2 border-burgundy/40">
                <MessageCircle className="w-10 h-10 text-charcoal" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3 font-display">Start Conversations</h3>
              <p className="text-charcoal/70 font-reading">
                Engage with beloved characters in natural, flowing conversations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-leather to-burgundy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border-2 border-antique-gold/40">
                <Sparkles className="w-10 h-10 text-warm-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3 font-display">Shape the Narrative</h3>
              <p className="text-charcoal/70 font-reading">
                Watch as your choices and decisions influence the story's direction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-warm-white paper-texture">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-4">
              Explore Classic Tales
            </h2>
            <p className="text-xl text-charcoal/70 font-reading">
              Step into these beloved stories and create your own adventure
            </p>
            <div className="ornamental-divider"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pride and Prejudice */}
            <div className="group literary-card overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-burgundy to-burgundy-light flex items-center justify-center">
                <div className="text-center text-warm-white">
                  <Book className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-display text-sm">Jane Austen</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-display font-bold text-charcoal mb-3">Pride and Prejudice</h3>
                <p className="text-charcoal/70 mb-4 font-reading">
                  Navigate the complex social world of Regency England, where wit and romance 
                  intertwine in the drawing rooms of the English countryside.
                </p>
                <button className="flex items-center gap-2 text-burgundy font-semibold hover:text-burgundy-light transition-colors font-ui">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Great Gatsby */}
            <div className="group literary-card overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-forest to-forest-light flex items-center justify-center">
                <div className="text-center text-warm-white">
                  <Sparkles className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-display text-sm">F. Scott Fitzgerald</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-display font-bold text-charcoal mb-3">The Great Gatsby</h3>
                <p className="text-charcoal/70 mb-4 font-reading">
                  Experience the glittering world of the Jazz Age, where dreams and reality 
                  collide in the lavish parties of West Egg.
                </p>
                <button className="flex items-center gap-2 text-forest font-semibold hover:text-forest-light transition-colors font-ui">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alice in Wonderland */}
            <div className="group literary-card overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-gradient-to-br from-antique-gold to-antique-gold-light flex items-center justify-center">
                <div className="text-center text-charcoal">
                  <Heart className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-display text-sm">Lewis Carroll</p>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-display font-bold text-charcoal mb-3">Alice in Wonderland</h3>
                <p className="text-charcoal/70 mb-4 font-reading">
                  Tumble down the rabbit hole into a whimsical world where logic bends 
                  and imagination reigns supreme in curious adventures.
                </p>
                <button className="flex items-center gap-2 text-antique-gold font-semibold hover:text-antique-gold-light transition-colors font-ui">
                  Begin Adventure <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Access Section - Only show if not logged in */}
      {!user && !authLoading && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-literary-dark">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-antique-gold/20 border-2 border-antique-gold/40 backdrop-blur-sm mb-6">
                <Mail className="w-8 h-8 text-antique-gold" />
              </div>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-warm-white mb-6">
              Request Beta Access
            </h2>
            <p className="text-xl text-sepia-light mb-8 font-reading">
              Be among the first to step into your favorite stories. Beta spaces are limited.
            </p>
            
            <div className="max-w-md mx-auto">
              {betaMessage && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  betaMessage.type === 'success' 
                    ? 'bg-forest/20 border border-forest/30' 
                    : 'bg-burgundy/20 border border-burgundy/30'
                }`}>
                  {betaMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-forest-light flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-burgundy-light flex-shrink-0" />
                  )}
                  <p className={`text-sm ${
                    betaMessage.type === 'success' ? 'text-forest-light' : 'text-burgundy-light'
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
                  className="flex-1 px-6 py-4 input-literary focus-literary font-reading"
                />
                <button
                  type="submit"
                  disabled={betaLoading}
                  className="btn-literary px-8 py-4 font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-ui"
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
              <p className="text-sepia-light text-sm mt-4 font-reading">
                We'll create your account instantly so you can start exploring. No spam, promise.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-charcoal text-warm-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Book className="w-6 h-6 text-antique-gold" />
              <span className="text-xl font-display font-bold">Unbound</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 text-sepia">
              <p className="font-ui">&copy; 2025 Unbound. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-antique-gold transition-colors font-ui">Terms</a>
                <a href="#" className="hover:text-antique-gold transition-colors font-ui">Privacy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;