import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
import { useReportsData } from '../hooks/useReportsData';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package,
  CalendarIcon,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Users,
  RefreshCw,
  Sparkles,
  Activity,
  Target,
  Zap,
  Star,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Transaction } from '../../infrastructure/database/supabaseService';

interface CashState {
  entries: any[];
  currentBalance: number;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}
import { useRealtimeData } from '../hooks/useRealtimeData';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { cn } from './ui/utils';

interface ReportsProps {
  onBack: () => void;
  onTransactionClick?: (transactionId: string) => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type ReportType = 'overview';

export default function Reports({ onBack, onTransactionClick }: ReportsProps) {
  // Use dedicated Reports data hook
  const { employees, cashEntries, loading: reportsLoading, error: reportsError, refreshReportsData, loadReportsMetrics } = useReportsData();
  
  // Create cashState from cashEntries
  const cashState = useMemo(() => ({
    entries: cashEntries,
    currentBalance: cashEntries.reduce((sum, entry) => sum + entry.amount, 0)
  }), [cashEntries]);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [financialMetrics, setFinancialMetrics] = useState({
    currentBalance: 0,
    totalSpent: 0,
    totalEarned: 0,
    netProfit: 0,
    totalTransactions: 0,
    totalPurchases: 0,
    totalSales: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [reportsMetrics, setReportsMetrics] = useState<{
    totalTransactions: number;
    totalBought: number;
    totalSold: number;
    totalExpenses: number;
    netProfit: number;
    buyCount: number;
    sellCount: number;
    topItems: Array<{
      name: string;
      total: number;
      weight: number;
      pieces: number;
    }>;
    employeePerformance: Array<{
      name: string;
      transactionCount: number;
      totalValue: number;
      avgValue: number;
    }>;
    chartData: Array<{
      date: string;
      purchases: number;
      sales: number;
    }>;
  }>({
    totalTransactions: 0,
    totalBought: 0,
    totalSold: 0,
    totalExpenses: 0,
    netProfit: 0,
    buyCount: 0,
    sellCount: 0,
    topItems: [],
    employeePerformance: [],
    chartData: []
  });

  // Load reports metrics when date filter changes
  useEffect(() => {
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const dateRange = getDateRange();
        
        const options = dateRange ? {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        } : undefined;
        
        console.log('Reports - Loading reports metrics with options:', { 
          dateFilter, 
          dateRange: dateRange ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() } : null,
          options 
        });
        
        const metrics = await loadReportsMetrics(options);
        setReportsMetrics(metrics);
        
        // Also update financial metrics for the cards
        setFinancialMetrics({
          currentBalance: cashState.currentBalance,
          totalSpent: metrics.totalBought + metrics.totalExpenses,
          totalEarned: metrics.totalSold,
          netProfit: metrics.netProfit,
          totalTransactions: metrics.totalTransactions,
          totalPurchases: metrics.buyCount,
          totalSales: metrics.sellCount
        });
      } catch (error) {
        console.error('Error loading reports metrics:', error);
      } finally {
        setLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [dateFilter, dateRange, loadReportsMetrics, cashState.currentBalance]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

  const getDateRange = (): { start: Date; end: Date } | null => {
    const now = new Date();
    
    let result: { start: Date; end: Date } | null = null;
    
    switch (dateFilter) {
      case 'all':
        result = null; // No date filtering
        break;
      case 'today':
        result = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case 'week':
        result = { start: startOfWeek(now), end: endOfWeek(now) };
        break;
      case 'month':
        result = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'year':
        result = { start: startOfYear(now), end: endOfYear(now) };
        break;
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          result = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) };
        } else {
          result = { start: startOfDay(now), end: endOfDay(now) };
        }
        break;
      default:
        result = { start: startOfDay(now), end: endOfDay(now) };
    }
    
    console.log('Reports - getDateRange for filter:', dateFilter, 'result:', result ? {
      start: result.start.toISOString(),
      end: result.end.toISOString(),
      startLocal: result.start.toLocaleDateString(),
      endLocal: result.end.toLocaleDateString()
    } : 'null');
    
    return result;
  };

  // Use reportsMetrics directly from database queries
  const reportData = reportsMetrics;


  // Debug chart data
  useEffect(() => {
    console.log('Chart data updated:', reportData.chartData);
    console.log('Chart data length:', reportData.chartData.length);
    console.log('Chart data dates:', reportData.chartData.map((d: any) => d.date));
  }, [reportData.chartData]);

  const pieData = [
    { name: 'Purchases', value: reportData.totalBought, color: '#ef4444' },
    { name: 'Sales', value: reportData.totalSold, color: '#22c55e' },
    { name: 'Expenses', value: reportData.totalExpenses, color: '#f59e0b' },
  ];

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'custom': 
        if (dateRange?.from && dateRange?.to) {
          return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`;
        }
        return 'Custom Range';
      default: return 'All Time';
    }
  };

  const handleTransactionClick = (transactionId: string) => {
    if (onTransactionClick) {
      onTransactionClick(transactionId);
    }
  };

  const getProfitIcon = () => {
    if (reportData.netProfit > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (reportData.netProfit < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getProfitColor = () => {
    if (reportData.netProfit > 0) return 'text-emerald-400';
    if (reportData.netProfit < 0) return 'text-red-400';
    return 'text-purple-200';
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
        <div className="relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Business Analytics
              </h2>
              <p className="text-purple-200">Comprehensive insights for {getDateFilterLabel()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Balance */}
        <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-blue-200">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Current Balance</p>
              <div className="text-3xl font-bold text-white mb-1">
                {loadingMetrics ? (
                  <div className="flex items-center space-x-2 text-white">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  formatCurrency(financialMetrics.currentBalance)
                )}
              </div>
              <p className="text-xs text-purple-200">Available cash on hand</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-green-200">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-sm font-medium">Revenue</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Total Earned</p>
              <p className="text-3xl font-bold text-green-200 mb-1">
                {formatCurrency(reportData.totalSold)}
              </p>
              <p className="text-xs text-purple-200">{getDateFilterLabel()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-red-200">
                  <ArrowDownRight className="h-4 w-4" />
                  <span className="text-sm font-medium">Expenses</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-red-200 mb-1">
                {formatCurrency(reportData.totalBought + reportData.totalExpenses)}
              </p>
              <p className="text-xs text-purple-200">{getDateFilterLabel()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
                reportData.netProfit >= 0 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                  : 'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className={`flex items-center space-x-1 ${
                  reportData.netProfit >= 0 ? 'text-green-200' : 'text-red-200'
                }`}>
                  {getProfitIcon()}
                  <span className="text-sm font-medium">Profit</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">Net Profit</p>
              <p className={`text-3xl font-bold mb-1 ${
                reportData.netProfit >= 0 ? 'text-green-200' : 'text-red-200'
              }`}>
                {formatCurrency(reportData.netProfit)}
              </p>
              <p className="text-xs text-purple-200">{getDateFilterLabel()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Expenses Chart */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center space-x-2 text-white">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <span>Revenue vs Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.chartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="purchasesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.7)" 
                    interval={reportData.chartData.length > 20 ? "preserveStartEnd" : 0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      color: 'white'
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stackId="1"
                    stroke="#22c55e"
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="purchases"
                    stackId="2"
                    stroke="#ef4444"
                    fill="url(#purchasesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center space-x-2 text-white">
              <PieChart className="h-5 w-5 text-purple-400" />
              <span>Revenue Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      color: 'white'
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData?.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-white">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Items & Employee Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Items */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Package className="h-5 w-5 text-purple-400" />
              <span>Top Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.topItems?.filter(item => item && item.name)?.map((item: any, index: number) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-purple-200">{item.weight}kg • {item.pieces} pieces</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatCurrency(item.total)}</p>
                    <p className="text-sm text-purple-200">Total Value</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-purple-400" />
              <span>Employee Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.employeePerformance?.filter(emp => emp && emp.name)?.map((emp: any, index: number) => (
                <div key={`emp-${emp.name || 'unknown'}-${index}`} className="flex items-center justify-between p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{emp.name}</p>
                      <p className="text-sm text-purple-200">{emp.transactionCount} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatCurrency(emp.totalValue)}</p>
                    <p className="text-sm text-purple-200">Total Value</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Show loading state if Reports data is still loading
  if (reportsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-semibold text-white mb-2">Loading Reports Data</h3>
              <p className="text-purple-200">Fetching all transactions and analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if Reports data failed to load
  if (reportsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-red-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Reports</h3>
              <p className="text-purple-200 mb-4">{reportsError}</p>
              <Button onClick={refreshReportsData} variant="outline" className="text-white hover:text-white hover:bg-white/20 border border-white/20 bg-white/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="relative z-10 p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="text-white hover:text-white hover:bg-white/20 border border-white/20 bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Reports & Analytics
              </h1>
              <p className="text-purple-200">Comprehensive business insights and performance metrics</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              className="text-white border-white/20 hover:bg-white/20 bg-white/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Filter */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-purple-400" />
                  <span className="font-semibold text-white">Time Period:</span>
                </div>
                <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateFilter === 'custom' && (
                  <div className="flex items-center space-x-3">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 w-[320px] justify-between rounded-lg border-white/20 bg-white/10 px-4 py-2 text-left font-medium shadow-sm transition-all duration-200 hover:border-purple-400 hover:bg-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-white",
                            !dateRange && "text-purple-200"
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-purple-400" />
                            <span>
                              {dateRange?.from ? (
                                dateRange.to ? (
                                  'Change date range'
                                ) : (
                                  'Select end date'
                                )
                              ) : (
                                'Select date range'
                              )}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-purple-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 shadow-xl" 
                        align="start"
                        sideOffset={4}
                      >
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                              console.log('Date range selected:', range);
                              setDateRange(range);
                            }}
                            numberOfMonths={2}
                            className="rounded-lg"
                            classNames={{
                              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-semibold text-gray-900",
                              nav: "space-x-1 flex items-center",
                              nav_button: cn(
                                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100 transition-colors duration-200"
                              ),
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                              row: "flex w-full mt-2",
                              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-50 [&:has([aria-selected].day-outside)]:text-gray-400 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                              day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md transition-all duration-200 hover:bg-gray-100 focus:bg-gray-100"
                              ),
                              day_range_start: "bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700 rounded-l-md",
                              day_range_end: "bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700 rounded-r-md",
                              day_selected: "bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700 rounded-md",
                              day_range_middle: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-none",
                              day_today: "bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200",
                              day_outside: "text-gray-400 opacity-50 hover:bg-gray-50",
                              day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
                              day_hidden: "invisible",
                            }}
                            modifiers={{
                              selected: dateRange?.from && dateRange?.to ? 
                                { from: dateRange.from, to: dateRange.to } : 
                                dateRange?.from ? { from: dateRange.from, to: dateRange.from } : 
                                undefined
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                  <Activity className="h-3 w-3 mr-1" />
                  {getDateFilterLabel()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Report Content */}
        <div className="animate-fade-in">
          {renderOverview()}
        </div>
      </div>
    </div>
  );
}