import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, 
  Search, 
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  User,
  MapPin,
  Package
} from 'lucide-react';
import { Transaction, TransactionStatus } from '../App';

interface PaymentProcessingProps {
  transactions: Transaction[];
  onBack: () => void;
  onUpdateStatus: (transactionId: string, newStatus: TransactionStatus) => void;
  onTransactionClick: (transactionId: string) => void;
}

type StatusFilter = 'all' | 'for-payment' | 'in-progress' | 'completed' | 'cancelled';

export default function PaymentProcessing({ 
  transactions, 
  onBack, 
  onUpdateStatus, 
  onTransactionClick 
}: PaymentProcessingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('for-payment');

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

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'for-payment':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'in-progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'for-payment':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">For Payment</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
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

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const forPayment = transactions.filter(t => t.status === 'for-payment').length;
    const inProgress = transactions.filter(t => t.status === 'in-progress').length;
    const completed = transactions.filter(t => t.status === 'completed').length;
    const totalPendingAmount = transactions
      .filter(t => t.status === 'for-payment')
      .reduce((sum, t) => sum + t.total, 0);

    return { forPayment, inProgress, completed, totalPendingAmount };
  }, [transactions]);

  const handleStatusUpdate = (transactionId: string, newStatus: TransactionStatus) => {
    onUpdateStatus(transactionId, newStatus);
  };

  const canProcessPayment = (transaction: Transaction) => {
    return transaction.status === 'for-payment';
  };

  const canCancel = (transaction: Transaction) => {
    return transaction.status !== 'cancelled' && transaction.status !== 'completed';
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
            <h1 className="text-2xl font-bold">Payment Processing</h1>
            <p className="text-gray-600">Process payments and manage transaction status</p>
          </div>
        </div>
        
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {stats.forPayment} awaiting payment
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">For Payment</p>
                <p className="text-2xl font-bold">{stats.forPayment}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
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
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalPendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Search & Filter:</span>
            </div>
            
            {/* Transaction ID Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Transaction ID, Customer, Employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="for-payment">For Payment</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Queue</CardTitle>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(transaction.status)}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(transaction.status)}
                          <span className="font-medium text-lg">#{transaction.id}</span>
                          <span className="text-sm text-gray-600">
                            {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <Badge variant={transaction.type === 'buy' ? 'destructive' : 'default'} className="text-xs">
                            {transaction.type.toUpperCase()}
                          </Badge>
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(transaction.total)}
                      </p>
                      {transaction.expenses && transaction.expenses > 0 && (
                        <p className="text-sm text-gray-500">
                          +{formatCurrency(transaction.expenses)} expenses
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canProcessPayment(transaction) && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(transaction.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Process Payment
                        </Button>
                      )}
                      
                      {canCancel(transaction) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(transaction.id, 'cancelled')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransactionClick(transaction.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Process Payment - Mark transaction as paid</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Cancel - Cancel transaction</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span>View Details - Open transaction details</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}