import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, 
  ArrowLeft, 
  TrendingUp, 
  DollarSign,
  Users,
  Activity,
  Clock,
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  Zap,
  Target,
  Timer,
  Globe,
  Search,
  Filter,
  Crown,
  Shield,
  User
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';

interface PlatformStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  totalUsers: number;
  activeSessions: number;
  averageResponseTime: number;
  totalSessions: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  sessions: number;
  responseTime: number;
  users: number;
}

interface StoryStats {
  story_title: string;
  story_author: string;
  session_count: number;
  total_tokens: number;
  total_cost: number;
  completion_rate: number;
}

interface ModelUsage {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}

interface UserUsageStats {
  user_id: string;
  username: string;
  email: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  input_cost: number;
  output_cost: number;
  session_count: number;
  avg_response_time: number;
  last_activity: string;
  is_admin: boolean;
  admin_level: string | null;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const GlobalAnalytics: React.FC = () => {
  const { isAdmin, profile } = useAuth();
  const { showNotification } = useNotifications();
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    totalUsers: 0,
    activeSessions: 0,
    averageResponseTime: 0,
    totalSessions: 0
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [storyStats, setStoryStats] = useState<StoryStats[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [userStats, setUserStats] = useState<UserUsageStats[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [userFilter, setUserFilter] = useState<'all' | 'top_tokens' | 'top_cost' | 'admins' | 'active'>('top_tokens');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchGlobalAnalytics();
    }
  }, [isAdmin, timeRange]);

