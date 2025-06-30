import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] paper-texture flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-[#FAFAF8] border-4 border-[#1A1A1A] mb-6 hover:bg-[#1A1A1A] hover:text-[#FAFAF8] transition-colors">
            <Book className="w-8 h-8" />
          </Link>
          <h2 className="text-3xl font-mono font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Welcome Back</h2>
          <p className="text-[#666666] font-mono">Sign in to continue your literary journey</p>
        </div>

        <div className="card-typewriter">
          {error && (
            <div className="mb-6 p-4 bg-[#E53E3E] border-2 border-[#1A1A1A] text-[#FAFAF8] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-mono">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-mono text-[#1A1A1A] mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 text-[#666666] mr-3" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-typewriter flex-1 font-mono"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-mono text-[#1A1A1A] mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-[#666666] mr-3" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-typewriter flex-1 font-mono"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-typewriter-blue w-full py-3 px-4 font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="loading-typewriter">Signing In</span>
                </>
              ) : (
                '> Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#666666] font-mono">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#2B6CB0] hover:underline font-mono">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-[#2B6CB0] hover:underline font-mono">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;