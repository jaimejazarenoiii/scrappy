import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
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
  Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { Transaction, CashState, Employee } from '../App';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { cn } from './ui/utils';

interface ReportsProps {
  transactions: Transaction[];
  cashState: CashState;
  employees: Employee[];
  onBack: () => void;
  onTransactionClick?: (transactionId: string) => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
type ReportType = 'overview' | 'transactions' | 'employees' | 'items';

export default function Reports({ transactions, cashState, employees, onBack, onTransactionClick }: ReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('overview');
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

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange();
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions, dateFilter, dateRange]);

  const reportData = useMemo(() => {
    const buyTransactions = filteredTransactions.filter(t => t.type === 'buy');
    const sellTransactions = filteredTransactions.filter(t => t.type === 'sell');
    
    const totalBought = buyTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalSold = sellTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalExpenses = filteredTransactions.reduce((sum, t) => sum + (t.expenses || 0), 0);
    const netProfit = totalSold - totalBought - totalExpenses;

    // Item analysis
    const itemStats = new Map<string, { quantity: number; revenue: number; transactions: number }>();
    filteredTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const key = item.name;
        const existing = itemStats.get(key) || { quantity: 0, revenue: 0, transactions: 0 };
        itemStats.set(key, {
          quantity: existing.quantity + (item.weight || item.pieces || 0),
          revenue: existing.revenue + item.total,
          transactions: existing.transactions + 1
        });
      });
    });

    const topItems = Array.from(itemStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Employee performance
    const employeeStats = new Map<string, { transactions: number; revenue: number }>();
    filteredTransactions.forEach(transaction => {
      if (transaction.employee) {
        const existing = employeeStats.get(transaction.employee) || { transactions: 0, revenue: 0 };
        employeeStats.set(transaction.employee, {
          transactions: existing.transactions + 1,
          revenue: existing.revenue + transaction.total
        });
      }
    });

    const employeePerformance = Array.from(employeeStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    // Daily trends
    const dailyData = new Map<string, { date: string; buy: number; sell: number; profit: number }>();
    filteredTransactions.forEach(transaction => {
      const dateKey = format(new Date(transaction.timestamp), 'MMM dd');
      const existing = dailyData.get(dateKey) || { date: dateKey, buy: 0, sell: 0, profit: 0 };
      
      if (transaction.type === 'buy') {
        existing.buy += transaction.total;
        existing.profit -= transaction.total;
      } else {
        existing.sell += transaction.total;
        existing.profit += transaction.total;
      }
      
      dailyData.set(dateKey, existing);
    });

    const chartData = Array.from(dailyData.values()).sort();

    return {
      totalBought,
      totalSold,
      totalExpenses,
      netProfit,
      transactionCount: filteredTransactions.length,
      buyCount: buyTransactions.length,
      sellCount: sellTransactions.length,
      topItems,
      employeePerformance,
      chartData
    };
  }, [filteredTransactions]);

  const pieData = [
    { name: 'Purchases', value: reportData.totalBought, color: '#ef4444' },
    { name: 'Sales', value: reportData.totalSold, color: '#22c55e' },
    { name: 'Expenses', value: reportData.totalExpenses, color: '#f59e0b' },
  ];

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

  const handleTransactionClick = (transactionId: string) => {
    if (onTransactionClick) {
      onTransactionClick(transactionId);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalSold)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalBought)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold">{reportData.transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Daily Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="sell" fill="#22c55e" name="Sales" />
                <Bar dataKey="buy" fill="#ef4444" name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Transaction Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found for the selected period</p>
          ) : (
            filteredTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleTransactionClick(transaction.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Badge variant={transaction.type === 'buy' ? 'destructive' : 'default'}>
                      {transaction.type.toUpperCase()}
                    </Badge>
                    <span className="font-medium">#{transaction.id}</span>
                    <span className="text-sm text-gray-600">{formatDate(transaction.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {transaction.items.length} items • {transaction.employee || 'No employee'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`font-bold ${transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(transaction.total)}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderEmployees = () => (
    <div className="space-y-4">
      {/* Employee Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
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
                <p className="text-sm text-gray-600">Weekly Payroll</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(employees.reduce((sum, emp) => sum + emp.weeklySalary, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Advances</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(employees.reduce((sum, emp) => sum + emp.currentAdvances, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance ({getDateFilterLabel()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportData.employeePerformance.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No employee activity for the selected period</p>
            ) : (
              reportData.employeePerformance.map((emp, index) => (
                <div key={emp.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {emp.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-sm text-gray-600">{emp.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(emp.revenue)}</p>
                    <p className="text-sm text-gray-600">#{index + 1} performer</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderItems = () => (
    <Card>
      <CardHeader>
        <CardTitle>Top Items ({getDateFilterLabel()})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reportData.topItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items data for the selected period</p>
          ) : (
            reportData.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.quantity} units • {item.transactions} transactions
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
                <SelectItem value="items">Items</SelectItem>
              </SelectContent>
            </Select>

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

            <Badge variant="secondary">
              {getDateFilterLabel()} • {filteredTransactions.length} transactions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportType === 'overview' && renderOverview()}
      {reportType === 'transactions' && renderTransactions()}
      {reportType === 'employees' && renderEmployees()}
      {reportType === 'items' && renderItems()}
    </div>
  );
}