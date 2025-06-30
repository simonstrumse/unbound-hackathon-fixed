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

  const getUserStatusBadge = (user: UserWithStats) => {
    if (user.admin_level === 'superadmin') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-xs">
          <Crown className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    if (user.admin_level === 'admin' || user.is_admin) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-xs">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (user.beta_approved) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-xs">
          <CheckCircle className="w-3 h-3" />
          User
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-[#E53E3E] text-[#FAFAF8] text-xs">
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
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">
                {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
              </span>
              <div className="text-sm text-[#1A1A1A] bg-[#E5E5E5] px-3 py-1">
                Platform Overview
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 typewriter-card typewriter-error flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#E53E3E] flex-shrink-0" />
              <p className="text-[#E53E3E]">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="typewriter-btn"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Enhanced Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Users</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.totalUsers}</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              +{platformStats.newUsersToday} today
            </p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Admins</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.admins + platformStats.superAdmins}</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              {platformStats.superAdmins} super + {platformStats.admins} regular
            </p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Beta Approved</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.betaApproved}</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              {platformStats.totalUsers > 0 ? ((platformStats.betaApproved / platformStats.totalUsers) * 100).toFixed(1) : 0}% approval rate
            </p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Active Sessions</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.activeSessions}</p>
          </div>
        </div>

        {/* Quick User Search */}
        <div className="typewriter-card mb-8">
          <div className="p-6 border-b-2 border-[#1A1A1A]">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Quick User Search</h3>
          </div>
          <div className="p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1A1A1A]" />
              <input
                type="text"
                placeholder="Search for users by email or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 typewriter-input text-[#1A1A1A]"
              />
            </div>
            
            {searchTerm && (
              <div className="space-y-3">
                {filteredUsers.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-[#E5E5E5]">
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
                        <div className="flex items-center gap-3">
                          {getUserStatusBadge(user)}
                          {isSuperAdmin && user.email !== 'simonstrumse@gmail.com' && (
                            <div className="flex gap-2">
                              {!user.beta_approved ? (
                                <button
                                  onClick={() => updateUserStatus(user.id, { beta_approved: true })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 typewriter-btn-primary text-sm disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <span className="loading-dots">Working</span>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3" />
                                      Approve
                                    </>
                                  )}
                                </button>
                              ) : !user.admin_level && !user.is_admin ? (
                                <button
                                  onClick={() => updateUserStatus(user.id, { 
                                    admin_level: 'admin', 
                                    is_admin: true,
                                    beta_approved: true 
                                  })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 typewriter-btn text-sm disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <span className="loading-dots">Working</span>
                                  ) : (
                                    <>
                                      <Shield className="w-3 h-3" />
                                      Make Admin
                                    </>
                                  )}
                                </button>
                              ) : (user.admin_level === 'admin' || user.is_admin) && (
                                <button
                                  onClick={() => updateUserStatus(user.id, { 
                                    admin_level: null, 
                                    is_admin: false 
                                  })}
                                  disabled={actionLoading === user.id}
                                  className="flex items-center gap-1 typewriter-btn bg-[#E53E3E] border-[#E53E3E] text-[#FAFAF8] disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <span className="loading-dots">Working</span>
                                  ) : (
                                    <>
                                      <UserX className="w-3 h-3" />
                                      Remove Admin
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length > 5 && (
                      <p className="text-[#1A1A1A] text-center text-sm font-light">
                        Showing first 5 of {filteredUsers.length} results.{' '}
                        <Link to="/admin/users" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8]">
                          View all users →
                        </Link>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[#1A1A1A] text-center py-4 font-light">
                    No users found matching "{searchTerm}".
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Story Popularity Chart */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Most Popular Stories</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storyPopularity.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
                <XAxis 
                  dataKey="title" 
                  stroke="#1A1A1A"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#1A1A1A" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FAFAF8', 
                    border: '1px solid #1A1A1A',
                    borderRadius: '0px'
                  }}
                />
                <Bar dataKey="sessions" fill="#1A1A1A" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Completion Rates */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Story Completion Rates</h3>
            <div className="space-y-4">
              {storyPopularity.slice(0, 5).map((story, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#1A1A1A] text-sm font-medium">{story.title}</span>
                    <span className="text-[#1A1A1A] text-sm">{story.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#E5E5E5] h-2 border border-[#D4D4D4]">
                    <div 
                      className="bg-[#1A1A1A] h-full"
                      style={{ width: `${story.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="typewriter-card border-4 border-[#1A1A1A]">
            <div className="w-16 h-16 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">Platform Analytics</h3>
            <p className="text-[#1A1A1A] leading-relaxed font-light">
              View detailed platform-wide analytics on token usage, user engagement, and system performance.
            </p>
            <div className="mt-4 text-sm text-[#1A1A1A] font-light">
              Platform-wide data • All users • All activity
            </div>
            <Link
              to="/admin/analytics"
              className="typewriter-btn inline-block mt-4"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Analytics
            </Link>
          </div>

          <div className="typewriter-card border-4 border-[#1A1A1A]">
            <div className="w-16 h-16 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">User Management</h3>
            <p className="text-[#1A1A1A] mb-6 leading-relaxed font-light">
              {isSuperAdmin 
                ? 'Manage all user accounts, beta approvals, and promote users to admin roles.'
                : 'Manage user accounts and beta approvals across the platform.'
              }
            </p>
            <div className="flex gap-3 mb-4">
              <span className="px-3 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-sm">
                {platformStats.betaApproved} Approved
              </span>
              <span className="px-3 py-1 bg-[#E53E3E] text-[#FAFAF8] text-sm">
                {platformStats.totalUsers - platformStats.betaApproved} Pending
              </span>
            </div>
            <Link
              to="/admin/users"
              className="typewriter-btn inline-block"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Users
            </Link>
          </div>

          {isSuperAdmin && (
            <div className="typewriter-card border-4 border-[#1A1A1A]">
              <div className="w-16 h-16 bg-[#1A1A1A] text-[#FAFAF8] flex items-center justify-center mb-6">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-4">Super Admin Powers</h3>
              <p className="text-[#1A1A1A] mb-6 leading-relaxed font-light">
                Promote users to admin roles, manage all platform settings, and maintain system integrity.
              </p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-sm">
                  {platformStats.superAdmins} Super Admins
                </span>
                <span className="px-3 py-1 bg-[#2B6CB0] text-[#FAFAF8] text-sm">
                  {platformStats.admins} Admins
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Users & Pending Approvals */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <div className="typewriter-card">
            <div className="p-6 border-b-2 border-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-[#1A1A1A]">Recent Users</h3>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentUsers.length > 0 ? recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-[#E5E5E5]">
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
                      {getUserStatusBadge(user)}
                      <p className="text-[#1A1A1A] text-xs mt-1 font-light">
                        {user.session_count} sessions • {user.total_tokens} tokens
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-[#1A1A1A] text-center py-8 font-light">No approved users yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="typewriter-card">
            <div className="p-6 border-b-2 border-[#1A1A1A]">
              <h3 className="text-xl font-medium text-[#1A1A1A]">Pending Beta Approvals</h3>
            </div>
            <div className="p-6">
              {pendingUsers.length === 0 ? (
                <p className="text-[#1A1A1A] text-center py-8 font-light">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-[#E5E5E5]">
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
                          onClick={() => updateUserStatus(user.id, { beta_approved: true })}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 typewriter-btn-primary text-sm disabled:opacity-50"
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
                          onClick={() => updateUserStatus(user.id, { beta_approved: false })}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 bg-[#E53E3E] border-[#E53E3E] text-[#FAFAF8] px-3 py-1 text-sm disabled:opacity-50"
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