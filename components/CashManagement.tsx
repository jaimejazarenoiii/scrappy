import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
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
  PhilippinePeso
} from 'lucide-react';
import { CashEntry } from '../services/supabaseService';

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

export default function CashManagement({ cashEntries, onBack, onAddEntry, currentEmployee }: CashManagementProps) {
  const [newStartingCash, setNewStartingCash] = useState('');
  const [additionalFunds, setAdditionalFunds] = useState('');
  const [newExpense, setNewExpense] = useState<NewExpense>({
    type: 'Utilities',
    amount: '',
    description: ''
  });
  
  // Calculate derived values from cash entries
  const currentBalance = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const openingEntries = cashEntries.filter(e => e.type === 'opening');
  const expenseEntries = cashEntries.filter(e => e.type === 'expense');
  const transactionEntries = cashEntries.filter(e => e.type === 'transaction');
  const adjustmentEntries = cashEntries.filter(e => e.type === 'adjustment');
  
  const startingCash = openingEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const totalTransactions = transactionEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalAdjustments = adjustmentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const netCashFlow = currentBalance - startingCash;

  const expenseCategories = [
    'Utilities', 'Rent', 'Equipment', 'Maintenance', 'Marketing', 
    'Office Supplies', 'Insurance', 'Miscellaneous'
  ];

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const setStartingCash = async () => {
    if (!newStartingCash) return;
    
    const amount = parseFloat(newStartingCash);
    const entryId = crypto.randomUUID();
    
    const entry: CashEntry = {
      id: entryId,
      type: 'opening',
      amount: amount,
      description: 'Daily opening balance',
      timestamp: new Date().toISOString(),
      employee: currentEmployee
    };
    
    onAddEntry(entry);
    setNewStartingCash('');
  };

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
      employee: currentEmployee
    };
    
    onAddEntry(entry);
    setAdditionalFunds('');
  };

  const addExpense = async () => {
    if (!newExpense.amount || !newExpense.description) return;
    
    const amount = parseFloat(newExpense.amount);
    const entryId = crypto.randomUUID();
    
    const entry: CashEntry = {
      id: entryId,
      type: 'expense',
      amount: -amount, // Negative for expenses
      description: `${newExpense.type}: ${newExpense.description}`,
      timestamp: new Date().toISOString(),
      employee: currentEmployee
    };
    
    onAddEntry(entry);
    setNewExpense({
      type: 'Utilities',
      amount: '',
      description: ''
    });
  };

  const removeExpense = async (entryId: string) => {
    // Note: In a real implementation, you would need to pass a delete function from parent
    // For now, we'll just log that this would delete the entry
    console.log('Would delete cash entry:', entryId);
    // TODO: Implement delete functionality in data service and pass delete handler from parent
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Cash & Expense Management</h1>
      </div>

      {/* Cash Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Starting Cash</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(startingCash)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Transaction Income</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(Math.max(0, totalTransactions))}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(totalExpenses + Math.abs(Math.min(0, totalTransactions)))}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Current Balance</p>
                <p className={`text-2xl font-bold ${
                  currentBalance >= 0 ? 'text-purple-900' : 'text-red-900'
                }`}>
                  {formatCurrency(currentBalance)}
                </p>
              </div>
              <PhilippinePeso className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Balance Alert */}
      {currentBalance < 5000 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-orange-900">Critical Cash Level</h3>
                <p className="text-sm text-orange-700">
                  Your current balance is critically low. Consider adding more funds or reducing expenses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Management Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Starting Cash */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>Set Starting Cash</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New Starting Cash Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={newStartingCash}
                onChange={(e) => setNewStartingCash(e.target.value)}
              />
            </div>
            <Button onClick={setStartingCash} className="w-full">
              <Wallet className="h-4 w-4 mr-2" />
              Add Starting Cash
            </Button>
            <p className="text-sm text-gray-600">
              This will add opening balance to your current balance.
            </p>
          </CardContent>
        </Card>

        {/* Add Funds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Additional Funds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Additional Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount to add"
                value={additionalFunds}
                onChange={(e) => setAdditionalFunds(e.target.value)}
              />
            </div>
            <Button onClick={addFunds} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <p className="text-sm text-gray-600">
              Add extra cash to your current balance.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add General Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Add General Expense</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Expense Category</Label>
              <Select 
                value={newExpense.type} 
                onValueChange={(value) => setNewExpense({...newExpense, type: value})}
              >
                <SelectTrigger>
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
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                placeholder="Enter description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={addExpense} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Cash Entries</span>
            <Badge variant="outline">
              Total: {cashEntries.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashEntries.length > 0 ? (
            <div className="space-y-3">
              {cashEntries
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
                .map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        entry.type === 'opening' ? 'default' :
                        entry.type === 'transaction' ? entry.amount > 0 ? 'default' : 'destructive' :
                        entry.type === 'expense' ? 'destructive' :
                        'secondary'
                      }>
                        {entry.type}
                      </Badge>
                      <span className="font-medium">{entry.description}</span>
                    </div>
                    <p className="text-sm text-gray-600">
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
                      entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                    </span>
                    {entry.type === 'expense' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExpense(entry.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cash entries recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Starting Balance</span>
              <span>{formatCurrency(startingCash)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Transaction Income</span>
              <span>+{formatCurrency(Math.max(0, totalTransactions))}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Transaction Expenses (Purchases)</span>
              <span>-{formatCurrency(Math.abs(Math.min(0, totalTransactions)))}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>General Expenses</span>
              <span>-{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Adjustments</span>
              <span>{totalAdjustments >= 0 ? '+' : ''}{formatCurrency(totalAdjustments)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Current Balance</span>
              <span className={currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Net Cash Flow</span>
              <span className={netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}