import { 
  Transaction, 
  TransactionRepository, 
  CreateTransactionRequest, 
  UpdateTransactionRequest,
  CreateTransactionUseCase,
  UpdateTransactionUseCase,
  GetTransactionsUseCase,
  CreateTransactionUseCaseImpl,
  UpdateTransactionUseCaseImpl,
  GetTransactionsUseCaseImpl
} from '../../domain';

export interface TransactionService {
  // Transaction operations
  createTransaction(request: CreateTransactionRequest): Promise<Transaction>;
  updateTransaction(request: UpdateTransactionRequest): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | null>;
  getTransactions(filters?: any): Promise<Transaction[]>;
  deleteTransaction(id: string): Promise<void>;
  markTransactionAsPaid(id: string): Promise<Transaction>;
  
  // Autosave operations
  autoSaveTransactionDraft(transaction: Transaction): Promise<void>;
}

export class TransactionServiceImpl implements TransactionService {
  private createTransactionUseCase: CreateTransactionUseCase;
  private updateTransactionUseCase: UpdateTransactionUseCase;
  private getTransactionsUseCase: GetTransactionsUseCase;

  constructor(private transactionRepository: TransactionRepository) {
    this.createTransactionUseCase = new CreateTransactionUseCaseImpl(transactionRepository);
    this.updateTransactionUseCase = new UpdateTransactionUseCaseImpl(transactionRepository);
    this.getTransactionsUseCase = new GetTransactionsUseCaseImpl(transactionRepository);
  }

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    return this.createTransactionUseCase.execute(request);
  }

  async updateTransaction(request: UpdateTransactionRequest): Promise<Transaction> {
    return this.updateTransactionUseCase.execute(request);
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepository.getTransaction(id);
  }

  async getTransactions(filters?: any): Promise<Transaction[]> {
    return this.getTransactionsUseCase.execute(filters);
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.transactionRepository.deleteTransaction(id);
  }

  async markTransactionAsPaid(id: string): Promise<Transaction> {
    return this.transactionRepository.markTransactionAsPaid(id);
  }

  async autoSaveTransactionDraft(transaction: Transaction): Promise<void> {
    return this.transactionRepository.autoSaveTransactionDraft(transaction);
  }
}
