import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateRange } from 'react-day-picker';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Wallet, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  PhilippinePeso,
  Filter,
  CalendarIcon
} from 'lucide-react';
import { CashEntry, supabaseDataService } from '../../infrastructure/database/supabaseService';
import { useBusinessContext } from '../hooks/useBusinessContext';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { cn } from './ui/utils';

interface CashManagementProps {
  cashEntries: CashEntry[];
  onBack: () => void;
  onAddEntry: (entry: CashEntry) => void;
  currentEmployee: string;
}

interface NewExpense {
  type: string;
  amount: string;
  description: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function CashManagement({ cashEntries, onBack, onAddEntry, currentEmployee }: CashManagementProps) {
  // Safely get business context with fallback
  let currentBusiness = null;
  try {
    const businessContext = useBusinessContext();
    currentBusiness = businessContext.currentBusiness;
  } catch (error) {
    console.warn('Business context not available, using fallback:', error);
    // Use default business ID as fallback
    currentBusiness = { id: '00000000-0000-0000-0000-000000000001', name: 'Default Business' };
  }
  const [additionalFunds, setAdditionalFunds] = useState('');
  const [newExpense, setNewExpense] = useState<NewExpense>({
    type: 'Utilities',
    amount: '',
    description: ''
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [paginatedEntries, setPaginatedEntries] = useState<CashEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Metrics state (separate from pagination)
  const [metrics, setMetrics] = useState({
    transactionIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
    sellIncome: 0,
    buyExpenses: 0,
    generalExpenses: 0,
    adjustments: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const expenseCategories = [
    'Utilities', 'Rent', 'Equipment', 'Maintenance', 'Marketing', 
    'Office Supplies', 'Insurance', 'Miscellaneous'
  ];

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  // Load paginated cash entries
  const loadPaginatedEntries = async (page: number = 1, reset: boolean = true) => {
    setLoadingEntries(true);
    try {
      const dateRange = getDateRange();
      
      const result = await supabaseDataService.getCashEntriesPaginated(
        page, 
        pageSize, 
        {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        }
      );

      if (reset) {
        setPaginatedEntries(result.entries);
      } else {
        setPaginatedEntries(prev => [...prev, ...result.entries]);
      }
      
      setTotalEntries(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading paginated entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  // Load metrics separately from pagination
  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const dateRange = getDateRange();
      
      const metricsData = await supabaseDataService.getCashMetrics({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Load entries when date filter changes
  useEffect(() => {
    setCurrentPage(1);
    loadPaginatedEntries(1, true);
    loadMetrics(); // Load metrics separately
  }, [dateFilter, dateRange]);

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
  
  // Use paginated entries instead of filtering all entries
  const filteredCashEntries = paginatedEntries;

  // Metrics are now loaded separately and stored in state
  const {
    transactionIncome: totalTransactionIncome,
    totalExpenses: totalTransactionExpenses,
    currentBalance,
    sellIncome: totalSellIncome,
    buyExpenses: totalBuyExpenses,
    generalExpenses: totalGeneralExpenses,
    adjustments: totalAdjustments
  } = metrics;


  const addFunds = async () => {
    if (!additionalFunds) return;
    
    const amount = parseFloat(additionalFunds);
    const entryId = crypto.randomUUID();
    
    const entry: CashEntry = {
      id: entryId,
      type: 'adjustment',
      amount: amount,
      description: 'Additional funds added',
      timestamp: new Date().toISOString(),
      employee: currentEmployee,
      businessId: currentBusiness?.id || '00000000-0000-0000-0000-000000000001'
    };
    
    onAddEntry(entry);
    setAdditionalFunds('');
    // Refresh paginated entries and metrics to show the new funds
    loadPaginatedEntries(currentPage, true);
    loadMetrics();
  };

  const addExpense = async () => {
    console.log('Add Expense clicked, newExpense:', newExpense);
    
    if (!newExpense.amount || !newExpense.description) {
      console.log('Validation failed - missing amount or description');
      return;
    }
    
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid amount:', newExpense.amount);
      return;
    }
    
    const entryId = crypto.randomUUID();
    
    const entry: CashEntry = {
      id: entryId,
      type: 'expense',
      amount: -amount, // Negative for expenses
      description: `${newExpense.type}: ${newExpense.description}`,
      timestamp: new Date().toISOString(),
      employee: currentEmployee,
      businessId: currentBusiness?.id || '00000000-0000-0000-0000-000000000001'
    };
    
    console.log('Creating expense entry:', entry);
    try {
      await onAddEntry(entry);
      setNewExpense({
        type: 'Utilities',
        amount: '',
        description: ''
      });
      // Refresh paginated entries and metrics to show the new expense
      loadPaginatedEntries(currentPage, true);
      loadMetrics();
      console.log('Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const removeExpense = async (entryId: string) => {
    // Note: In a real implementation, you would need to pass a delete function from parent
    // For now, we'll just log that this would delete the entry
    console.log('Would delete cash entry:', entryId);
    // TODO: Implement delete functionality in data service and pass delete handler from parent
  };

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
      
      <div className="relative z-10 p-4 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Cash & Expense Management</h1>
        </div>

        {/* Date Filter Controls */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">View Period:</span>
              </div>
              
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
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
                      "w-60 justify-start text-left font-normal bg-white/10 border-white/20 text-white",
                      !dateRange && "text-purple-200"
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
              {getDateFilterLabel()} • {filteredCashEntries.length} entries
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cash Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Transaction Income</p>
                <p className="text-2xl font-bold text-green-200">
                  {formatCurrency(totalTransactionIncome)}
                </p>
                <p className="text-xs text-purple-200 mt-1">All positive entries</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-200">
                  {formatCurrency(totalTransactionExpenses)}
                </p>
                <p className="text-xs text-red-600 mt-1">All negative entries</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Current Balance</p>
                {loadingMetrics ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                    <span className="text-white">Loading...</span>
                  </div>
                ) : (
                  <p className={`text-2xl font-bold ${
                    currentBalance >= 0 ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {formatCurrency(currentBalance)}
                  </p>
                )}
                <p className="text-xs text-purple-200 mt-1">All time total</p>
              </div>
              <PhilippinePeso className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Balance Alert */}
      {currentBalance < 5000 && (
        <Card className="bg-white/10 backdrop-blur-xl border border-orange-400/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-orange-400" />
              <div>
                <h3 className="font-semibold text-white">Critical Cash Level</h3>
                <p className="text-sm text-orange-200">
                  Your current balance is critically low. Consider adding more funds or reducing expenses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Management Actions */}
      <div className="grid grid-cols-1 gap-6">
        {/* Add Funds */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Plus className="h-5 w-5" />
              <span>Add Funds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-white mb-2 block">Amount to Add</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount to add"
                value={additionalFunds}
                onChange={(e) => setAdditionalFunds(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-purple-200"
              />
            </div>
            <Button onClick={addFunds} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <p className="text-sm text-purple-200">
              Add cash to your current balance.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add General Expense */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
          <CardTitle className="flex items-center space-x-2 text-white">
            <Receipt className="h-5 w-5" />
            <span>Add General Expense</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-white mb-2 block">Expense Category</Label>
              <Select 
                value={newExpense.type} 
                onValueChange={(value) => setNewExpense({...newExpense, type: value})}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-2 block">Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder:text-purple-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-2 block">Description</Label>
              <Input
                placeholder="Enter description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                className="bg-white/10 border-white/20 text-white placeholder:text-purple-200"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={addExpense} 
                disabled={!newExpense.amount || !newExpense.description || isNaN(parseFloat(newExpense.amount)) || parseFloat(newExpense.amount) <= 0}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
          <CardTitle className="flex items-center justify-between text-white">
            <span>Cash Entries</span>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              {getDateFilterLabel()}: {totalEntries} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span className="ml-3 text-white">Loading entries...</span>
            </div>
          ) : filteredCashEntries.length > 0 ? (
            <div className="space-y-3">
              {filteredCashEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/20">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        entry.type === 'opening' ? 'default' :
                        entry.type === 'sell' ? 'default' :
                        entry.type === 'buy' ? 'destructive' :
                        entry.type === 'expense' ? 'destructive' :
                        'secondary'
                      } className="bg-white/10 text-white border-white/20">
                        {entry.type}
                      </Badge>
                      <span className="font-medium text-white">{entry.description}</span>
                    </div>
                    <p className="text-sm text-purple-200">
                      {entry.employee} • {new Date(entry.timestamp).toLocaleString('en-PH', { 
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`font-semibold ${
                      entry.amount >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                    </span>
                    {entry.type === 'expense' && entry.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExpense(entry.id!)}
                        className="text-red-200 hover:text-red-300 hover:bg-white/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {totalEntries > pageSize && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
                  <div className="text-sm text-purple-200">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPaginatedEntries(currentPage - 1, true)}
                      disabled={currentPage === 1 || loadingEntries}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-white px-3">
                      Page {currentPage} of {Math.ceil(totalEntries / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPaginatedEntries(currentPage + 1, true)}
                      disabled={!hasMore || loadingEntries}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-purple-200">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cash entries found for {getDateFilterLabel().toLowerCase()}</p>
              <p className="text-sm">Try selecting a different date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow Summary */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
          <CardTitle className="text-white">Cash Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span className="ml-3 text-white">Loading metrics...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-green-200">
                <span>Transaction Income</span>
                <span>+{formatCurrency(totalTransactionIncome)}</span>
              </div>
              <div className="flex justify-between text-red-200">
                <span>Transaction Expenses</span>
                <span>-{formatCurrency(totalTransactionExpenses)}</span>
              </div>
              <Separator className="bg-white/20" />
              <div className="text-sm text-purple-200 space-y-1">
                <div className="flex justify-between">
                  <span>• Sell Scrap Income</span>
                  <span>+{formatCurrency(totalSellIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Buy Scrap Expenses</span>
                  <span>-{formatCurrency(totalBuyExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• General Expenses</span>
                  <span>-{formatCurrency(totalGeneralExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Adjustments</span>
                  <span>{totalAdjustments >= 0 ? '+' : ''}{formatCurrency(totalAdjustments)}</span>
                </div>
              </div>
              <Separator className="bg-white/20" />
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-white">Current Balance (All Time)</span>
                <span className={currentBalance >= 0 ? 'text-green-200' : 'text-red-200'}>
                  {formatCurrency(currentBalance)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}