import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.username) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    try {
      setLoading(true);
      const { error } = await signUp(formData.email, formData.password, formData.username);
      
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
          <h2 className="text-3xl font-mono font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Join Unbound</h2>
          <p className="text-[#666666] font-mono">Create your account to start your literary adventure</p>
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
              <label htmlFor="username" className="block text-sm font-mono text-[#1A1A1A] mb-2">
                Username
              </label>
              <div className="relative flex items-center">
                <User className="w-5 h-5 text-[#666666] mr-3" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input-typewriter flex-1 font-mono"
                  placeholder="Choose a username"
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
                  placeholder="Create a password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-mono text-[#1A1A1A] mb-2">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-[#666666] mr-3" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-typewriter flex-1 font-mono"
                  placeholder="Confirm your password"
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
                  <span className="loading-typewriter">Creating Account</span>
                </>
              ) : (
                '> Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#666666] font-mono">
              Already have an account?{' '}
              <Link to="/signin" className="text-[#2B6CB0] hover:underline font-mono">
                Sign in
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

export default SignUpPage;