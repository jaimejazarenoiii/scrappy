import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';
import { format } from 'date-fns';
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
  RefreshCw
} from 'lucide-react';
import { Transaction } from '../services/supabaseService';

type FilterType = 'all' | 'buy' | 'sell';
type StatusFilter = 'all' | 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
type SortField = 'timestamp' | 'total' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AllTransactionsProps {
  transactions: Transaction[];
  onBack: () => void;
  onTransactionClick: (transactionId: string) => void;
  userRole: 'owner' | 'employee';
  onRefresh?: () => void;
  loading?: boolean;
}

export default function AllTransactions({ 
  transactions, 
  onBack, 
  onTransactionClick, 
  userRole,
  onRefresh,
  loading = false 
}: AllTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(searchLower) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchLower)) ||
        t.employee.toLowerCase().includes(searchLower) ||
        t.customerType.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.timestamp);
        
        switch (dateFilter) {
          case 'today':
            return transactionDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return transactionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return transactionDate >= monthAgo;
          case 'custom':
            if (dateRange?.from && dateRange?.to) {
              return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'customer':
          aValue = a.customerName || '';
          bValue = b.customerName || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, searchTerm, filterType, statusFilter, dateFilter, dateRange, sortField, sortDirection]);

  const stats = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    const inProgress = filteredAndSortedTransactions.filter(t => t.status === 'in-progress').length;
    const forPayment = filteredAndSortedTransactions.filter(t => t.status === 'for-payment').length;
    const completed = filteredAndSortedTransactions.filter(t => t.status === 'completed').length;
    const cancelled = filteredAndSortedTransactions.filter(t => t.status === 'cancelled').length;
    
    const totalValue = filteredAndSortedTransactions.reduce((sum, t) => 
      sum + (t.type === 'sell' ? t.total : -t.total), 0
    );
    
    return { total, inProgress, forPayment, completed, cancelled, totalValue };
  }, [filteredAndSortedTransactions]);

  const getStatusBadge = (status: Transaction['status']) => {
    const statusConfig = {
      'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress', icon: Clock },
      'for-payment': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'For Payment', icon: AlertCircle },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: CheckCircle },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled', icon: XCircle }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.bg} ${config.text} border-0`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
            <p className="text-gray-600">Comprehensive transaction management</p>
          </div>
        </div>
        
        {onRefresh && (
          <Button 
            variant="outline" 
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              <p className="text-xs text-blue-600">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-900">{stats.inProgress}</p>
              <p className="text-xs text-yellow-600">In Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-900">{stats.forPayment}</p>
              <p className="text-xs text-orange-600">For Payment</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
              <p className="text-xs text-red-600">Cancelled</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-purple-900">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-purple-600">Net Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search transactions, customers, employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger>
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger>
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger>
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transactions ({filteredAndSortedTransactions.length})</span>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500">Sort by:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('timestamp')}
                className="flex items-center space-x-1"
              >
                <span>Date</span>
                {getSortIcon('timestamp')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('total')}
                className="flex items-center space-x-1"
              >
                <span>Amount</span>
                {getSortIcon('total')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('status')}
                className="flex items-center space-x-1"
              >
                <span>Status</span>
                {getSortIcon('status')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            </div>
          ) : filteredAndSortedTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredAndSortedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                  onClick={() => onTransactionClick(transaction.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'buy' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {transaction.type === 'buy' ? (
                        <ShoppingCart className="h-5 w-5" />
                      ) : (
                        <DollarSign className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">#{transaction.id}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                        <span>{formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}</span>
                        {transaction.customerName && <span>• {transaction.customerName}</span>}
                        <span>• {transaction.employee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'buy' ? '-' : '+'}
                        {formatCurrency(transaction.total)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No transactions found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
