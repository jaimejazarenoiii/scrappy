import { useState, useEffect, useCallback } from 'react';
import { supabaseDataService, Employee, CashEntry } from '../../infrastructure/database/supabaseService';

// Custom hook for Reports page data - uses specialized queries for better performance
export function useReportsData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load basic data for reports (employees and cash entries)
  const loadReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading Reports basic data from Supabase...');
      
      // Initialize Supabase service
      await supabaseDataService.initialize();
      
      // Load only basic data - metrics will be loaded separately with date filters
      const [employeesData, cashEntriesData] = await Promise.all([
        supabaseDataService.getAllEmployees(),
        supabaseDataService.getAllCashEntries()
      ]);
      
      console.log('Loaded Reports basic data from Supabase:', {
        employees: employeesData.length,
        cashEntries: cashEntriesData.length
      });
      
      setEmployees(employeesData);
      setCashEntries(cashEntriesData);
      
    } catch (error) {
      console.error('Error loading Reports data:', error);
      setError('Failed to load reports data from database. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Refresh function
  const refreshReportsData = useCallback(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Load reports metrics with date filtering
  const loadReportsMetrics = useCallback(async (options?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      console.log('Loading Reports metrics with options:', options);
      return await supabaseDataService.getReportsMetrics(options);
    } catch (error) {
      console.error('Error loading reports metrics:', error);
      return {
        totalTransactions: 0,
        totalBought: 0,
        totalSold: 0,
        totalExpenses: 0,
        netProfit: 0,
        buyCount: 0,
        sellCount: 0,
        topItems: [],
        employeePerformance: [],
        chartData: []
      };
    }
  }, []);

  return {
    employees,
    cashEntries,
    loading,
    error,
    refreshReportsData,
    loadReportsMetrics
  };
}
