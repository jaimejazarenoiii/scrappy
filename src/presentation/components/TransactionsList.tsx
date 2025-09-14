import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  CalendarIcon,
  Eye,
  ShoppingCart,
  DollarSign,
  User,
  MapPin,
  Package
} from 'lucide-react';
import { Transaction } from '../App';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from './ui/utils';

interface TransactionsListProps {
  transactions: Transaction[];
  onBack: () => void;
  onTransactionClick: (transactionId: string) => void;
}

type FilterType = 'all' | 'buy' | 'sell';
type StatusFilter = 'all' | 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function TransactionsList({ transactions, onBack, onTransactionClick }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const formatTime = (date: Date) => 
    new Date(date).toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

  const getDateRange = () => {
    const now = new Date();
    const today = startOfDay(now);
    const endToday = endOfDay(now);
    
    switch (dateFilter) {
      case 'today':
        return { start: today, end: endToday };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: endToday };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return { start: monthStart, end: endToday };
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by date
    const dateRangeFilter = getDateRange();
    if (dateRangeFilter) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.timestamp);
        return transactionDate >= dateRangeFilter.start && transactionDate <= dateRangeFilter.end;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(searchLower) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchLower)) ||
        t.customerType.toLowerCase().includes(searchLower) ||
        (t.employee && t.employee.toLowerCase().includes(searchLower)) ||
        (t.location && t.location.toLowerCase().includes(searchLower)) ||
        t.items.some(item => item.name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, searchTerm, filterType, statusFilter, dateFilter, dateRange]);

  const stats = useMemo(() => {
    const totalTransactions = filteredTransactions.length;
    const buyTransactions = filteredTransactions.filter(t => t.type === 'buy').length;
    const sellTransactions = filteredTransactions.filter(t => t.type === 'sell').length;
    const totalAmount = filteredTransactions.reduce((sum, t) => {
      return sum + (t.type === 'sell' ? t.total : -t.total);
    }, 0);

    const inProgressCount = filteredTransactions.filter(t => t.status === 'in-progress').length;
    const forPaymentCount = filteredTransactions.filter(t => t.status === 'for-payment').length;
    const completedCount = filteredTransactions.filter(t => t.status === 'completed').length;

    return {
      totalTransactions,
      buyTransactions,
      sellTransactions,
      totalAmount,
      inProgressCount,
      forPaymentCount,
      completedCount
    };
  }, [filteredTransactions]);

  const getStatusBadge = (status: import('../App').TransactionStatus) => {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'for-payment':
        return <Badge className="bg-blue-100 text-blue-800">For Payment</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">All Transactions</h1>
            <p className="text-gray-600">Complete transaction history</p>
          </div>
        </div>
        
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {stats.totalTransactions} transactions
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Purchases</p>
                <p className="text-2xl font-bold">{stats.buyTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sales</p>
                <p className="text-2xl font-bold">{stats.sellTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                stats.totalAmount >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Amount</p>
                <p className={`text-2xl font-bold ${
                  stats.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(Math.abs(stats.totalAmount))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Purchases</SelectItem>
                <SelectItem value="sell">Sales</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
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

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-60 justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onTransactionClick(transaction.id)}
                >
                  <div className="space-y-3">
                    {/* Header with prominent ID and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
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
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-bold text-gray-900">#{transaction.id}</span>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${
                          transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(transaction.total)}
                        </p>
                        {transaction.expenses && transaction.expenses > 0 && (
                          <p className="text-sm text-gray-500">
                            +{formatCurrency(transaction.expenses)} expenses
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <Badge variant={transaction.type === 'buy' ? 'destructive' : 'default'} className="text-xs">
                          {transaction.type.toUpperCase()}
                        </Badge>
                        <span>{formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}</span>
                        {transaction.customerName && (
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{transaction.customerName}</span>
                          </span>
                        )}
                        <span className="capitalize">{transaction.customerType}</span>
                        <span>{transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}</span>
                        {transaction.employee && (
                          <span>• {transaction.employee}</span>
                        )}
                        {transaction.location && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-32">{transaction.location}</span>
                          </span>
                        )}
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>

                    {/* Images Preview */}
                    {(transaction.sessionImages || transaction.items.some(item => item.images && item.images.length > 0)) && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {transaction.sessionImages ? transaction.sessionImages.length : 0} session + {' '}
                            {transaction.items.reduce((sum, item) => sum + (item.images?.length || 0), 0)} item photos
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}