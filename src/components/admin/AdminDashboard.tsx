import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  XCircle, 
  Activity,
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile, StorySession, ApiUsage } from '../../lib/supabase';

interface UserStats {
  totalUsers: number;
  betaApproved: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
}

interface RecentUser extends Profile {
  session_count: number;
  total_tokens: number;
}

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    betaApproved: 0,
    activeSessions: 0,
    totalTokens: 0,
    totalCost: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('story_sessions')
        .select('*')
        .eq('is_active', true);

      if (sessionsError) throw sessionsError;

      // Fetch API usage
      const { data: apiUsage, error: apiError } = await supabase
        .from('api_usage')
        .select('*');

      if (apiError) throw apiError;

      // Calculate stats
      const totalTokens = apiUsage?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
      const totalCost = apiUsage?.reduce((sum, usage) => sum + (usage.cost_estimate || 0), 0) || 0;

      setUserStats({
        totalUsers: profiles?.length || 0,
        betaApproved: profiles?.filter(p => p.beta_approved).length || 0,
        activeSessions: sessions?.length || 0,
        totalTokens,
        totalCost
      });

      // Get recent users with stats
      const usersWithStats = await Promise.all(
        (profiles || []).slice(0, 10).map(async (profile) => {
          const { data: userSessions } = await supabase
            .from('story_sessions')
            .select('id')
            .eq('user_id', profile.id);

          const { data: userApiUsage } = await supabase
            .from('api_usage')
            .select('tokens_used')
            .eq('user_id', profile.id);

          return {
            ...profile,
            session_count: userSessions?.length || 0,
            total_tokens: userApiUsage?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0
          };
        })
      );

      setRecentUsers(usersWithStats);

      // Get pending approvals
      const pendingUsers = profiles?.filter(p => !p.beta_approved) || [];
      setPendingApprovals(pendingUsers);

    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateBetaStatus = async (userId: string, approved: boolean) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('profiles')
        .update({ beta_approved: approved })
        .eq('id', userId);

      if (error) throw error;

      // Refresh data
      await fetchAdminData();
    } catch (err) {
      console.error('Error updating beta status:', err);
      setError('Failed to update beta status');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-purple-100 mb-4">You don't have admin permissions.</p>
          <Link to="/dashboard" className="text-purple-300 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-white" />
              <span className="text-2xl font-serif font-bold text-white">Admin Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-purple-200 text-sm">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{userStats.totalUsers}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-purple-200 text-sm">Beta Approved</span>
            </div>
            <p className="text-3xl font-bold text-white">{userStats.betaApproved}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-yellow-400" />
              <span className="text-purple-200 text-sm">Active Sessions</span>
            </div>
            <p className="text-3xl font-bold text-white">{userStats.activeSessions}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <span className="text-purple-200 text-sm">Total Tokens</span>
            </div>
            <p className="text-3xl font-bold text-white">{userStats.totalTokens.toLocaleString()}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-green-400" />
              <span className="text-purple-200 text-sm">Total Cost</span>
            </div>
            <p className="text-3xl font-bold text-white">${userStats.totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-white">Recent Users</h3>
                <Link
                  to="/admin/analytics"
                  className="text-purple-300 hover:text-white transition-colors text-sm"
                >
                  View Analytics →
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-purple-200 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        {user.beta_approved ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-purple-200 text-sm">
                          {user.beta_approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-purple-200 text-xs">
                        {user.session_count} sessions • {user.total_tokens} tokens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-serif font-bold text-white">Pending Beta Approvals</h3>
            </div>
            <div className="p-6">
              {pendingApprovals.length === 0 ? (
                <p className="text-purple-200 text-center py-8">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-purple-200 text-sm">{user.email}</p>
                          <p className="text-purple-200 text-xs">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBetaStatus(user.id, true)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => updateBetaStatus(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Link
            to="/admin/analytics"
            className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Usage Analytics</h3>
            <p className="text-purple-100 leading-relaxed">
              View detailed analytics on token usage, user engagement, and platform performance over time.
            </p>
          </Link>

          <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">User Management</h3>
            <p className="text-purple-100 mb-6 leading-relaxed">
              Manage user accounts, beta approvals, and access permissions across the platform.
            </p>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-green-500/20 text-green-200 text-sm rounded-full">
                {userStats.betaApproved} Approved
              </span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-200 text-sm rounded-full">
                {pendingApprovals.length} Pending
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;