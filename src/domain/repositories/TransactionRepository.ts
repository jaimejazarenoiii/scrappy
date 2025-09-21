import { Transaction, TransactionItem } from '../entities';

export interface CreateTransactionRequest {
  type: 'buy' | 'sell';
  customerType: 'individual' | 'business' | 'government';
  customerName?: string;
  employee?: string;
  location?: string;
  items: TransactionItem[];
  expenses?: number;
  tripExpenses?: any[];
  deliveryExpenses?: any[];
  sessionImages?: string[];
  isPickup?: boolean;
  isDelivery?: boolean;
  sessionType?: string;
}

export interface UpdateTransactionRequest {
  id: string;
  status?: 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
  customerType?: 'individual' | 'business' | 'government';
  customerName?: string;
  employee?: string;
  location?: string;
  items?: TransactionItem[];
  expenses?: number;
  tripExpenses?: any[];
  deliveryExpenses?: any[];
  sessionImages?: string[];
  isPickup?: boolean;
  isDelivery?: boolean;
  sessionType?: string;
}

export interface TransactionRepository {
  // Create operations
  createTransaction(request: CreateTransactionRequest): Promise<Transaction>;
  
  // Read operations
  getTransaction(id: string): Promise<Transaction | null>;
  getTransactions(filters?: {
    type?: 'buy' | 'sell';
    status?: string;
    employee?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Transaction[]>;
  
  // Update operations
  updateTransaction(request: UpdateTransactionRequest): Promise<Transaction>;
  markTransactionAsPaid(id: string): Promise<Transaction>;
  
  // Delete operations
  deleteTransaction(id: string): Promise<void>;
  
  // Autosave operations
  autoSaveTransactionDraft(transaction: Transaction): Promise<void>;
}
