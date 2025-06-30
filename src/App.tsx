import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import SignUpPage from './components/auth/SignUpPage';
import SignInPage from './components/auth/SignInPage';
import Dashboard from './components/Dashboard';
import Stories from './components/Stories';
import CharacterCreation from './components/CharacterCreation';
import Game from './components/Game';
import UserAnalytics from './components/UserAnalytics';
import GlobalAnalytics from './components/GlobalAnalytics';
import AdminDashboard from './components/admin/AdminDashboard';
import EnhancedAdminDashboard from './components/admin/EnhancedAdminDashboard';
import AdminAnalytics from './components/admin/AdminAnalytics';
import AdminUserManagement from './components/admin/AdminUserManagement';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, profile } = useAuth();
  const [showSkip, setShowSkip] = useState(false);
  const navigate = useNavigate();

  console.log('ProtectedRoute - User:', !!user, 'Profile:', !!profile, 'Loading:', loading);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !showSkip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Loading...</div>
          {window.location.search.includes('debug=true') && (
            <div className="text-purple-200 text-sm">
              User: {user ? 'Yes' : 'No'} | Profile: {profile ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && showSkip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading is taking longer than expected...</div>
          <button
            onClick={() => navigate('/signin')}
            className="bg-white text-purple-900 px-6 py-2 rounded-lg hover:bg-purple-50 transition-colors"
          >
            Go to Sign In
          </button>
          {window.location.search.includes('debug=true') && (
            <div className="text-purple-200 text-sm mt-4">
              User: {user ? 'Yes' : 'No'} | Profile: {profile ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to signin');
    return <Navigate to="/signin" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// Public Route Component (redirect if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('PublicRoute - User:', !!user, 'Loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // For signup/signin routes, redirect to dashboard if already logged in
  if (user && (window.location.pathname === '/signin' || window.location.pathname === '/signup')) {
    console.log('PublicRoute - User logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Landing page - accessible to everyone */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth routes - redirect if logged in */}
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <SignUpPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/signin"
                element={
                  <PublicRoute>
                    <SignInPage />
                  </PublicRoute>
                }
              />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stories"
                element={
                  <ProtectedRoute>
                    <Stories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <UserAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/global"
                element={
                  <AdminRoute>
                    <GlobalAnalytics />
                  </AdminRoute>
                }
              />
              
              {/* NEW: Character creation without session (story-first flow) */}
              <Route
                path="/character-creation/story/:storyId"
                element={
                  <ProtectedRoute>
                    <CharacterCreation />
                  </ProtectedRoute>
                }
              />
              
              {/* LEGACY: Character creation with session (for existing sessions) */}
              <Route
                path="/character-creation/:sessionId/:storyId"
                element={
                  <ProtectedRoute>
                    <CharacterCreation />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/game/:sessionId"
                element={
                  <ProtectedRoute>
                    <Game />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <EnhancedAdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <AdminAnalytics />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUserManagement />
                  </AdminRoute>
                }
              />
              
              {/* Catch all - redirect to landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;