  const fetchGlobalAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch ALL platform API usage data
      const { data: apiUsageData, error: apiError } = await supabase
        .from('api_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (apiError) throw apiError;

      // Fetch ALL story sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('story_sessions')
        .select(`
          *,
          stories:story_id (
            title,
            author
          )
        `);

      if (sessionsError) throw sessionsError;

      // Fetch ALL profiles with enhanced user data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Calculate platform-wide stats
      const totalTokens = apiUsageData?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
      const inputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.input_tokens || 0), 0) || 0;
      const outputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.output_tokens || 0), 0) || 0;
      
      const totalCost = apiUsageData?.reduce((sum, usage) => sum + (usage.total_cost || usage.cost_estimate || 0), 0) || 0;
      const inputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.input_cost || 0), 0) || 0;
      const outputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.output_cost || 0), 0) || 0;
      
      const activeSessions = sessionsData?.filter(s => s.is_active).length || 0;
      const totalSessions = sessionsData?.length || 0;

      // Calculate average response time
      const responseTimeData = apiUsageData?.filter(usage => usage.response_time_ms > 0) || [];
      const averageResponseTime = responseTimeData.length > 0 
        ? responseTimeData.reduce((sum, usage) => sum + usage.response_time_ms, 0) / responseTimeData.length
        : 0;

      setPlatformStats({
        totalTokens,
        inputTokens,
        outputTokens,
        totalCost,
        inputCost,
        outputCost,
        totalUsers: profiles?.length || 0,
        activeSessions,
        averageResponseTime,
        totalSessions
      });

      // Process daily usage with enhanced metrics
      const dailyMap = new Map<string, { 
        tokens: number; 
        inputTokens: number;
        outputTokens: number;
        cost: number;
        sessions: Set<string>;
        users: Set<string>;
        responseTimes: number[];
      }>();
      
      apiUsageData?.forEach((usage) => {
        const date = new Date(usage.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { 
          tokens: 0, 
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          sessions: new Set(),
          users: new Set(),
          responseTimes: []
        };
        
        existing.tokens += usage.tokens_used;
        existing.inputTokens += usage.input_tokens || 0;
        existing.outputTokens += usage.output_tokens || 0;
        existing.cost += usage.total_cost || usage.cost_estimate || 0;
        if (usage.session_id) existing.sessions.add(usage.session_id);
        existing.users.add(usage.user_id);
        if (usage.response_time_ms > 0) existing.responseTimes.push(usage.response_time_ms);
        
        dailyMap.set(date, existing);
      });

      const dailyData: DailyUsage[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        tokens: data.tokens,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: data.cost,
        sessions: data.sessions.size,
        users: data.users.size,
        responseTime: data.responseTimes.length > 0 
          ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
          : 0
      }));

      setDailyUsage(dailyData);

      // Process story stats with enhanced metrics
      const storyMap = new Map<string, { 
        title: string; 
        author: string; 
        sessions: string[]; 
        tokens: number; 
        cost: number;
        completed: number; 
      }>();

      sessionsData?.forEach((session) => {
        const story = Array.isArray(session.stories) ? session.stories[0] : session.stories;
        if (story) {
          const existing = storyMap.get(session.story_id) || {
            title: story.title,
            author: story.author,
            sessions: [],
            tokens: 0,
            cost: 0,
            completed: 0
          };
          
          existing.sessions.push(session.id);
          if (!session.is_active) existing.completed++;
          
          storyMap.set(session.story_id, existing);
        }
      });

      // Add token usage and costs for each story
      apiUsageData?.forEach((usage) => {
        if (usage.session_id) {
          const session = sessionsData?.find(s => s.id === usage.session_id);
          if (session) {
            const existing = storyMap.get(session.story_id);
            if (existing) {
              existing.tokens += usage.tokens_used;
              existing.cost += usage.total_cost || usage.cost_estimate || 0;
            }
          }
        }
      });

      const storyData: StoryStats[] = Array.from(storyMap.entries())
        .map(([storyId, data]) => ({
          story_title: data.title,
          story_author: data.author,
          session_count: data.sessions.length,
          total_tokens: data.tokens,
          total_cost: data.cost,
          completion_rate: data.sessions.length > 0 ? (data.completed / data.sessions.length) * 100 : 0
        }))
        .sort((a, b) => b.session_count - a.session_count)
        .slice(0, 5);

      setStoryStats(storyData);

      // Process model usage
      const modelMap = new Map<string, { tokens: number; cost: number }>();
      let totalModelTokens = 0;
      let totalModelCost = 0;

      apiUsageData?.forEach((usage) => {
        const model = usage.model_type || 'gpt-4o-mini';
        const tokens = usage.tokens_used;
        const cost = usage.total_cost || usage.cost_estimate || 0;
        
        const existing = modelMap.get(model) || { tokens: 0, cost: 0 };
        existing.tokens += tokens;
        existing.cost += cost;
        modelMap.set(model, existing);
        
        totalModelTokens += tokens;
        totalModelCost += cost;
      });

      const modelData: ModelUsage[] = Array.from(modelMap.entries())
        .map(([model, data]) => ({
          model,
          tokens: data.tokens,
          cost: data.cost,
          percentage: totalModelTokens > 0 ? (data.tokens / totalModelTokens) * 100 : 0
        }))
        .sort((a, b) => b.tokens - a.tokens);

      setModelUsage(modelData);

      // Process per-user statistics
      const userMap = new Map<string, {
        profile: any;
        tokens: number;
        inputTokens: number;
        outputTokens: number;
        cost: number;
        inputCost: number;
        outputCost: number;
        sessions: Set<string>;
        responseTimes: number[];
        lastActivity: string;
      }>();

      // Initialize user map with profiles
      profiles?.forEach(profile => {
        userMap.set(profile.id, {
          profile,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          inputCost: 0,
          outputCost: 0,
          sessions: new Set(),
          responseTimes: [],
          lastActivity: profile.updated_at
        });
      });

      // Aggregate API usage by user
      apiUsageData?.forEach((usage) => {
        const existing = userMap.get(usage.user_id);
        if (existing) {
          existing.tokens += usage.tokens_used;
          existing.inputTokens += usage.input_tokens || 0;
          existing.outputTokens += usage.output_tokens || 0;
          existing.cost += usage.total_cost || usage.cost_estimate || 0;
          existing.inputCost += usage.input_cost || 0;
          existing.outputCost += usage.output_cost || 0;
          if (usage.session_id) existing.sessions.add(usage.session_id);
          if (usage.response_time_ms > 0) existing.responseTimes.push(usage.response_time_ms);
          if (usage.created_at > existing.lastActivity) {
            existing.lastActivity = usage.created_at;
          }
        }
      });

      const userData: UserUsageStats[] = Array.from(userMap.values())
        .map(data => ({
          user_id: data.profile.id,
          username: data.profile.username,
          email: data.profile.email,
          total_tokens: data.tokens,
          input_tokens: data.inputTokens,
          output_tokens: data.outputTokens,
          total_cost: data.cost,
          input_cost: data.inputCost,
          output_cost: data.outputCost,
          session_count: data.sessions.size,
          avg_response_time: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
            : 0,
          last_activity: data.lastActivity,
          is_admin: data.profile.is_admin || false,
          admin_level: data.profile.admin_level
        }))
        .sort((a, b) => b.total_tokens - a.total_tokens);

      setUserStats(userData);

    } catch (err) {
      console.error('Error fetching global analytics:', err);
      setError('Failed to load global analytics data');
      showNotification('Failed to load global analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    const csvData = [
      ['Date', 'Total Tokens', 'Input Tokens', 'Output Tokens', 'Cost ($)', 'Sessions', 'Users', 'Avg Response Time (ms)'],
      ...dailyUsage.map(day => [
        day.date, 
        day.tokens, 
        day.inputTokens,
        day.outputTokens,
        day.cost.toFixed(6), 
        day.sessions,
        day.users,
        day.responseTime.toFixed(0)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `unbound-global-analytics-${timeRange}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Global analytics exported successfully!', 'success');
  };

  const handleRetry = () => {
    fetchGlobalAnalytics();
  };

  const getFilteredUsers = () => {
    let filtered = userStats;

    // Apply search filter
    if (userSearchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (userFilter) {
      case 'top_tokens':
        filtered = filtered.sort((a, b) => b.total_tokens - a.total_tokens);
        break;
      case 'top_cost':
        filtered = filtered.sort((a, b) => b.total_cost - a.total_cost);
        break;
      case 'admins':
        filtered = filtered.filter(user => user.is_admin || user.admin_level);
        break;
      case 'active':
        filtered = filtered.filter(user => user.session_count > 0);
        break;
      default:
        filtered = filtered.sort((a, b) => b.total_tokens - a.total_tokens);
    }

    return filtered.slice(0, 50); // Show top 50 users
  };

  const getUserBadge = (user: UserUsageStats) => {
    if (user.admin_level === 'superadmin') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded-full text-xs">
          <Crown className="w-3 h-3" />
          Super Admin
        </div>
      );
    }
    if (user.admin_level === 'admin' || user.is_admin) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-200 rounded-full text-xs">
          <Shield className="w-3 h-3" />
          Admin
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-200 rounded-full text-xs">
        <User className="w-3 h-3" />
        User
      </div>
    );
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
          <p className="text-white text-xl">Loading global analytics...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/analytics"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Personal Analytics
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-white" />
              <span className="text-2xl font-serif font-bold text-white">Global Analytics</span>
              <div className="text-sm text-purple-200 bg-blue-500/20 px-3 py-1 rounded-full">
                Platform-wide • All Users
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Platform Overview</h1>
            <p className="text-purple-200">Comprehensive analytics across all users and platform activity</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>
            <button
              onClick={exportAnalytics}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Enhanced Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-purple-400" />
              <span className="text-purple-200 text-sm">Total Tokens</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.totalTokens.toLocaleString()}</p>
            <div className="text-xs text-purple-200 mt-1">
              <span className="text-blue-300">In: {platformStats.inputTokens.toLocaleString()}</span> | 
              <span className="text-green-300"> Out: {platformStats.outputTokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-400" />
              <span className="text-purple-200 text-sm">Total Cost</span>
            </div>
            <p className="text-3xl font-bold text-white">${platformStats.totalCost.toFixed(2)}</p>
            <div className="text-xs text-purple-200 mt-1">
              <span className="text-blue-300">In: ${platformStats.inputCost.toFixed(2)}</span> | 
              <span className="text-green-300"> Out: ${platformStats.outputCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6 text-yellow-400" />
              <span className="text-purple-200 text-sm">Avg Response</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.averageResponseTime.toFixed(0)}ms</p>
            <p className="text-purple-200 text-xs mt-1">
              {platformStats.averageResponseTime < 2000 ? 'Excellent' : 
               platformStats.averageResponseTime < 5000 ? 'Good' : 'Needs attention'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-purple-200 text-sm">Platform Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{platformStats.totalUsers}</p>
            <p className="text-purple-200 text-xs mt-1">
              {platformStats.activeSessions} active session{platformStats.activeSessions !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Enhanced Daily Usage Chart */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Daily Token Usage (Platform-wide)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inputTokens" 
                  stackId="1"
                  stroke="#06b6d4" 
                  fill="#06b6d4" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="outputTokens" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-cyan-400 rounded"></div>
                Input Tokens
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                Output Tokens
              </span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Cost Analysis (Platform-wide)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Cost']}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Model Usage Breakdown */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Model Usage (Platform-wide)</h3>
            {modelUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={modelUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ model, percentage }) => `${model}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="tokens"
                  >
                    {modelUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'tokens' ? `${Number(value).toLocaleString()} tokens` : value,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-purple-200">No model usage data available</p>
              </div>
            )}
          </div>

          {/* Platform Performance Metrics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-6">Platform Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-blue-400" />
                  <span className="text-white">Average Response Time</span>
                </div>
                <span className="text-2xl font-bold text-white">{platformStats.averageResponseTime.toFixed(0)}ms</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-white">Token Efficiency</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {platformStats.totalTokens > 0 
                    ? ((platformStats.outputTokens / platformStats.totalTokens) * 100).toFixed(1)
                    : 0
                  }%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span className="text-white">Total Sessions</span>
                </div>
                <span className="text-2xl font-bold text-white">{platformStats.totalSessions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Usage Analytics Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-12">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-serif font-bold text-white">User Usage Analytics</h3>
              
              {/* User Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value as any)}
                    className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="top_tokens">Top by Tokens</option>
                    <option value="top_cost">Top by Cost</option>
                    <option value="admins">Admins Only</option>
                    <option value="active">Active Users</option>
                    <option value="all">All Users</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-purple-200 text-sm font-medium py-3">User</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Role</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Tokens</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Input/Output</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Cost</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Sessions</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Avg Response</th>
                    <th className="text-left text-purple-200 text-sm font-medium py-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.user_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4">
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
                      </td>
                      <td className="py-4">
                        {getUserBadge(user)}
                      </td>
                      <td className="py-4">
                        <span className="text-white font-mono text-lg">{user.total_tokens.toLocaleString()}</span>
                      </td>
                      <td className="py-4">
                        <div className="text-xs">
                          <div className="text-blue-300">In: {user.input_tokens.toLocaleString()}</div>
                          <div className="text-green-300">Out: {user.output_tokens.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm">
                          <div className="text-white font-mono">${user.total_cost.toFixed(4)}</div>
                          <div className="text-xs text-purple-200">
                            In: ${user.input_cost.toFixed(4)} | Out: ${user.output_cost.toFixed(4)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-white">{user.session_count}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-white">
                          {user.avg_response_time > 0 ? `${user.avg_response_time.toFixed(0)}ms` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-purple-200 text-sm">
                          {new Date(user.last_activity).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-purple-200">
                  {userSearchTerm || userFilter !== 'all' 
                    ? 'No users found matching your criteria.' 
                    : 'No user activity data available.'
                  }
                </p>
              </div>
            )}
            
            {filteredUsers.length === 50 && userStats.length > 50 && (
              <div className="text-center mt-4 text-purple-200 text-sm">
                Showing top 50 users. Use filters to refine results.
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Story Statistics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-serif font-bold text-white">Most Popular Stories (Platform-wide)</h3>
          </div>
          <div className="p-6">
            {storyStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-purple-200 text-sm font-medium py-3">Story</th>
                      <th className="text-left text-purple-200 text-sm font-medium py-3">Sessions</th>
                      <th className="text-left text-purple-200 text-sm font-medium py-3">Tokens</th>
                      <th className="text-left text-purple-200 text-sm font-medium py-3">Cost</th>
                      <th className="text-left text-purple-200 text-sm font-medium py-3">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storyStats.map((story, index) => (
                      <tr key={index} className="border-b border-white/5">
                        <td className="py-4">
                          <div>
                            <p className="text-white font-medium">{story.story_title}</p>
                            <p className="text-purple-200 text-sm">by {story.story_author}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-white">{story.session_count}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-white font-mono">{story.total_tokens.toLocaleString()}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-white font-mono">${story.total_cost.toFixed(4)}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-white">{story.completion_rate.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Book className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-purple-200">No story activity data available</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GlobalAnalytics;