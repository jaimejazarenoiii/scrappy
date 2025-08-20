import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import BuyScrap from './components/BuyScrap';
import SellScrap from './components/SellScrap';
import EmployeeManagement from './components/Employees';
import Reports from './components/Reports';
import CashManagement from './components/CashManagement';
import TransactionDetails from './components/TransactionDetails';
import TransactionsList from './components/TransactionsList';
import AllTransactions from './components/AllTransactions';
import PaymentProcessing from './components/PaymentProcessing';
import Login from './components/Login';
import UserHeader from './components/UserHeader';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRealtimeData } from './hooks/useRealtimeData';
import { Transaction, CashEntry, Employee } from './services/supabaseService';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/button';

export type TransactionStatus = 'in-progress' | 'for-payment' | 'completed' | 'cancelled';

export interface CashAdvance {
  id: string;
  amount: number;
  date: string;
  description: string;
  status: 'active' | 'deducted';
}

function AppContent() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  
  // Use real-time data hook
  const {
    transactions,
    employees,
    cashEntries,
    loading: dataLoading,
    error: dataError,
    addTransaction,
    updateTransaction,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addCashEntry,
    addCashAdvance,
    updateEmployeeStats,
    updateCashAdvanceStatus,
    generateTransactionId,
    refreshData
  } = useRealtimeData();

  // Real-time data is automatically loaded by the useRealtimeData hook

  // Show loading screen while checking authentication or loading data
  if (authLoading || (user && dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto">
            <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">
            {authLoading ? 'Loading Scrappy...' : 'Loading your data...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show error state if data failed to load
  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-3">
                <p>{dataError}</p>
                <Button 
                  onClick={refreshData}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleTransactionClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setCurrentView('transaction-details');
  };

  const selectedTransaction = transactions.find(t => t.id === selectedTransactionId);

  // Calculate current balance considering cash entries and transactions
  const calculateCurrentBalance = () => {
    // Start with cash entries (opening balance, adjustments, expenses)
    let balance = cashEntries.reduce((sum, entry) => {
      switch (entry.type) {
        case 'opening':
        case 'adjustment':
          return sum + entry.amount; // Positive for opening balance and adjustments
        case 'expense':
          return sum - entry.amount; // Negative for expenses
        case 'transaction':
          return sum + entry.amount; // Transaction-related cash movements
        default:
          return sum;
      }
    }, 0);

    // Add/subtract completed transactions
    transactions.forEach(transaction => {
      if (transaction.status === 'completed') {
        if (transaction.type === 'sell') {
          balance += transaction.total; // Selling scrap adds money
        } else if (transaction.type === 'buy') {
          balance -= transaction.total; // Buying scrap costs money
        }
      }
    });



    return balance;
  };

  const currentBalance = calculateCurrentBalance();



  const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
    try {
      await updateTransaction(updatedTransaction);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error updating transaction:', error);
      // You could show a toast notification here
    }
  };

  const handleAddTransaction = async (newTransaction: Transaction) => {
    try {
      await addTransaction(newTransaction);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error adding transaction:', error);
      // You could show a toast notification here
    }
  };

  const handleAddCashEntry = async (entry: CashEntry) => {
    try {
      await addCashEntry(entry);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error adding cash entry:', error);
      // You could show a toast notification here
    }
  };

  const handleAddEmployee = async (employee: Employee) => {
    try {
      await addEmployee(employee);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error adding employee:', error);
      // You could show a toast notification here
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      await updateEmployee(updatedEmployee);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error updating employee:', error);
      // You could show a toast notification here
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId);
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error deleting employee:', error);
      // You could show a toast notification here
    }
  };

  // Employee role restrictions
  const getAvailableViews = () => {
    if (user.role === 'owner') {
      return ['dashboard', 'buy-scrap', 'sell-scrap', 'employees', 'reports', 'cash', 'payment-processing', 'transaction-details'];
    } else {
      return ['dashboard', 'buy-scrap', 'sell-scrap', 'transaction-details'];
    }
  };

  const availableViews = getAvailableViews();

  // Filter transactions based on user role
  const getFilteredTransactions = () => {
    if (user.role === 'owner') {
      return transactions; // Owners see all transactions
    } else {
      // Employees see only their own transactions
      return transactions.filter(t => t.employee === user.name);
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const renderCurrentView = () => {
    // Restrict access based on user permissions
    if (!availableViews.includes(currentView)) {
      setCurrentView('dashboard');
      return null;
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            transactions={filteredTransactions}
            cashEntries={cashEntries}
            onNavigate={setCurrentView}
            onTransactionClick={handleTransactionClick}
            userRole={user.role}
          />
        );
      case 'buy-scrap':
        return (
                    <BuyScrap 
            onBack={() => setCurrentView('dashboard')}
            onComplete={handleAddTransaction}
            employees={employees}
            currentBalance={currentBalance}
            generateTransactionId={generateTransactionId}
            onNavigateToTransaction={(transactionId) => {
              setSelectedTransactionId(transactionId);
              setCurrentView('transaction-details');
            }}
          />
        );
      case 'sell-scrap':
        return (
                    <SellScrap 
            onBack={() => setCurrentView('dashboard')}
            onComplete={handleAddTransaction}
            employees={employees}
            generateTransactionId={generateTransactionId}
            onNavigateToTransaction={(transactionId) => {
              setSelectedTransactionId(transactionId);
              setCurrentView('transaction-details');
            }}
          />
        );
      case 'employees':
        if (!hasPermission('manage_employees')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <EmployeeManagement 
            employees={employees} 
            addEmployee={addEmployee}
            updateEmployee={updateEmployee}
            deleteEmployee={deleteEmployee}
            onBack={() => setCurrentView('dashboard')}
            onAddAdvance={addCashAdvance}
            onRefreshStats={updateEmployeeStats}
            onUpdateAdvanceStatus={updateCashAdvanceStatus}
          />
        );
      case 'reports':
        if (!hasPermission('view_reports')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <Reports 
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')} 
            onTransactionClick={handleTransactionClick}
          />
        );
      case 'cash':
        if (!hasPermission('manage_cash')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <CashManagement 
            cashEntries={cashEntries}
            onBack={() => setCurrentView('dashboard')}
            onAddEntry={handleAddCashEntry}
            currentEmployee={user.name}
          />
        );
      case 'transaction-details':
        if (selectedTransaction) {
          // Owners can edit any transaction
          // Employees can only view transactions
          const canEdit = user.role === 'owner';
          
          return (
            <TransactionDetails
              transaction={selectedTransaction}
              onBack={() => setCurrentView('dashboard')}
              onUpdate={handleTransactionUpdate}
              readOnly={!canEdit}
              userRole={user.role}
            />
          );
        }
        return null;
      case 'transactions-list':
        if (!hasPermission('view_all_transactions')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <TransactionsList
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleTransactionClick}
          />
        );
      case 'all-transactions':
        if (!hasPermission('view_all_transactions')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <AllTransactions 
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleTransactionClick}
            userRole={user.role}
            onRefresh={refreshData}
            loading={dataLoading}
          />
        );
      case 'payment-processing':
        if (!hasPermission('process_payments')) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <PaymentProcessing
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleTransactionClick}
            onTransactionUpdate={handleTransactionUpdate}
            onAddCashEntry={handleAddCashEntry}
            currentEmployee={user.name}
          />
        );
      default:
        return (
          <Dashboard 
            transactions={filteredTransactions}
            cashEntries={cashEntries}
            onNavigate={setCurrentView}
            onTransactionClick={handleTransactionClick}
            userRole={user.role}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <UserHeader />
      <div className="container mx-auto px-4">
        {renderCurrentView()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}