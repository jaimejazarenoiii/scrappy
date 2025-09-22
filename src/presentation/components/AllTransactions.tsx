import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';
import { format } from 'date-fns';
import { DateRange as DateRangePicker } from 'react-day-picker';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  SortAsc,
  SortDesc,
  Eye,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Transaction } from '../../infrastructure/database/supabaseService';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type FilterType = 'all' | 'buy' | 'sell';
type StatusFilter = 'all' | 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
type SortField = 'timestamp' | 'total' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

interface AllTransactionsProps {
  transactions: Transaction[];
  onBack: () => void;
  onTransactionClick: (transactionId: string) => void;
  userRole: 'owner' | 'employee';
  onRefresh?: () => void;
  loading?: boolean;
  onUpdateTransactionStatus?: (transactionId: string, status: 'in-progress' | 'for-payment' | 'completed' | 'cancelled', completedAt?: string) => Promise<void>;
}

export default function AllTransactions({ 
  transactions, 
  onBack, 
  onTransactionClick, 
  userRole, 
  onRefresh, 
  loading = false,
  onUpdateTransactionStatus
}: AllTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedTransactions, setPaginatedTransactions] = useState<Transaction[]>([]);
  const [loadingPaginated, setLoadingPaginated] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    total: 0,
    inProgress: 0,
    forPayment: 0,
    completed: 0,
    cancelled: 0,
    totalValue: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  const { loadTransactionsPage, loadTransactionsCount } = useRealtimeData();

  // Helper function to get date range
  const getDateRange = (): { start: Date; end: Date } | null => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) };
        }
        return null;
      default:
        return null; // 'all' - no date filtering
    }
  };

  // Load metrics based on current filters
  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const dateRange = getDateRange();
      const typeFilter = filterType === 'all' ? undefined : filterType;
      
      // Load counts for each status separately
      const [totalCount, inProgressCount, forPaymentCount, completedCount, cancelledCount] = await Promise.all([
        loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: undefined, // All statuses
          type: typeFilter
        }),
        loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: ['in-progress'],
          type: typeFilter
        }),
        loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: ['for-payment'],
          type: typeFilter
        }),
        loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: ['completed'],
          type: typeFilter
        }),
        loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: ['cancelled'],
          type: typeFilter
        })
      ]);
      
      setMetrics({
        total: totalCount,
        inProgress: inProgressCount,
        forPayment: forPaymentCount,
        completed: completedCount,
        cancelled: cancelledCount,
        totalValue: 0 // Would need separate query for total value
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Load initial data when filters change
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingPaginated(true);
      try {
        const dateRange = getDateRange();
        const statusArray = statusFilter === 'all' ? undefined : [statusFilter];
        const typeFilter = filterType === 'all' ? undefined : filterType;
        
        // Load first page of transactions
        const transactions = await loadTransactionsPage({
          page: 1,
          limit: 20,
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: statusArray,
          type: typeFilter
        });
        
        // Load total count for pagination
        const count = await loadTransactionsCount({
          startDate: dateRange?.start.toISOString(),
          endDate: dateRange?.end.toISOString(),
          status: statusArray,
          type: typeFilter
        });
        
        setPaginatedTransactions(transactions);
        setTotalCount(count);
        setTotalPages(Math.ceil(count / 20));
        setCurrentPage(1); // Reset to page 1
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoadingPaginated(false);
      }
    };

    loadInitialData();
    loadMetrics();
  }, [dateFilter, dateRange, statusFilter, filterType]);

  // Function to load a specific page (called by pagination buttons)
  const loadPage = async (page: number) => {
    setLoadingPaginated(true);
    try {
      const dateRange = getDateRange();
      const statusArray = statusFilter === 'all' ? undefined : [statusFilter];
      const typeFilter = filterType === 'all' ? undefined : filterType;
      
      // Load only the specific page of transactions
      const transactions = await loadTransactionsPage({
        page: page,
        limit: 20,
        startDate: dateRange?.start.toISOString(),
        endDate: dateRange?.end.toISOString(),
        status: statusArray,
        type: typeFilter
      });
      
      setPaginatedTransactions(transactions);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setLoadingPaginated(false);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2 
    }).format(amount);

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Apply search filter to paginated transactions
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return paginatedTransactions;
    
    const searchLower = searchTerm.toLowerCase();
    return paginatedTransactions.filter(t => 
      t.id.toLowerCase().includes(searchLower) ||
      (t.customerName && t.customerName.toLowerCase().includes(searchLower)) ||
      t.employee.toLowerCase().includes(searchLower) ||
      t.customerType.toLowerCase().includes(searchLower)
    );
  }, [paginatedTransactions, searchTerm]);

  // Use metrics from separate queries
  const stats = metrics;

  const getStatusBadge = (status: Transaction['status']) => {
    const statusConfig = {
      'in-progress': { bg: 'bg-white/10', text: 'text-yellow-200', label: 'In Progress', icon: Clock },
      'for-payment': { bg: 'bg-white/10', text: 'text-blue-200', label: 'For Payment', icon: AlertCircle },
      'completed': { bg: 'bg-white/10', text: 'text-green-200', label: 'Completed', icon: CheckCircle },
      'cancelled': { bg: 'bg-white/10', text: 'text-red-200', label: 'Cancelled', icon: XCircle }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.bg} ${config.text} border border-white/20`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Payment processing function
  const handleProcessPayment = async (transactionId: string) => {
    if (!onUpdateTransactionStatus) return;
    
    try {
      setProcessingPayment(transactionId);
      console.log('Processing payment for transaction:', transactionId);
      
      await onUpdateTransactionStatus(transactionId, 'completed', new Date().toISOString());
      
      console.log('Payment processed successfully for transaction:', transactionId);
      
      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the current page data and metrics after successful payment processing
      await refreshCurrentPage();
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setProcessingPayment(null);
    }
  };

  // Function to refresh current page data and metrics
  const refreshCurrentPage = async () => {
    try {
      setRefreshing(true);
      const dateRange = getDateRange();
      const statusArray = statusFilter === 'all' ? undefined : [statusFilter];
      const typeFilter = filterType === 'all' ? undefined : filterType;
      
      // Refresh current page transactions
      const transactions = await loadTransactionsPage({
        page: currentPage,
        limit: 20,
        startDate: dateRange?.start.toISOString(),
        endDate: dateRange?.end.toISOString(),
        status: statusArray,
        type: typeFilter
      });
      
      // Refresh total count
      const count = await loadTransactionsCount({
        startDate: dateRange?.start.toISOString(),
        endDate: dateRange?.end.toISOString(),
        status: statusArray,
        type: typeFilter
      });
      
      // Update state
      setPaginatedTransactions(transactions);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 20));
      
      // Refresh metrics
      await loadMetrics();
      
      console.log('Page data refreshed after payment processing');
    } catch (error) {
      console.error('Error refreshing page data:', error);
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <div className="min-h-screen relative">
      
      <div className="relative z-10 p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button
                variant="outline"
                onClick={onBack}
                className="text-white hover:text-white hover:bg-white/20 border border-white/20 bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="hidden sm:block h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                  <span>All Transactions</span>
                  {refreshing && <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-purple-400" />}
                </h1>
                <p className="text-purple-200 mt-1 text-sm sm:text-base">Manage and track all business transactions</p>
              </div>
            </div>
          
          {onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center space-x-2 text-white border-white/20 hover:bg-white/20 bg-white/10 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-white">Total</p>
                {loadingMetrics ? (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.total}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-white">In Progress</p>
                {loadingMetrics ? (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.inProgress}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-white">For Payment</p>
                {loadingMetrics ? (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.forPayment}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-white">Completed</p>
                {loadingMetrics ? (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.completed}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-white">Cancelled</p>
                {loadingMetrics ? (
                  <div className="flex items-center mt-1 sm:mt-2">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <p className="text-xl sm:text-3xl font-bold text-white mt-1">{stats.cancelled}</p>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
          <CardTitle className="flex items-center space-x-3 text-xl text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
            <Input
              placeholder="Search transactions, customers, employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus:border-purple-400 focus:ring-purple-200 rounded-lg"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Type</label>
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="for-payment">For Payment</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">Date</label>
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Date Range</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-12 justify-start text-left font-normal bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-200"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range: DateRangePicker | undefined) => setDateRange(range)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
          <CardTitle className="flex items-center justify-between text-xl text-white">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span>Transactions ({totalCount})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPaginated ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
                <p className="text-white">Loading transactions...</p>
              </div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="group relative bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-200 overflow-hidden"
                >
                  {/* Main Transaction Content */}
                  <div 
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() => onTransactionClick(transaction.id)}
                  >
                    {/* Mobile Layout */}
                    <div className="block sm:hidden">
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            transaction.type === 'buy' 
                              ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white' 
                              : 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                          }`}>
                            {transaction.type === 'buy' ? (
                              <ShoppingCart className="h-5 w-5" />
                            ) : (
                              <DollarSign className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white">
                              #{transaction.id.slice(-8)}
                            </h3>
                            <p className={`text-sm font-medium ${
                              transaction.type === 'buy' ? 'text-red-200' : 'text-green-200'
                            }`}>
                              {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.type === 'buy' ? 'text-red-200' : 'text-green-200'
                          }`}>
                            {transaction.type === 'buy' ? '-' : '+'}
                            {formatCurrency(transaction.total)}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                      
                      {/* Details Row */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-sm text-purple-200">
                          <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}</span>
                        </div>
                        
                        {transaction.customerName && (
                          <div className="flex items-center text-sm text-purple-200">
                            <span className="w-4 h-4 mr-2 flex-shrink-0 text-purple-400">👤</span>
                            <span className="truncate">{transaction.customerName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-purple-200">
                          <span className="w-4 h-4 mr-2 flex-shrink-0 text-purple-400">👷</span>
                          <span className="truncate">{transaction.employee}</span>
                          <span className="mx-2">•</span>
                          <span>{transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex justify-end">
                        {transaction.status === 'for-payment' && onUpdateTransactionStatus ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcessPayment(transaction.id);
                            }}
                            disabled={processingPayment === transaction.id}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm w-full sm:w-auto"
                          >
                            {processingPayment === transaction.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Process Payment
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTransactionClick(transaction.id);
                            }}
                            className="text-white border-white/20 hover:bg-white/20 bg-white/10 w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-start justify-between">
                        {/* Left Section - Transaction Info */}
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Transaction Type Icon */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                            transaction.type === 'buy' 
                              ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white' 
                              : 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                          }`}>
                            {transaction.type === 'buy' ? (
                              <ShoppingCart className="h-6 w-6" />
                            ) : (
                              <DollarSign className="h-6 w-6" />
                            )}
                          </div>
                          
                          {/* Transaction Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-white truncate">
                                #{transaction.id.slice(-8)}
                              </h3>
                              {getStatusBadge(transaction.status)}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center space-x-4 text-sm text-purple-200">
                                <span className="flex items-center">
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}
                                </span>
                                {transaction.customerName && (
                                  <span className="flex items-center">
                                    <span className="w-1 h-1 bg-purple-400 rounded-full mr-2"></span>
                                    {transaction.customerName}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-purple-200">
                                <span>Employee: {transaction.employee}</span>
                                <span className="w-1 h-1 bg-purple-300 rounded-full"></span>
                                <span>{transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Amount and Actions */}
                        <div className="flex items-center space-x-4">
                          {/* Amount Display */}
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              transaction.type === 'buy' ? 'text-red-200' : 'text-green-200'
                            }`}>
                              {transaction.type === 'buy' ? '-' : '+'}
                              {formatCurrency(transaction.total)}
                            </p>
                            <p className="text-sm text-purple-200 mt-1">
                              {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                            </p>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex items-center space-x-2">
                            {transaction.status === 'for-payment' && onUpdateTransactionStatus ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcessPayment(transaction.id);
                                }}
                                disabled={processingPayment === transaction.id}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm"
                              >
                                {processingPayment === transaction.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Process Payment
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTransactionClick(transaction.id);
                                }}
                                className="text-white border-white/20 hover:bg-white/20 bg-white/10"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-200 rounded-xl pointer-events-none transition-colors duration-200"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-purple-400 mb-3" />
              <p className="text-white">No transactions found</p>
              <p className="text-sm text-purple-200">Try adjusting your filters</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
              <div className="text-sm text-white">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loadingPaginated}
                  className="text-white border-white/20 hover:bg-white/20 bg-white/10"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => loadPage(pageNum)}
                        disabled={loadingPaginated}
                        className={`w-8 h-8 p-0 ${
                          currentPage === pageNum 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : 'text-white border-white/20 hover:bg-white/20 bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-purple-200">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => loadPage(totalPages)}
                        disabled={loadingPaginated}
                        className={`w-8 h-8 p-0 ${
                          currentPage === totalPages 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : 'text-white border-white/20 hover:bg-white/20 bg-white/10'
                        }`}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || loadingPaginated}
                  className="text-white border-white/20 hover:bg-white/20 bg-white/10"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}


