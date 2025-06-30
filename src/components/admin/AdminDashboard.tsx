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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E53E3E] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Access Denied</h2>
          <p className="text-[#1A1A1A] mb-4 font-light">You don't have admin permissions.</p>
          <Link to="/dashboard" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8]">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading admin dashboard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] admin-page">
      {/* Header */}
      <header className="typewriter-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">Admin Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 typewriter-card typewriter-error flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#E53E3E] flex-shrink-0" />
            <p className="text-[#E53E3E]">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Users</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.totalUsers}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Beta Approved</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.betaApproved}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Active Sessions</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.activeSessions}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Tokens</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.totalTokens.toLocaleString()}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">${userStats.totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <div className="typewriter-card">
            <div className="p-4 border-b-2 border-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-[#1A1A1A]">Recent Users</h3>
                <Link
                  to="/admin/analytics"
                  className="text-[#2B6CB0] hover:text-[#FAFAF8] hover:bg-[#1A1A1A] text-sm"
                >
                  View Analytics →
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-[#E5E5E5] border border-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[#1A1A1A] font-medium">{user.username}</p>
                        <p className="text-[#1A1A1A] text-sm font-light">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        {user.beta_approved ? (
                          <CheckCircle className="w-4 h-4 text-[#2B6CB0]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#E53E3E]" />
                        )}
                        <span className="text-[#1A1A1A] text-sm font-light">
                          {user.beta_approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[#1A1A1A] text-xs font-light">
                        {user.session_count} sessions • {user.total_tokens} tokens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="typewriter-card">
            <div className="p-4 border-b-2 border-[#1A1A1A]">
              <h3 className="text-xl font-medium text-[#1A1A1A]">Pending Beta Approvals</h3>
            </div>
            <div className="p-6">
              {pendingApprovals.length === 0 ? (
                <p className="text-[#1A1A1A] text-center py-8 font-light">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-[#E5E5E5] border border-[#1A1A1A]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-[#1A1A1A] font-medium">{user.username}</p>
                          <p className="text-[#1A1A1A] text-sm font-light">{user.email}</p>
                          <p className="text-[#1A1A1A] text-xs font-light">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBetaStatus(user.id, true)}
                          disabled={actionLoading === user.id}
                          className="typewriter-btn bg-[#2B6CB0] border-[#2B6CB0] text-[#FAFAF8] flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          {actionLoading === user.id ? (
                            <span className="loading-dots">Working</span>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => updateBetaStatus(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="typewriter-btn bg-[#E53E3E] border-[#E53E3E] text-[#FAFAF8] flex items-center gap-1 text-sm disabled:opacity-50"
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
            className="typewriter-card border-4 border-[#1A1A1A]"
          >
            <div className="w-16 h-16 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">Usage Analytics</h3>
            <p className="text-[#1A1A1A] leading-relaxed font-light">
              View detailed analytics on token usage, user engagement, and platform performance over time.
            </p>
          </Link>

          <div className="typewriter-card border-4 border-[#1A1A1A]">
            <div className="w-16 h-16 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">User Management</h3>
            <p className="text-[#1A1A1A] mb-6 leading-relaxed font-light">
              Manage user accounts, beta approvals, and access permissions across the platform.
            </p>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-[#2B6CB0] text-[#FAFAF8] text-sm inline-block">
                {userStats.betaApproved} Approved
              </span>
              <span className="px-3 py-1 bg-[#E53E3E] text-[#FAFAF8] text-sm inline-block">
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