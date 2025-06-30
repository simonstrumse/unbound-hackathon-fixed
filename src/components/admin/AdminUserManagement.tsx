import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  XCircle, 
  Activity,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  Crown,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase, Profile } from '../../lib/supabase';

interface ExtendedProfile extends Profile {
  session_count: number;
  total_tokens: number;
  last_active: string | null;
}

const AdminUserManagement: React.FC = () => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ExtendedProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'superadmin' | 'admin' | 'user' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Filter users based on search term and filter type
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(user => {
        switch (filterType) {
          case 'superadmin':
            return user.admin_level === 'superadmin';
          case 'admin':
            return user.admin_level === 'admin' || (user.is_admin && user.admin_level !== 'superadmin');
          case 'user':
            return !user.is_admin && !user.admin_level && user.beta_approved;
          case 'pending':
            return !user.beta_approved;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users with their activity data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Enhance user data with activity information
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get session count
          const { data: userSessions } = await supabase
            .from('story_sessions')
            .select('id, updated_at')
            .eq('user_id', profile.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          // Get token usage
          const { data: userApiUsage } = await supabase
            .from('api_usage')
            .select('tokens_used')
            .eq('user_id', profile.id);

          const sessionCount = userSessions?.length || 0;
          const totalTokens = userApiUsage?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
          const lastActive = userSessions?.[0]?.updated_at || null;

          return {
            ...profile,
            session_count: sessionCount,
            total_tokens: totalTokens,
            last_active: lastActive
          };
        })
      );

      setUsers(usersWithStats);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      showNotification('Failed to load users', 'error');
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
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, ...updates }
            : user
        )
      );

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

  const getUserStatusBadge = (user: ExtendedProfile) => {
    if (user.admin_level === 'superadmin') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-xs">
          <Crown className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    if (user.admin_level === 'admin' || (user.is_admin && user.admin_level !== 'superadmin')) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] text-[#FAFAF8] text-xs">
          <ShieldCheck className="w-3 h-3" />
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

  const getAvailableActions = (user: ExtendedProfile) => {
    const actions = [];

    // Superadmin can do everything except modify themselves inappropriately
    if (isSuperAdmin && user.email !== 'simonstrumse@gmail.com') {
      if (!user.beta_approved) {
        actions.push({
          label: 'Approve',
          icon: UserCheck,
          action: () => updateUserStatus(user.id, { beta_approved: true }),
          className: 'bg-[#1A1A1A] text-[#FAFAF8]'
        });
      }
      
      if (user.admin_level !== 'admin' && !user.is_admin) {
        actions.push({
          label: 'Make Admin',
          icon: Shield,
          action: () => updateUserStatus(user.id, { 
            admin_level: 'admin', 
            is_admin: true,
            beta_approved: true 
          }),
          className: 'bg-[#1A1A1A] text-[#FAFAF8]'
        });
      }

      if (user.admin_level === 'admin' || user.is_admin) {
        actions.push({
          label: 'Remove Admin',
          icon: UserX,
          action: () => updateUserStatus(user.id, { 
            admin_level: null, 
            is_admin: false 
          }),
          className: 'bg-[#E53E3E] text-[#FAFAF8]'
        });
      }

      if (user.beta_approved) {
        actions.push({
          label: 'Reject',
          icon: XCircle,
          action: () => updateUserStatus(user.id, { beta_approved: false }),
          className: 'bg-[#E53E3E] text-[#FAFAF8]'
        });
      }
    }

    // Regular admins can only approve/reject users
    if (isAdmin && !isSuperAdmin) {
      if (!user.beta_approved) {
        actions.push({
          label: 'Approve',
          icon: UserCheck,
          action: () => updateUserStatus(user.id, { beta_approved: true }),
          className: 'bg-[#1A1A1A] text-[#FAFAF8]'
        });
      } else {
        actions.push({
          label: 'Reject',
          icon: XCircle,
          action: () => updateUserStatus(user.id, { beta_approved: false }),
          className: 'bg-[#E53E3E] text-[#FAFAF8]'
        });
      }
    }

    return actions;
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
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading users</div>
        </div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.is_admin || u.admin_level).length,
    pending: users.filter(u => !u.beta_approved).length,
    active: users.filter(u => u.session_count > 0).length
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] admin-page">
      {/* Header */}
      <header className="typewriter-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Admin
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">User Management</span>
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
              onClick={fetchUsers}
              className="typewriter-btn"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Users</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{stats.total}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Admins</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{stats.admins}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Active Users</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{stats.active}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Pending</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{stats.pending}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1A1A1A]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAFAF8] border-2 border-[#1A1A1A] text-[#1A1A1A] focus:outline-none"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1A1A1A]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="pl-10 pr-8 py-2 bg-[#FAFAF8] border-2 border-[#1A1A1A] text-[#1A1A1A] focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Users</option>
              <option value="superadmin">Super Admins</option>
              <option value="admin">Admins</option>
              <option value="user">Regular Users</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="typewriter-card">
          <div className="p-6 border-b-2 border-[#1A1A1A]">
            <h3 className="text-xl font-medium text-[#1A1A1A]">
              Platform Users ({filteredUsers.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="typewriter-table">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A]">
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">User</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Status</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Activity</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Joined</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[#D4D4D4] hover:bg-[#E5E5E5]">
                      <td className="py-4">
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
                      </td>
                      <td className="py-4">
                        {getUserStatusBadge(user)}
                      </td>
                      <td className="py-4">
                        <div className="text-sm">
                          <p className="text-[#1A1A1A]">{user.session_count} sessions</p>
                          <p className="text-[#1A1A1A] font-light">{user.total_tokens.toLocaleString()} tokens</p>
                          {user.last_active && (
                            <p className="text-[#1A1A1A] text-xs font-light">
                              Last: {new Date(user.last_active).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-[#1A1A1A] text-sm font-light">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {getAvailableActions(user).map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              disabled={actionLoading === user.id}
                              className={`flex items-center gap-1 ${action.className} px-3 py-1 text-sm transition-colors disabled:opacity-50`}
                            >
                              {actionLoading === user.id ? (
                                <span className="loading-dots">Working</span>
                              ) : (
                                <>
                                  <action.icon className="w-3 h-3" />
                                  {action.label}
                                </>
                              )}
                            </button>
                          ))}
                          {getAvailableActions(user).length === 0 && (
                            <span className="text-[#1A1A1A] text-sm font-light">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4 opacity-50" />
                <p className="text-[#1A1A1A] font-light">
                  {searchTerm || filterType !== 'all' 
                    ? 'No users found matching your criteria.' 
                    : 'No users found.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUserManagement;