import { useState, useEffect } from 'react';
import Dashboard from './presentation/components/Dashboard';
import BuyScrap from './presentation/components/BuyScrap';
import SellScrap from './presentation/components/SellScrap';
import EmployeeManagement from './presentation/components/Employees';
import Reports from './presentation/components/Reports';
import CashManagement from './presentation/components/CashManagement';
import TransactionDetails from './presentation/components/TransactionDetails';
import TransactionsList from './presentation/components/TransactionsList';
import AllTransactions from './presentation/components/AllTransactions';
import PaymentProcessing from './presentation/components/PaymentProcessing';
import Login from './presentation/components/Login';
import UserHeader from './presentation/components/UserHeader';
import { AuthProvider, useAuth } from './presentation/contexts/AuthContext';
import { useRealtimeData } from './presentation/hooks/useRealtimeData';
import { Transaction, CashEntry, Employee, supabaseDataService } from './infrastructure/database/supabaseService';
import { Alert, AlertDescription } from './presentation/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './presentation/components/ui/button';
// import { TransactionProvider } from './presentation/contexts/TransactionContext'; // Temporarily disabled

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
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState<Transaction | null>(null);
  
  // Use real-time data hook
  const {
    transactions,
    employees,
    cashEntries,
    loading: dataLoading,
    error: dataError,
    addTransaction,
    updateTransaction,
    updateTransactionStatus,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addCashEntry,
    addCashAdvance,
    updateCashAdvanceStatus,
    refreshData,
    loadTransactionDetails
  } = useRealtimeData();

  // Simplified cash flow calculations - no starting cash concept
  const expenseEntries = cashEntries.filter(e => e.type === 'expense');
  const transactionEntries = cashEntries.filter(e => e.type === 'transaction');
  const adjustmentEntries = cashEntries.filter(e => e.type === 'adjustment');

  // Calculate totals - expenses are already stored as negative amounts
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0); // Already negative
  const totalTransactionRevenue = transactionEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalAdjustments = adjustmentEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // Calculate available cash (sum of all entries)
  const availableCash = totalTransactionRevenue + totalAdjustments + totalExpenses;

  // Generate transaction ID using the service method for sequential IDs
  const generateTransactionId = async (): Promise<string> => {
    return await supabaseDataService.generateTransactionId();
  };

  // Handle transaction completion
  const handleTransactionComplete = async (transaction: Transaction) => {
    try {
      console.log('Transaction completed:', transaction);
      await addTransaction(transaction);
      
      // Create a cash entry for this transaction
      const cashEntry = {
        id: crypto.randomUUID(),
        type: 'transaction' as const,
        amount: transaction.type === 'buy' ? -transaction.total : transaction.total, // Buy transactions are negative (money out), sell transactions are positive (money in)
        description: `${transaction.type === 'buy' ? 'Purchase' : 'Sale'} - ${transaction.customerName || 'Customer'}`,
        timestamp: transaction.timestamp,
        employee: transaction.employee,
        transaction_id: transaction.id
      };
      
      console.log('Creating cash entry:', cashEntry);
      await addCashEntry(cashEntry);
      
      setCurrentView('dashboard');
      refreshData(); // Refresh data to show new transaction and updated cash
    } catch (error) {
      console.error('Error saving transaction:', error);
      // You might want to show an error message to the user here
    }
  };

  // Handle navigation to transaction details
  const handleNavigateToTransaction = async (transactionId: string) => {
    try {
      // First try to get the transaction from the current transactions array
      let transaction = transactions.find(t => t.id === transactionId);
      
      // If not found, missing items, or missing session images, fetch full details from database
      if (!transaction || !transaction.items || transaction.items.length === 0 || !transaction.sessionImages) {
        console.log('Fetching full transaction details for:', transactionId, 'Reason:', {
          notFound: !transaction,
          noItems: !transaction?.items || transaction.items.length === 0,
          noSessionImages: !transaction?.sessionImages
        });
        const fullTransaction = await loadTransactionDetails(transactionId);
        if (fullTransaction) {
          transaction = fullTransaction;
        }
      }
      
      if (transaction) {
        setSelectedTransactionDetails(transaction);
        setSelectedTransactionId(transactionId);
        setCurrentView('transaction-details');
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
      // Fallback to showing transaction from current array
      const fallbackTransaction = transactions.find(t => t.id === transactionId);
      if (fallbackTransaction) {
        setSelectedTransactionDetails(fallbackTransaction);
        setSelectedTransactionId(transactionId);
        setCurrentView('transaction-details');
      }
    }
  };

  // Handle cash advance
  const handleAddAdvance = async (employeeId: string, advance: any) => {
    try {
      console.log('Adding cash advance:', { employeeId, advance });
      await addCashAdvance(employeeId, advance);
      console.log('Cash advance saved successfully');
    } catch (error) {
      console.error('Error saving cash advance:', error);
      // You might want to show an error message to the user here
    }
  };

  // Handle cash advance status update
  const handleUpdateAdvanceStatus = async (advanceId: string, status: 'active' | 'deducted' | 'pending', employeeId?: string) => {
    try {
      console.log('Updating cash advance status:', { advanceId, status, employeeId });
      await updateCashAdvanceStatus(advanceId, status, employeeId);
      console.log('Cash advance status updated successfully');
    } catch (error) {
      console.error('Error updating cash advance status:', error);
      // You might want to show an error message to the user here
    }
  };

  // Handle save draft (for backward compatibility)
  const handleSaveDraft = async (transaction: Transaction) => {
    try {
      await addTransaction(transaction);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Show loading state
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show error state
  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p>Failed to load application data:</p>
                <p className="text-sm text-red-700">{dataError}</p>
                <Button 
                  onClick={refreshData}
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            transactions={transactions}
            cashEntries={cashEntries}
            currentBalance={availableCash}
            onNavigate={(view: string) => setCurrentView(view)}
            onTransactionClick={handleNavigateToTransaction}
            userRole={user?.role || 'employee'}
          />
        );

      case 'buy-scrap':
        return (
          <BuyScrap
            onBack={() => setCurrentView('dashboard')}
            onComplete={handleTransactionComplete}
            employees={employees}
            currentBalance={availableCash}
            generateTransactionId={generateTransactionId}
            onNavigateToTransaction={handleNavigateToTransaction}
            onSaveDraft={handleSaveDraft}
          />
        );

      case 'sell-scrap':
        return (
          <SellScrap
            onBack={() => setCurrentView('dashboard')}
            onComplete={handleTransactionComplete}
            employees={employees}
            generateTransactionId={generateTransactionId}
            onNavigateToTransaction={handleNavigateToTransaction}
            onSaveDraft={handleSaveDraft}
          />
        );

      case 'employees':
        return (
          <EmployeeManagement
            employees={employees}
            onBack={() => setCurrentView('dashboard')}
            addEmployee={addEmployee}
            updateEmployee={updateEmployee}
            deleteEmployee={deleteEmployee}
            onAddAdvance={handleAddAdvance}
            onUpdateAdvanceStatus={handleUpdateAdvanceStatus}
          />
        );

      case 'reports':
        return (
          <Reports
            transactions={transactions}
            cashState={{ entries: cashEntries, currentBalance: availableCash }}
            employees={employees}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleNavigateToTransaction}
          />
        );

      case 'cash-management':
        return (
          <CashManagement
            cashEntries={cashEntries}
            onBack={() => setCurrentView('dashboard')}
            onAddEntry={addCashEntry}
            currentEmployee={user?.name || 'System'}
          />
        );

      case 'all-transactions':
        return (
          <AllTransactions
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleNavigateToTransaction}
            userRole={user?.role || 'employee'}
            onRefresh={refreshData}
          />
        );

      case 'transactions-list':
        return (
          <TransactionsList
            transactions={transactions}
            onBack={() => setCurrentView('dashboard')}
            onTransactionClick={handleNavigateToTransaction}
          />
        );

      case 'payment-processing':
        return (
          <PaymentProcessing
            transactions={transactions.filter(t => t.status === 'for-payment')}
            onBack={() => setCurrentView('dashboard')}
            onUpdateStatus={(transactionId, newStatus) => updateTransactionStatus(transactionId, newStatus)}
            onTransactionClick={handleNavigateToTransaction}
          />
        );

      case 'transaction-details':
        return selectedTransactionDetails ? (
          <TransactionDetails
            transaction={selectedTransactionDetails}
            onBack={() => {
              setCurrentView('dashboard');
              setSelectedTransactionDetails(null);
              setSelectedTransactionId(null);
            }}
            onUpdate={(updatedTransaction) => {
              setSelectedTransactionDetails(updatedTransaction);
              updateTransaction(updatedTransaction);
            }}
            onUpdateStatus={(updatedTransaction) => {
              setSelectedTransactionDetails(updatedTransaction);
              updateTransaction(updatedTransaction);
            }}
          />
        ) : null;

      default:
        return (
          <Dashboard 
            transactions={transactions}
            cashEntries={cashEntries}
            currentBalance={availableCash}
            onNavigate={(view: string) => setCurrentView(view)}
            onTransactionClick={handleNavigateToTransaction}
            userRole={user?.role || 'employee'}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      
      <main className="container mx-auto px-4 py-6">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
