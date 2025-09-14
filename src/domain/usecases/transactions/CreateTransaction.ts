import { Transaction, TransactionItem } from '../../entities';
import { TransactionRepository, CreateTransactionRequest } from '../../repositories';

export interface CreateTransactionUseCase {
  execute(request: CreateTransactionRequest): Promise<Transaction>;
}

export class CreateTransactionUseCaseImpl implements CreateTransactionUseCase {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(request: CreateTransactionRequest): Promise<Transaction> {
    // Business logic validation
    this.validateCreateRequest(request);
    
    // Calculate totals
    const subtotal = this.calculateSubtotal(request.items);
    const expenses = request.expenses || 0;
    const total = subtotal + expenses;

    // Create the transaction
    const transaction = await this.transactionRepository.createTransaction({
      ...request,
      subtotal,
      total,
      timestamp: new Date().toISOString(),
      status: 'for-payment'
    });

    return transaction;
  }

  private validateCreateRequest(request: CreateTransactionRequest): void {
    if (!request.type || !['buy', 'sell'].includes(request.type)) {
      throw new Error('Invalid transaction type');
    }

    if (!request.customerType || !['person', 'company', 'government'].includes(request.customerType)) {
      throw new Error('Invalid customer type');
    }

    if (!request.items || request.items.length === 0) {
      throw new Error('Transaction must have at least one item');
    }

    // Validate each item
    request.items.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        throw new Error(`Item ${index + 1} must have a name`);
      }

      const quantity = item.weight || item.pieces;
      if (!quantity || quantity <= 0) {
        throw new Error(`Item ${index + 1} must have a valid quantity`);
      }

      if (!item.price || item.price <= 0) {
        throw new Error(`Item ${index + 1} must have a valid price`);
      }
    });
  }

  private calculateSubtotal(items: TransactionItem[]): number {
    return items.reduce((total, item) => {
      const quantity = item.weight || item.pieces || 0;
      const itemTotal = quantity * item.price;
      return total + itemTotal;
    }, 0);
  }
}
