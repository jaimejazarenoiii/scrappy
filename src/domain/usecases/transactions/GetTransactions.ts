import { Transaction } from '../../entities';
import { TransactionRepository } from '../../repositories';

export interface GetTransactionsUseCase {
  execute(filters?: {
    type?: 'buy' | 'sell';
    status?: string;
    employee?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Transaction[]>;
}

export class GetTransactionsUseCaseImpl implements GetTransactionsUseCase {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(filters?: {
    type?: 'buy' | 'sell';
    status?: string;
    employee?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Transaction[]> {
    // Business logic validation
    this.validateFilters(filters);

    // Get transactions from repository
    const transactions = await this.transactionRepository.getTransactions(filters);

    // Apply any additional business rules or transformations
    return this.processTransactions(transactions);
  }

  private validateFilters(filters?: any): void {
    if (filters?.type && !['buy', 'sell'].includes(filters.type)) {
      throw new Error('Invalid transaction type filter');
    }

    if (filters?.status && !['in-progress', 'for-payment', 'completed', 'cancelled'].includes(filters.status)) {
      throw new Error('Invalid transaction status filter');
    }

    if (filters?.dateFrom && filters?.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);
      
      if (fromDate > toDate) {
        throw new Error('Date from cannot be greater than date to');
      }
    }
  }

  private processTransactions(transactions: Transaction[]): Transaction[] {
    // Sort by timestamp (newest first) - business rule
    return transactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
