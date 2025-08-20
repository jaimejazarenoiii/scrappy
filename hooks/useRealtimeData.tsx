import { useState, useEffect, useCallback } from 'react';
import { supabaseDataService, Transaction, Employee, CashEntry } from '../services/supabaseService';

// Custom hook for real-time data synchronization
export function useRealtimeData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data from Supabase...');
      
      // Initialize Supabase service
      await supabaseDataService.initialize();
      
      // Load all data in parallel
      const [transactionsData, employeesData, cashEntriesData] = await Promise.all([
        supabaseDataService.getAllTransactions(),
        supabaseDataService.getAllEmployees(),
        supabaseDataService.getAllCashEntries()
      ]);
      
      console.log('Loaded from Supabase:', {
        transactions: transactionsData.length,
        employees: employeesData.length,
        cashEntries: cashEntriesData.length
      });
      
      setTransactions(transactionsData);
      setEmployees(employeesData);
      setCashEntries(cashEntriesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data from database. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time event handlers
  useEffect(() => {
    const handleTransactionsChange = (event: CustomEvent) => {
      console.log('Real-time transactions update:', event.detail);
      // Reload transactions when changes occur
      supabaseDataService.getAllTransactions().then(setTransactions);
    };

    const handleEmployeesChange = (event: CustomEvent) => {
      console.log('Real-time employees update:', event.detail);
      // Reload employees when changes occur
      supabaseDataService.getAllEmployees().then(setEmployees);
    };

    const handleCashEntriesChange = (event: CustomEvent) => {
      console.log('Real-time cash entries update:', event.detail);
      // Reload cash entries when changes occur
      supabaseDataService.getAllCashEntries().then(setCashEntries);
    };

    // Add event listeners for real-time updates
    window.addEventListener('transactions_changed', handleTransactionsChange as EventListener);
    window.addEventListener('employees_changed', handleEmployeesChange as EventListener);
    window.addEventListener('cash_entries_changed', handleCashEntriesChange as EventListener);

    // Load initial data
    loadData();

    // Cleanup
    return () => {
      window.removeEventListener('transactions_changed', handleTransactionsChange as EventListener);
      window.removeEventListener('employees_changed', handleEmployeesChange as EventListener);
      window.removeEventListener('cash_entries_changed', handleCashEntriesChange as EventListener);
      supabaseDataService.cleanup();
    };
  }, [loadData]);

  // Data manipulation functions with real-time sync
  const addTransaction = async (transaction: Transaction) => {
    try {
      await supabaseDataService.saveTransaction(transaction);
      // Manually refresh transactions to ensure UI updates
      const updatedTransactions = await supabaseDataService.getAllTransactions();
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    try {
      await supabaseDataService.saveTransaction(transaction);
      // Manually refresh transactions to ensure UI updates
      const updatedTransactions = await supabaseDataService.getAllTransactions();
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const addEmployee = async (employee: Employee) => {
    try {
      await supabaseDataService.saveEmployee(employee);
      // Manually refresh employees to ensure UI updates
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (employee: Employee) => {
    try {
      await supabaseDataService.saveEmployee(employee);
      // Manually refresh employees to ensure UI updates
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      await supabaseDataService.deleteEmployee(employeeId);
      // Manually refresh employees to ensure UI updates
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  const addCashEntry = async (cashEntry: CashEntry) => {
    try {
      await supabaseDataService.saveCashEntry(cashEntry);
      // Manually refresh cash entries to ensure UI updates
      const updatedCashEntries = await supabaseDataService.getAllCashEntries();
      setCashEntries(updatedCashEntries);
    } catch (error) {
      console.error('Error adding cash entry:', error);
      throw error;
    }
  };

  const generateTransactionId = async () => {
    return await supabaseDataService.generateTransactionId();
  };

  const addCashAdvance = async (employeeId: string, advance: any) => {
    try {
      await supabaseDataService.saveCashAdvance(advance);
      // Manually refresh employees to ensure cash advances are updated
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error adding cash advance:', error);
      throw error;
    }
  };

  const updateEmployeeStats = async (employeeName?: string) => {
    try {
      if (employeeName) {
        // Update specific employee
        await supabaseDataService.updateEmployeeSessionsHandled(employeeName);
      } else {
        // Update all employees
        await supabaseDataService.updateAllEmployeeStats();
      }
      // Refresh employees data
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error updating employee stats:', error);
      throw error;
    }
  };

  const updateCashAdvanceStatus = async (advanceId: string, status: 'active' | 'deducted' | 'pending', employeeId?: string) => {
    try {
      await supabaseDataService.updateCashAdvanceStatus(advanceId, status);
      
      // Update employee's current advances if status changed to/from active
      if (employeeId && (status === 'deducted' || status === 'active')) {
        await supabaseDataService.updateEmployeeCurrentAdvances(employeeId);
      }
      
      // Refresh employees data to show updated advances
      const updatedEmployees = await supabaseDataService.getAllEmployees();
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error('Error updating cash advance status:', error);
      throw error;
    }
  };

  return {
    // Data
    transactions,
    employees,
    cashEntries,
    
    // State
    loading,
    error,
    
    // Actions
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
    refreshData: loadData
  };
}

// Real-time connection status hook
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      setLastSync(new Date());
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    const handleRealtimeUpdate = () => {
      setLastSync(new Date());
    };

    // Listen to network status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen to real-time updates
    window.addEventListener('transactions_changed', handleRealtimeUpdate);
    window.addEventListener('employees_changed', handleRealtimeUpdate);
    window.addEventListener('cash_entries_changed', handleRealtimeUpdate);

    // Set initial status
    setIsConnected(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('transactions_changed', handleRealtimeUpdate);
      window.removeEventListener('employees_changed', handleRealtimeUpdate);
      window.removeEventListener('cash_entries_changed', handleRealtimeUpdate);
    };
  }, []);

  return { isConnected, lastSync };
}
