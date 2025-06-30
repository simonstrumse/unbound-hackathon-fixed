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
  AlertCircle,
  Search,
  RefreshCw,
  BarChart3,
  UserCheck,
  UserX,
  Shield,
  Crown,
  Settings,
  Eye,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase, Profile, StorySession, ApiUsage } from '../../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PlatformStats {
  totalUsers: number;
  betaApproved: number;
  admins: number;
  superAdmins: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
  newUsersToday: number;
}

interface StoryPopularity {
  title: string;
  author: string;
  sessions: number;
  completionRate: number;
  avgTokens: number;
}

interface UserWithStats extends Profile {
  session_count: number;
  total_tokens: number;
  last_active: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const EnhancedAdminDashboard: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalUsers: 0,
    betaApproved: 0,
    admins: 0,
    superAdmins: 0,
    activeSessions: 0,
    totalTokens: 0,
    totalCost: 0,
    newUsersToday: 0
  });
  const [storyPopularity, setStoryPopularity] = useState<StoryPopularity[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

      console.log('Fetching all admin data...');

      // Fetch all profiles with statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Found profiles:', profiles?.length || 0, profiles);

      // Fetch active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('story_sessions')
        .select(`
          *,
          stories:story_id (
            title,
            author
          )
        `)
        .eq('is_active', true);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      // Fetch API usage
      const { data: apiUsage, error: apiError } = await supabase
        .from('api_usage')
        .select('*');

      if (apiError) {
        console.error('Error fetching API usage:', apiError);
        throw apiError;
      }

      // Fetch all story sessions for completion rates
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('story_sessions')
        .select(`
          *,
          stories:story_id (
            title,
            author
          )
        `);

      if (allSessionsError) {
        console.error('Error fetching all sessions:', allSessionsError);
        throw allSessionsError;
      }

      // Calculate enhanced platform stats with fixed admin counting
      const today = new Date().toISOString().split('T')[0];
      const newUsersToday = profiles?.filter(p => 
        p.created_at.split('T')[0] === today
      ).length || 0;

      const totalTokens = apiUsage?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
      const totalCost = apiUsage?.reduce((sum, usage) => sum + (usage.total_cost || usage.cost_estimate || 0), 0) || 0;

      // Fixed admin counting logic to avoid double-counting
      const superAdminCount = profiles?.filter(p => p.admin_level === 'superadmin').length || 0;
      const regularAdminCount = profiles?.filter(p => 
        (p.admin_level === 'admin' || p.is_admin) && p.admin_level !== 'superadmin'
      ).length || 0;

      console.log('Admin counting breakdown:', {
        totalUsers: profiles?.length || 0,
        superAdmins: superAdminCount,
        regularAdmins: regularAdminCount,
        totalAdmins: superAdminCount + regularAdminCount,
        betaApproved: profiles?.filter(p => p.beta_approved).length || 0
      });

      setPlatformStats({
        totalUsers: profiles?.length || 0,
        betaApproved: profiles?.filter(p => p.beta_approved).length || 0,
        admins: regularAdminCount,
        superAdmins: superAdminCount,
        activeSessions: sessions?.length || 0,
        totalTokens,
        totalCost,
        newUsersToday
      });

      // Calculate story popularity
      const storyMap = new Map<string, {
        title: string;
        author: string;
        totalSessions: number;
        completedSessions: number;
        totalTokens: number;
      }>();

      allSessions?.forEach(session => {
        const story = Array.isArray(session.stories) ? session.stories[0] : session.stories;
        if (story) {
          const existing = storyMap.get(session.story_id) || {
            title: story.title,
            author: story.author,
            totalSessions: 0,
            completedSessions: 0,
            totalTokens: 0
          };
          
          existing.totalSessions++;
          if (!session.is_active) existing.completedSessions++;
          
          storyMap.set(session.story_id, existing);
        }
      });

      // Add token usage for each story
      apiUsage?.forEach(usage => {
        if (usage.session_id) {
          const session = allSessions?.find(s => s.id === usage.session_id);
          if (session) {
            const existing = storyMap.get(session.story_id);
            if (existing) {
              existing.totalTokens += usage.tokens_used;
            }
          }
        }
      });

      const popularStories: StoryPopularity[] = Array.from(storyMap.entries())
        .map(([storyId, data]) => ({
          title: data.title,
          author: data.author,
          sessions: data.totalSessions,
          completionRate: data.totalSessions > 0 ? (data.completedSessions / data.totalSessions) * 100 : 0,
          avgTokens: data.totalSessions > 0 ? Math.round(data.totalTokens / data.totalSessions) : 0
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 10);

      setStoryPopularity(popularStories);

      // Get users with stats - Process ALL users, not just recent ones
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userSessions } = await supabase
            .from('story_sessions')
            .select('updated_at')
            .eq('user_id', profile.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          const { data: userApiUsage } = await supabase
            .from('api_usage')
            .select('tokens_used')
            .eq('user_id', profile.id);

          const sessionCount = userSessions?.length || 0;
          const totalTokens = userApiUsage?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
          const lastActive = userSessions?.[0]?.updated_at || profile.created_at;

          return {
            ...profile,
            session_count: sessionCount,
            total_tokens: totalTokens,
            last_active: lastActive
          };
        })
      );

      console.log('Users with stats:', usersWithStats.length, usersWithStats);

      // Store ALL users instead of filtering
      setAllUsers(usersWithStats);

    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load admin data');
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, updates: Partial<Profile>) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setAllUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, ...updates }
            : user
        )
      );

      // Refresh stats to get accurate counts
      await fetchAdminData();

      const action = updates.beta_approved === false ? 'rejected' : 
                   updates.admin_level === 'admin' ? 'promoted to admin' :
                   updates.admin_level === null && updates.is_admin === false ? 'demoted' :
                   updates.beta_approved === true ? 'approved' : 'updated';

      showNotification(`User ${action} successfully`, 'success');
    } catch (err) {
      console.error('Error updating user status:', err);
      showNotification('Failed to update user status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    fetchAdminData();
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

  const getUserStatusBadge = (user: UserWithStats) => {
    if (user.admin_level === 'superadmin') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-200 text-xs rounded-full">
          <Crown className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    if (user.admin_level === 'admin' || user.is_admin) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (user.beta_approved) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          User
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-200 text-xs rounded-full">
        <XCircle className="w-3 h-3" />
        Pending
      </span>
    );
  };

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? allUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allUsers;

  // Get recent users (approved ones)
  const recentUsers = allUsers
    .filter(u => u.beta_approved)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Get pending users (not approved)
  const pendingUsers = allUsers
    .filter(u => !u.beta_approved)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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
              <span className="text-2xl font-serif font-bold text-white">
                {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
              </span>
              <div className="text-sm text-purple-200 bg-purple-500/20 px-3 py-1 rounded-full">
                Platform Overview
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-100">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Enhanced Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-purple-200 text-sm">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.totalUsers}</p>
            <p className="text-purple-200 text-xs mt-1">
              +{platformStats.newUsersToday} today
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-yellow-400" />
              <span className="text-purple-200 text-sm">Total Admins</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.admins + platformStats.superAdmins}</p>
            <p className="text-purple-200 text-xs mt-1">
              {platformStats.superAdmins} super + {platformStats.admins} regular
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-purple-200 text-sm">Beta Approved</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.betaApproved}</p>
            <p className="text-purple-200 text-xs mt-1">
              {platformStats.totalUsers > 0 ? ((platformStats.betaApproved / platformStats.totalUsers) * 100).toFixed(1) : 0}% approval rate
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-purple-400" />
              <span className="text-purple-200 text-sm">Active Sessions</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.activeSessions}</p>
          </div>
        </div>

        {/* Quick User Search */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-8">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-serif font-bold text-white">Quick User Search</h3>
          </div>
          <div className="p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input
                type="text"
                placeholder="Search for users by email or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {searchTerm && (
              <div className="space-y-3">
                {filteredUsers.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredUsers.slice(0, 5).map((user) => (
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
                            <p className="text-purple-300 text-xs">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getUserStatusBadge(user)}
                          {isSuperAdmin && user.email !== 'simonstrumse@gmail.com' && (
                            <div className="flex gap-2">
                              {!user.beta_approved ? (
                                <button
                                  onClick={() => updateUserStatus(user.id, { beta_approved: true })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3 h-3" />
                                  )}
                                  Approve
                                </button>
                              ) : !user.admin_level && !user.is_admin ? (
                                <button
                                  onClick={() => updateUserStatus(user.id, { 
                                    admin_level: 'admin', 
                                    is_admin: true,
                                    beta_approved: true 
                                  })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Shield className="w-3 h-3" />
                                  )}
                                  Make Admin
                                </button>
                              ) : (user.admin_level === 'admin' || user.is_admin) && (
                                <button
                                  onClick={() => updateUserStatus(user.id, { 
                                    admin_level: null, 
                                    is_admin: false 
                                  })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserX className="w-3 h-3" />
                                  )}
                                  Remove Admin
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length > 5 && (
                      <p className="text-purple-200 text-center text-sm">
                        Showing first 5 of {filteredUsers.length} results.{' '}
                        <Link to="/admin/users" className="text-purple-300 hover:text-white">
                          View all users →
                        </Link>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-purple-200 text-center py-4">
                    No users found matching "{searchTerm}".
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Story Popularity Chart */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Most Popular Stories</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storyPopularity.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="title" 
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="sessions" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Completion Rates */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Story Completion Rates</h3>
            <div className="space-y-4">
              {storyPopularity.slice(0, 5).map((story, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm font-medium">{story.title}</span>
                    <span className="text-purple-200 text-sm">{story.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${story.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link
            to="/admin/analytics"
            className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">Platform Analytics</h3>
            <p className="text-purple-100 leading-relaxed">
              View detailed platform-wide analytics on token usage, user engagement, and system performance.
            </p>
            <div className="mt-4 text-sm text-purple-300">
              Platform-wide data • All users • All activity
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="bg-gradient-to-br from-green-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-2 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-4">User Management</h3>
            <p className="text-purple-100 mb-6 leading-relaxed">
              {isSuperAdmin 
                ? 'Manage all user accounts, beta approvals, and promote users to admin roles.'
                : 'Manage user accounts and beta approvals across the platform.'
              }
            </p>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-green-500/20 text-green-200 text-sm rounded-full">
                {platformStats.betaApproved} Approved
              </span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-200 text-sm rounded-full">
                {platformStats.totalUsers - platformStats.betaApproved} Pending
              </span>
            </div>
          </Link>

          {isSuperAdmin && (
            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white mb-4">Super Admin Powers</h3>
              <p className="text-purple-100 mb-6 leading-relaxed">
                Promote users to admin roles, manage all platform settings, and maintain system integrity.
              </p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-200 text-sm rounded-full">
                  {platformStats.superAdmins} Super Admins
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-200 text-sm rounded-full">
                  {platformStats.admins} Admins
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Users & Pending Approvals */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-white">Recent Users</h3>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentUsers.length > 0 ? recentUsers.map((user) => (
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
                      {getUserStatusBadge(user)}
                      <p className="text-purple-200 text-xs mt-1">
                        {user.session_count} sessions • {user.total_tokens} tokens
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-purple-200 text-center py-8">No approved users yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-serif font-bold text-white">Pending Beta Approvals</h3>
            </div>
            <div className="p-6">
              {pendingUsers.length === 0 ? (
                <p className="text-purple-200 text-center py-8">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
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
                          onClick={() => updateUserStatus(user.id, { beta_approved: true })}
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
                          onClick={() => updateUserStatus(user.id, { beta_approved: false })}
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
      </main>
    </div>
  );
};

export default EnhancedAdminDashboard;