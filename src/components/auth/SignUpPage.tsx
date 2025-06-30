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
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 border-2 border-[#1A1A1A] bg-[#FAFAF8] mb-6 typewriter-hover">
            <Book className="w-8 h-8 text-[#1A1A1A]" />
          </Link>
          <h2 className="text-3xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Join Unbound</h2>
          <div className="ascii-divider mb-4"></div>
          <p className="text-[#1A1A1A] font-light">Create your account to start your literary adventure</p>
        </div>

        <div className="typewriter-form">
          {error && (
            <div className="mb-6 p-4 typewriter-card typewriter-error flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#E53E3E] flex-shrink-0" />
              <p className="text-[#E53E3E] text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="typewriter-form-field">
              <label htmlFor="email" className="typewriter-form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1A1A1A]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-8 typewriter-input"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="typewriter-form-field">
              <label htmlFor="username" className="typewriter-form-label">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1A1A1A]" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-8 typewriter-input"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="typewriter-form-field">
              <label htmlFor="password" className="typewriter-form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1A1A1A]" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-8 typewriter-input"
                  placeholder="Create a password"
                />
              </div>
            </div>

            <div className="typewriter-form-field">
              <label htmlFor="confirmPassword" className="typewriter-form-label">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#1A1A1A]" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-8 typewriter-input"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full typewriter-btn-primary py-3 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="loading-dots">Creating Account</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#1A1A1A] font-light">
              Already have an account?{' '}
              <Link to="/signin" className="text-[#2B6CB0] typewriter-hover font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-[#2B6CB0] typewriter-hover">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;