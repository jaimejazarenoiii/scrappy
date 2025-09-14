import React, { createContext, useContext, ReactNode } from 'react';
import { TransactionService, TransactionServiceImpl } from '../../application';
import { SupabaseTransactionRepository } from '../../infrastructure';
import { useTransactions } from '../hooks';

interface TransactionContextType {
  transactions: any[];
  loading: boolean;
  error: string | null;
  createTransaction: (data: any) => Promise<any>;
  updateTransaction: (data: any) => Promise<any>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Promise<any>;
  markAsPaid: (id: string) => Promise<any>;
  autoSaveDraft: (transaction: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  // Create repository and service instances
  const transactionRepository = new SupabaseTransactionRepository();
  const transactionService = new TransactionServiceImpl(transactionRepository);
  
  const transactionData = useTransactions(transactionService);

  return (
    <TransactionContext.Provider value={transactionData}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactionContext = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
};
