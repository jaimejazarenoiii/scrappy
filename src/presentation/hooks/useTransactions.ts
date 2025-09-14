import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../../domain';
import { TransactionService } from '../../application';
import { TransactionCreateDTO, TransactionUpdateDTO } from '../../application/dtos';

export interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  createTransaction: (data: TransactionCreateDTO) => Promise<Transaction>;
  updateTransaction: (data: TransactionUpdateDTO) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Promise<Transaction | null>;
  markAsPaid: (id: string) => Promise<Transaction>;
  autoSaveDraft: (transaction: Transaction) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useTransactions = (transactionService: TransactionService): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getTransactions(filters);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [transactionService]);

  const createTransaction = useCallback(async (data: TransactionCreateDTO): Promise<Transaction> => {
    try {
      setError(null);
      const newTransaction = await transactionService.createTransaction(data);
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const updateTransaction = useCallback(async (data: TransactionUpdateDTO): Promise<Transaction> => {
    try {
      setError(null);
      const updatedTransaction = await transactionService.updateTransaction(data);
      setTransactions(prev => 
        prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
      );
      return updatedTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await transactionService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const getTransaction = useCallback(async (id: string): Promise<Transaction | null> => {
    try {
      setError(null);
      return await transactionService.getTransaction(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const markAsPaid = useCallback(async (id: string): Promise<Transaction> => {
    try {
      setError(null);
      const updatedTransaction = await transactionService.markTransactionAsPaid(id);
      setTransactions(prev => 
        prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
      );
      return updatedTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark transaction as paid';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const autoSaveDraft = useCallback(async (transaction: Transaction): Promise<void> => {
    try {
      setError(null);
      await transactionService.autoSaveTransactionDraft(transaction);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to autosave draft';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [transactionService]);

  const refresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransaction,
    markAsPaid,
    autoSaveDraft,
    refresh
  };
};
