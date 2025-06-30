import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, 
  ArrowLeft, 
  TrendingUp, 
  Calendar,
  Users,
  Activity,
  DollarSign,
  Download,
  Loader2,
  AlertCircle,
  Timer,
  Zap,
  Target,
  BarChart3
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
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ApiUsage } from '../../lib/supabase';

interface PlatformStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  averageResponseTime: number;
  totalUsers: number;
  activeSessions: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  sessions: number;
  responseTime: number;
  users: number;
}

interface UserUsage {
  username: string;
  email: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  sessions: number;
  avgResponseTime: number;
}

interface ModelUsage {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
  avgResponseTime: number;
}

interface OperationUsage {
  operation: string;
  tokens: number;
  cost: number;
  count: number;
  avgResponseTime: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const AdminAnalytics: React.FC = () => {
  const { isAdmin } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    averageResponseTime: 0,
    totalUsers: 0,
    activeSessions: 0
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [operationUsage, setOperationUsage] = useState<OperationUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalyticsData();
    }
  }, [isAdmin, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch ALL platform API usage data (not filtered by user)
      const { data: apiUsageData, error: apiError } = await supabase
        .from('api_usage')
        .select('*, profiles:user_id(username, email)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (apiError) throw apiError;

      // Fetch active sessions (platform-wide)
      const { data: sessions, error: sessionsError } = await supabase
        .from('story_sessions')
        .select('*')
        .eq('is_active', true);

      if (sessionsError) throw sessionsError;

      // Fetch all profiles for user count (platform-wide)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      console.log('Platform Analytics Data:', {
        apiUsageRecords: apiUsageData?.length || 0,
        activeSessions: sessions?.length || 0,
        totalUsers: profiles?.length || 0,
        timeRange
      });

      // Calculate enhanced platform stats
      const totalTokens = apiUsageData?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
      const inputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.input_tokens || 0), 0) || 0;
      const outputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.output_tokens || 0), 0) || 0;
      
      const totalCost = apiUsageData?.reduce((sum, usage) => sum + (usage.total_cost || usage.cost_estimate || 0), 0) || 0;
      const inputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.input_cost || 0), 0) || 0;
      const outputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.output_cost || 0), 0) || 0;

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
        averageResponseTime,
        totalUsers: profiles?.length || 0,
        activeSessions: sessions?.length || 0
      });

      // Process enhanced daily usage
      const dailyMap = new Map<string, { 
        tokens: number; 
        inputTokens: number;
        outputTokens: number;
        cost: number;
        inputCost: number;
        outputCost: number;
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
          inputCost: 0,
          outputCost: 0,
          sessions: new Set(), 
          users: new Set(),
          responseTimes: []
        };
        
        existing.tokens += usage.tokens_used;
        existing.inputTokens += usage.input_tokens || 0;
        existing.outputTokens += usage.output_tokens || 0;
        existing.cost += usage.total_cost || usage.cost_estimate || 0;
        existing.inputCost += usage.input_cost || 0;
        existing.outputCost += usage.output_cost || 0;
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
        inputCost: data.inputCost,
        outputCost: data.outputCost,
        sessions: data.sessions.size,
        users: data.users.size,
        responseTime: data.responseTimes.length > 0 
          ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
          : 0
      }));

      setDailyUsage(dailyData);

      // Process enhanced user usage (all users, not just current admin)
      const userMap = new Map<string, { 
        username: string; 
        email: string; 
        tokens: number; 
        inputTokens: number;
        outputTokens: number;
        cost: number; 
        sessions: Set<string>;
        responseTimes: number[];
      }>();
      
      apiUsageData?.forEach((usage) => {
        const userId = usage.user_id;
        const profile = usage.profiles;
        
        if (profile) {
          const existing = userMap.get(userId) || { 
            username: profile.username, 
            email: profile.email, 
            tokens: 0, 
            inputTokens: 0,
            outputTokens: 0,
            cost: 0, 
            sessions: new Set(),
            responseTimes: []
          };
          
          existing.tokens += usage.tokens_used;
          existing.inputTokens += usage.input_tokens || 0;
          existing.outputTokens += usage.output_tokens || 0;
          existing.cost += usage.total_cost || usage.cost_estimate || 0;
          if (usage.session_id) existing.sessions.add(usage.session_id);
          if (usage.response_time_ms > 0) existing.responseTimes.push(usage.response_time_ms);
          
          userMap.set(userId, existing);
        }
      });

      const userData: UserUsage[] = Array.from(userMap.values())
        .map(data => ({
          username: data.username,
          email: data.email,
          tokens: data.tokens,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          cost: data.cost,
          sessions: data.sessions.size,
          avgResponseTime: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
            : 0
        }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10);

      setUserUsage(userData);

      // Process model usage (platform-wide)
      const modelMap = new Map<string, { tokens: number; cost: number; responseTimes: number[] }>();
      let totalModelTokens = 0;
      
      apiUsageData?.forEach((usage) => {
        const model = usage.model_type || 'gpt-4o-mini';
        const tokens = usage.tokens_used;
        const cost = usage.total_cost || usage.cost_estimate || 0;
        
        const existing = modelMap.get(model) || { tokens: 0, cost: 0, responseTimes: [] };
        existing.tokens += tokens;
        existing.cost += cost;
        if (usage.response_time_ms > 0) existing.responseTimes.push(usage.response_time_ms);
        modelMap.set(model, existing);
        
        totalModelTokens += tokens;
      });

      const modelData: ModelUsage[] = Array.from(modelMap.entries())
        .map(([model, data]) => ({
          model,
          tokens: data.tokens,
          cost: data.cost,
          percentage: totalModelTokens > 0 ? (data.tokens / totalModelTokens) * 100 : 0,
          avgResponseTime: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
            : 0
        }))
        .sort((a, b) => b.tokens - a.tokens);

      setModelUsage(modelData);

      // Process operation usage (platform-wide)
      const operationMap = new Map<string, { tokens: number; cost: number; count: number; responseTimes: number[] }>();
      
      apiUsageData?.forEach((usage) => {
        const operation = usage.operation_type;
        const tokens = usage.tokens_used;
        const cost = usage.total_cost || usage.cost_estimate || 0;
        
        const existing = operationMap.get(operation) || { tokens: 0, cost: 0, count: 0, responseTimes: [] };
        existing.tokens += tokens;
        existing.cost += cost;
        existing.count += 1;
        if (usage.response_time_ms > 0) existing.responseTimes.push(usage.response_time_ms);
        operationMap.set(operation, existing);
      });

      const operationData: OperationUsage[] = Array.from(operationMap.entries())
        .map(([operation, data]) => ({
          operation,
          tokens: data.tokens,
          cost: data.cost,
          count: data.count,
          avgResponseTime: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
            : 0
        }))
        .sort((a, b) => b.tokens - a.tokens);

      setOperationUsage(operationData);

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    const csvData = [
      ['Date', 'Total Tokens', 'Input Tokens', 'Output Tokens', 'Total Cost ($)', 'Input Cost ($)', 'Output Cost ($)', 'Sessions', 'Users', 'Avg Response Time (ms)'],
      ...dailyUsage.map(day => [
        day.date, 
        day.tokens, 
        day.inputTokens,
        day.outputTokens,
        day.cost.toFixed(6), 
        day.inputCost.toFixed(6),
        day.outputCost.toFixed(6),
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
    a.download = `unbound-platform-analytics-${timeRange}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
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
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading platform analytics</div>
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
                to="/admin"
                className="flex items-center gap-2 text-[#1A1A1A] typewriter-hover"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Admin
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">Platform Analytics</span>
              <div className="text-sm text-[#1A1A1A] bg-[#E5E5E5] px-3 py-1">
                All Users • All Activity
              </div>
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Platform Performance</h1>
            <p className="text-[#1A1A1A] font-light">Complete platform analytics • All users • All activity • {timeRange} view</p>
          </div>
          
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 typewriter-btn text-sm font-medium ${
                  timeRange === range
                    ? 'bg-[#1A1A1A] text-[#FAFAF8]'
                    : ''
                }`}
              >
                {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
            <button
              onClick={exportAnalytics}
              className="flex items-center gap-2 typewriter-btn text-[#2B6CB0] border-[#2B6CB0]"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Enhanced Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Tokens</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.totalTokens.toLocaleString()}</p>
            <div className="text-xs text-[#1A1A1A] mt-1 font-light">
              <span className="text-[#2B6CB0]">In: {platformStats.inputTokens.toLocaleString()}</span> | 
              <span className="text-[#2B6CB0]"> Out: {platformStats.outputTokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">${platformStats.totalCost.toFixed(2)}</p>
            <div className="text-xs text-[#1A1A1A] mt-1 font-light">
              <span className="text-[#2B6CB0]">In: ${platformStats.inputCost.toFixed(2)}</span> | 
              <span className="text-[#2B6CB0]"> Out: ${platformStats.outputCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.averageResponseTime.toFixed(0)}ms</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              {platformStats.averageResponseTime < 2000 ? 'Excellent' : 
               platformStats.averageResponseTime < 5000 ? 'Good' : 'Needs attention'}
            </p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Users</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.totalUsers}</p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Active Sessions</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{platformStats.activeSessions}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Enhanced Daily Usage Chart */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Daily Token Usage (Platform-wide)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#1A1A1A"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#1A1A1A" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FAFAF8', 
                    border: '1px solid #1A1A1A',
                    borderRadius: '0px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inputTokens" 
                  stackId="1"
                  stroke="#2B6CB0" 
                  fill="#2B6CB0" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="outputTokens" 
                  stackId="1"
                  stroke="#1A1A1A" 
                  fill="#1A1A1A" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Model Usage Pie Chart */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Usage by Model (Platform-wide)</h3>
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
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#1A1A1A" : "#2B6CB0"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Cost Analysis */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Daily Cost Breakdown (Platform-wide)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#1A1A1A"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#1A1A1A" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FAFAF8', 
                    border: '1px solid #1A1A1A',
                    borderRadius: '0px'
                  }}
                  formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Cost']}
                />
                <Area 
                  type="monotone" 
                  dataKey="inputCost" 
                  stackId="1"
                  stroke="#2B6CB0" 
                  fill="#2B6CB0" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="outputCost" 
                  stackId="1"
                  stroke="#1A1A1A" 
                  fill="#1A1A1A" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Response Time Trends */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Response Time Trends (Platform-wide)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#1A1A1A"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#1A1A1A" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FAFAF8', 
                    border: '1px solid #1A1A1A',
                    borderRadius: '0px'
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(0)}ms`, 'Response Time']}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#1A1A1A" 
                  strokeWidth={2}
                  dot={{ fill: '#1A1A1A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enhanced Top Users Table */}
        <div className="typewriter-card">
          <div className="p-6 border-b-2 border-[#1A1A1A]">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Top Users by Token Usage (Platform-wide)</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="typewriter-table">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A]">
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">User</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Tokens</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Input/Output</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Cost</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Sessions</th>
                    <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Avg Response</th>
                  </tr>
                </thead>
                <tbody>
                  {userUsage.map((user, index) => (
                    <tr key={user.email} className="border-b border-[#D4D4D4]">
                      <td className="py-4">
                        <div>
                          <p className="text-[#1A1A1A] font-medium">{user.username}</p>
                          <p className="text-[#1A1A1A] text-sm font-light">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-[#1A1A1A] font-mono">{user.tokens.toLocaleString()}</span>
                      </td>
                      <td className="py-4">
                        <div className="text-xs">
                          <div className="text-[#2B6CB0]">In: {user.inputTokens.toLocaleString()}</div>
                          <div className="text-[#1A1A1A]">Out: {user.outputTokens.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-[#1A1A1A] font-mono">${user.cost.toFixed(4)}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-[#1A1A1A]">{user.sessions}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-[#1A1A1A]">{user.avgResponseTime.toFixed(0)}ms</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalytics;