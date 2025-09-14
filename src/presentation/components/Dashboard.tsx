import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
import { 
  ShoppingCart, 
  DollarSign, 
  Users, 
  BarChart3, 
  Wallet,
  Plus,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarIcon,
  Filter,
  Eye
} from 'lucide-react';
import { Transaction } from '../../infrastructure/database/supabaseService';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { cn } from './ui/utils';

interface DashboardProps {
  onNavigate: (view: string) => void;
  transactions: Transaction[];
  currentBalance: number;
  cashEntries: any[];
  onTransactionClick?: (transactionId: string) => void;
  userRole: 'owner' | 'employee';
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function Dashboard({ onNavigate, transactions, cashEntries, onTransactionClick, userRole, currentBalance }: DashboardProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatTime = (date: Date) => 
    new Date(date).toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) };
        }
        return { start: startOfDay(now), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'custom': 
        if (dateRange?.from && dateRange?.to) {
          return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  // Helper function to calculate transaction total from items when database total is 0
  const calculateTransactionTotal = (transaction: Transaction): number => {
    // If transaction.total exists and is not 0, use it
    if (transaction.total && transaction.total !== 0) {
      return transaction.total;
    }
    
    // Otherwise, calculate from items
    if (transaction.items && transaction.items.length > 0) {
      const subtotal = transaction.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const expenses = transaction.expenses || 0;
      
      // For buy transactions: total = subtotal + expenses (expenses are costs)
      // For sell transactions: total = subtotal - expenses (expenses reduce revenue)
      return transaction.type === 'buy' ? subtotal + expenses : subtotal - expenses;
    }
    
    return 0;
  };

  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    const filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= start && transactionDate <= end;
    });

    const buyTransactions = filtered.filter(t => t.type === 'buy');
    const sellTransactions = filtered.filter(t => t.type === 'sell');
    // Only read from completed transactions for calculations
    const completedTransactions = filtered.filter(t => t.status === 'completed');
    const completedBuyTransactions = completedTransactions.filter(t => t.type === 'buy');
    const completedSellTransactions = completedTransactions.filter(t => t.type === 'sell');
    
    const completedTotalBought = completedBuyTransactions.reduce((sum, t) => sum + calculateTransactionTotal(t), 0);
    const completedTotalSold = completedSellTransactions.reduce((sum, t) => sum + calculateTransactionTotal(t), 0);
    const completedTotalExpenses = completedTransactions.reduce((sum, t) => sum + (t.expenses || 0), 0);
    const completedNetProfit = completedTotalSold - completedTotalBought - completedTotalExpenses;

    // Recent transactions from filtered data
    const recentTransactions = filtered.slice(0, 5);

    return {
      transactions: filtered,
      recentTransactions,
      totalBought: completedTotalBought,
      totalSold: completedTotalSold,
      totalExpenses: completedTotalExpenses,
      netProfit: completedNetProfit,
      transactionCount: filtered.length,
      buyCount: buyTransactions.length,
      sellCount: sellTransactions.length
    };
  }, [transactions, dateFilter, dateRange]);

  const handleTransactionClick = (transactionId: string) => {
    if (onTransactionClick) {
      onTransactionClick(transactionId);
    }
  };

  // Employee Dashboard - Simplified View
  if (userRole === 'employee') {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
            Employee Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Scrap buying and selling operations</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
          <Button
            onClick={() => onNavigate('buy-scrap')}
            className="h-36 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/25 border-0 transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-white/20 rounded-full">
                <Plus className="h-8 w-8" />
              </div>
              <span className="font-semibold text-lg">Buy Scrap</span>
              <span className="text-sm opacity-90">Purchase materials</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('sell-scrap')}
            className="h-36 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/25 border-0 transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-white/20 rounded-full">
                <DollarSign className="h-8 w-8" />
              </div>
              <span className="font-semibold text-lg">Sell Scrap</span>
              <span className="text-sm opacity-90">Process sales</span>
            </div>
          </Button>
        </div>

        {/* Employee's Transactions */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Transactions</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getDateFilterLabel()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredData.recentTransactions.length > 0 ? (
            filteredData.recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleTransactionClick(transaction.id)}
              >
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">
                        #{transaction.id} - {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'for-payment' ? 'bg-blue-100 text-blue-800' :
                        transaction.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'completed' ? 'Completed' :
                         transaction.status === 'for-payment' ? 'For Payment' :
                         transaction.status === 'in-progress' ? 'In Progress' :
                         'Cancelled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)} • {transaction.employee}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(calculateTransactionTotal(transaction))}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions found for {getDateFilterLabel().toLowerCase()}</p>
              <p className="text-sm">Try selecting a different date range</p>
            </div>
          )}

          {filteredData.recentTransactions.length > 0 && filteredData.transactionCount > 5 && (
            <div className="pt-3 border-t border-gray-200">
              <Button 
                variant="outline" 
                  onClick={() =>
                    onNavigate('all-transactions')
                  }
                className="w-full"
              >
                View All {filteredData.transactionCount} Transactions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    );
  }

  // Owner Dashboard - Full Analytics View
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
          Business Overview
        </h1>
        <p className="text-gray-600 mt-2 text-lg">Complete business analytics and management</p>
      </div>

      {/* Date Filter Controls */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg shadow-gray-900/10">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">View Period:</span>
            </div>
            
            <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

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

            <Badge variant="secondary" className="ml-auto">
              {getDateFilterLabel()} • {filteredData.transactionCount} transactions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 border-0 shadow-xl shadow-blue-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-semibold">Current Balance</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">
                  {userRole === 'owner' ? formatCurrency(currentBalance) : '---'}
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">Available Cash</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Wallet className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50/80 to-red-100/80 border-0 shadow-xl shadow-red-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-semibold">Total Spent</p>
                <p className="text-2xl font-bold text-red-900 mt-2">
                  {formatCurrency(filteredData.totalBought + filteredData.totalExpenses)}
                </p>
                <p className="text-xs text-red-600 mt-2 font-medium">{getDateFilterLabel()}</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <TrendingDown className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 border-0 shadow-xl shadow-emerald-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-semibold">Total Earned</p>
                <p className="text-2xl font-bold text-emerald-900 mt-2">
                  {formatCurrency(filteredData.totalSold)}
                </p>
                <p className="text-xs text-emerald-600 mt-2 font-medium">{getDateFilterLabel()}</p>
              </div>
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border-0 shadow-xl backdrop-blur-sm transform hover:scale-105 transition-all duration-300 ${
          filteredData.netProfit >= 0 
            ? 'from-purple-50/80 to-purple-100/80 shadow-purple-500/20' 
            : 'from-orange-50/80 to-orange-100/80 shadow-orange-500/20'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${
                  filteredData.netProfit >= 0 ? 'text-purple-600' : 'text-orange-600'
                }`}>
                  Net Profit
                </p>
                <p className={`text-2xl font-bold mt-2 ${
                  filteredData.netProfit >= 0 ? 'text-purple-900' : 'text-orange-900'
                }`}>
                  {formatCurrency(filteredData.netProfit)}
                </p>
                <p className={`text-xs mt-2 font-medium ${
                  filteredData.netProfit >= 0 ? 'text-purple-600' : 'text-orange-600'
                }`}>
                  {getDateFilterLabel()}
                </p>
              </div>
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center shadow-lg ${
                filteredData.netProfit >= 0 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/30' 
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30'
              }`}>
                <DollarSign className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary for Selected Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredData.transactionCount}
                </p>
                <p className="text-xs text-gray-600 mt-1">{getDateFilterLabel()}</p>
              </div>
              <div className="h-10 w-10 bg-gray-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Purchases</p>
                <p className="text-xl font-bold text-red-900">
                  {filteredData.buyCount}
                </p>
                <p className="text-xs text-red-600 mt-1">{formatCurrency(filteredData.totalBought)}</p>
              </div>
              <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Sales</p>
                <p className="text-xl font-bold text-green-900">
                  {filteredData.sellCount}
                </p>
                <p className="text-xs text-green-600 mt-1">{formatCurrency(filteredData.totalSold)}</p>
              </div>
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Funds Alert */}
      {userRole === 'owner' && cashEntries.reduce((sum, entry) => sum + entry.amount, 0) < 10000 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">Low Funds Alert</h3>
                <p className="text-sm text-orange-700">
                  Current balance is below ₱10,000. Consider adding more cash.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Buttons */}
      <div className={`grid gap-4 ${userRole === 'owner' ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-2'}`}>
        <Button
          onClick={() => onNavigate('buy-scrap')}
          className="h-24 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
        >
          <div className="flex flex-col items-center space-y-2">
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Buy Scrap</span>
          </div>
        </Button>

        <Button
          onClick={() => onNavigate('sell-scrap')}
          className="h-24 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
        >
          <div className="flex flex-col items-center space-y-2">
            <DollarSign className="h-6 w-6" />
            <span className="text-sm font-medium">Sell Scrap</span>
          </div>
        </Button>

        {userRole === 'owner' && (
          <>
            <Button
              onClick={() => onNavigate('payment-processing')}
              className="h-24 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-sm font-medium">Payment</span>
              </div>
            </Button>

            <Button
              onClick={() => onNavigate('reports')}
              className="h-24 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm font-medium">Reports</span>
              </div>
            </Button>

            <Button
              onClick={() => onNavigate('cash')}
              className="h-24 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <Wallet className="h-6 w-6" />
                <span className="text-sm font-medium">Cash & Expenses</span>
              </div>
            </Button>

            <Button
              onClick={() => onNavigate('employees')}
              className="h-24 bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <Users className="h-6 w-6" />
                <span className="text-sm font-medium">Employees</span>
              </div>
            </Button>
            
            <Button
              onClick={() => onNavigate('all-transactions')}
              className="h-24 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <Receipt className="h-6 w-6" />
                <span className="text-sm font-medium">All Transactions</span>
              </div>
            </Button>
          </>
        )}
      </div>

      {/* Recent Transactions for Selected Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Transactions</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getDateFilterLabel()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredData.recentTransactions.length > 0 ? (
            filteredData.recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleTransactionClick(transaction.id)}
              >
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">
                        #{transaction.id} - {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'for-payment' ? 'bg-blue-100 text-blue-800' :
                        transaction.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'completed' ? 'Completed' :
                         transaction.status === 'for-payment' ? 'For Payment' :
                         transaction.status === 'in-progress' ? 'In Progress' :
                         'Cancelled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)} • {transaction.employee}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(calculateTransactionTotal(transaction))}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions found for {getDateFilterLabel().toLowerCase()}</p>
              <p className="text-sm">Try selecting a different date range</p>
            </div>
          )}

          {userRole === 'owner' && filteredData.recentTransactions.length > 0 && filteredData.transactionCount > 5 && (
            <div className="pt-3 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => onNavigate('all-transactions')}
                className="w-full"
              >
                View All {filteredData.transactionCount} Transactions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}