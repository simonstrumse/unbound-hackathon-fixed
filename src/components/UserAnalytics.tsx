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
  Shield
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

interface UserStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  storiesPlayed: number;
  averageSessionLength: number;
  totalSessions: number;
  activeSessions: number;
  averageResponseTime: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  sessions: number;
  responseTime: number;
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

const COLORS = ['#1A1A1A', '#2B6CB0', '#E53E3E', '#D4D4D4'];

const UserAnalytics: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const [userStats, setUserStats] = useState<UserStats>({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    storiesPlayed: 0,
    averageSessionLength: 0,
    totalSessions: 0,
    activeSessions: 0,
    averageResponseTime: 0
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [storyStats, setStoryStats] = useState<StoryStats[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserAnalytics();
    }
  }, [user, timeRange]);

  const fetchUserAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch enhanced API usage for the user
      const { data: apiUsageData, error: apiError } = await supabase
        .from('api_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (apiError) throw apiError;

      // Fetch story sessions for the user
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('story_sessions')
        .select(`
          *,
          stories:story_id (
            title,
            author
          )
        `)
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // Calculate enhanced user stats
      const totalTokens = apiUsageData?.reduce((sum, usage) => sum + usage.tokens_used, 0) || 0;
      const inputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.input_tokens || 0), 0) || 0;
      const outputTokens = apiUsageData?.reduce((sum, usage) => sum + (usage.output_tokens || 0), 0) || 0;
      
      const totalCost = apiUsageData?.reduce((sum, usage) => sum + (usage.total_cost || usage.cost_estimate || 0), 0) || 0;
      const inputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.input_cost || 0), 0) || 0;
      const outputCost = apiUsageData?.reduce((sum, usage) => sum + (usage.output_cost || 0), 0) || 0;
      
      const uniqueStories = new Set(sessionsData?.map(s => s.story_id) || []).size;
      const activeSessions = sessionsData?.filter(s => s.is_active).length || 0;
      const totalSessions = sessionsData?.length || 0;

      // Calculate average response time
      const responseTimeData = apiUsageData?.filter(usage => usage.response_time_ms > 0) || [];
      const averageResponseTime = responseTimeData.length > 0 
        ? responseTimeData.reduce((sum, usage) => sum + usage.response_time_ms, 0) / responseTimeData.length
        : 0;

      // Calculate average session length (in hours)
      let totalSessionHours = 0;
      let completedSessions = 0;

      sessionsData?.forEach(session => {
        if (!session.is_active) {
          const start = new Date(session.created_at);
          const end = new Date(session.updated_at);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalSessionHours += hours;
          completedSessions++;
        }
      });

      const averageSessionLength = completedSessions > 0 ? totalSessionHours / completedSessions : 0;

      setUserStats({
        totalTokens,
        inputTokens,
        outputTokens,
        totalCost,
        inputCost,
        outputCost,
        storiesPlayed: uniqueStories,
        averageSessionLength,
        totalSessions,
        activeSessions,
        averageResponseTime
      });

      // Process daily usage with enhanced metrics
      const dailyMap = new Map<string, { 
        tokens: number; 
        inputTokens: number;
        outputTokens: number;
        cost: number;
        sessions: Set<string>;
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
          responseTimes: []
        };
        
        existing.tokens += usage.tokens_used;
        existing.inputTokens += usage.input_tokens || 0;
        existing.outputTokens += usage.output_tokens || 0;
        existing.cost += usage.total_cost || usage.cost_estimate || 0;
        if (usage.session_id) existing.sessions.add(usage.session_id);
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

    } catch (err) {
      console.error('Error fetching user analytics:', err);
      setError('Failed to load analytics data');
      showNotification('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    const csvData = [
      ['Date', 'Total Tokens', 'Input Tokens', 'Output Tokens', 'Cost ($)', 'Sessions', 'Avg Response Time (ms)'],
      ...dailyUsage.map(day => [
        day.date, 
        day.tokens, 
        day.inputTokens,
        day.outputTokens,
        day.cost.toFixed(6), 
        day.sessions,
        day.responseTime.toFixed(0)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `unbound-analytics-${profile?.username || 'user'}-${timeRange}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Analytics exported successfully!', 'success');
  };

  const handleRetry = () => {
    fetchUserAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#1A1A1A] text-xl mb-4 loading-dots">Loading your analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] analytics-page">
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
              <BarChart3 className="w-8 h-8 text-[#1A1A1A]" />
              <span className="text-2xl font-medium text-[#1A1A1A] typewriter-cursor">Your Analytics</span>
              {isAdmin && (
                <Link
                  to="/analytics/global"
                  className="flex items-center gap-2 typewriter-btn text-sm"
                >
                  <Globe className="w-4 h-4" />
                  Global View
                </Link>
              )}
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

        {/* Admin Notice */}
        {isAdmin && (
          <div className="mb-8 p-4 typewriter-card">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#2B6CB0] flex-shrink-0" />
              <div>
                <p className="text-[#1A1A1A] font-medium">Admin Analytics Access</p>
                <p className="text-[#1A1A1A] text-sm font-light">
                  You're viewing your personal analytics. Switch to{' '}
                  <Link to="/analytics/global" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] underline">
                    Global Analytics
                  </Link>
                  {' '}to see platform-wide data, or visit the{' '}
                  <Link to="/admin/analytics" className="text-[#2B6CB0] hover:bg-[#1A1A1A] hover:text-[#FAFAF8] underline">
                    Admin Analytics Dashboard
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-[#1A1A1A] mb-2 typewriter-cursor">Your Reading Journey</h1>
            <p className="text-[#1A1A1A] font-light">Track your literary adventures and detailed usage analytics</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Tokens</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.totalTokens.toLocaleString()}</p>
            <div className="text-xs text-[#1A1A1A] mt-1 font-light">
              <span className="text-[#2B6CB0]">In: {userStats.inputTokens.toLocaleString()}</span> | 
              <span className="text-[#2B6CB0]"> Out: {userStats.outputTokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">${userStats.totalCost.toFixed(4)}</p>
            <div className="text-xs text-[#1A1A1A] mt-1 font-light">
              <span className="text-[#2B6CB0]">In: ${userStats.inputCost.toFixed(4)}</span> | 
              <span className="text-[#2B6CB0]"> Out: ${userStats.outputCost.toFixed(4)}</span>
            </div>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.averageResponseTime.toFixed(0)}ms</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              {userStats.averageResponseTime < 2000 ? 'Excellent' : 
               userStats.averageResponseTime < 5000 ? 'Good' : 'Slow'}
            </p>
          </div>

          <div className="typewriter-card">
            <div className="flex items-center gap-3 mb-2">
              <Book className="w-6 h-6 text-[#2B6CB0]" />
              <span className="text-[#1A1A1A] text-sm font-medium">Stories Played</span>
            </div>
            <p className="text-3xl font-medium text-[#1A1A1A]">{userStats.storiesPlayed}</p>
            <p className="text-[#1A1A1A] text-xs mt-1 font-light">
              {userStats.activeSessions} active session{userStats.activeSessions !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Enhanced Daily Usage Chart */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Daily Token Usage</h3>
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
            <div className="flex justify-center gap-4 mt-3 text-xs text-[#1A1A1A]">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#2B6CB0] inline-block"></div>
                Input Tokens
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#1A1A1A] inline-block"></div>
                Output Tokens
              </span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Cost Analysis</h3>
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
                  formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Cost']}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#1A1A1A" 
                  strokeWidth={2}
                  dot={{ fill: '#1A1A1A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Model Usage Breakdown */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Model Usage</h3>
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
                    fill="#1A1A1A"
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
                <Zap className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4 opacity-50" />
                <p className="text-[#1A1A1A] font-light">No model usage data available</p>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="typewriter-card">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#E5E5E5]">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A]">Average Response Time</span>
                </div>
                <span className="text-2xl font-medium text-[#1A1A1A]">{userStats.averageResponseTime.toFixed(0)}ms</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-[#E5E5E5]">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A]">Token Efficiency</span>
                </div>
                <span className="text-2xl font-medium text-[#1A1A1A]">
                  {userStats.totalTokens > 0 
                    ? ((userStats.outputTokens / userStats.totalTokens) * 100).toFixed(1)
                    : 0
                  }%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-[#E5E5E5]">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#2B6CB0]" />
                  <span className="text-[#1A1A1A]">Avg Session Length</span>
                </div>
                <span className="text-2xl font-medium text-[#1A1A1A]">{userStats.averageSessionLength.toFixed(1)}h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Story Statistics */}
        <div className="typewriter-card">
          <div className="p-6 border-b-2 border-[#1A1A1A]">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Your Most Played Stories</h3>
          </div>
          <div className="p-6">
            {storyStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="typewriter-table">
                  <thead>
                    <tr className="border-b-2 border-[#1A1A1A]">
                      <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Story</th>
                      <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Sessions</th>
                      <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Tokens</th>
                      <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Cost</th>
                      <th className="text-left text-[#1A1A1A] text-sm font-medium py-3">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storyStats.map((story, index) => (
                      <tr key={index} className="border-b border-[#D4D4D4]">
                        <td className="py-4">
                          <div>
                            <p className="text-[#1A1A1A] font-medium">{story.story_title}</p>
                            <p className="text-[#1A1A1A] text-sm font-light">by {story.story_author}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-[#1A1A1A]">{story.session_count}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-[#1A1A1A] font-mono">{story.total_tokens.toLocaleString()}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-[#1A1A1A] font-mono">${story.total_cost.toFixed(4)}</span>
                        </td>
                        <td className="py-4">
                          <span className="text-[#1A1A1A]">{story.completion_rate.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Book className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4 opacity-50" />
                <p className="text-[#1A1A1A] font-light">No stories played yet. Start your first adventure!</p>
                <Link
                  to="/stories"
                  className="inline-block mt-4 typewriter-btn-primary"
                >
                  Browse Stories
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserAnalytics;