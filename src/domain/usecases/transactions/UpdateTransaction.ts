import { Transaction } from '../../entities';
import { TransactionRepository, UpdateTransactionRequest } from '../../repositories';

export interface UpdateTransactionUseCase {
  execute(request: UpdateTransactionRequest): Promise<Transaction>;
}

export class UpdateTransactionUseCaseImpl implements UpdateTransactionUseCase {
  constructor(private transactionRepository: TransactionRepository) {}

  async execute(request: UpdateTransactionRequest): Promise<Transaction> {
    // Business logic validation
    this.validateUpdateRequest(request);
    
    // Get existing transaction
    const existingTransaction = await this.transactionRepository.getTransaction(request.id);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    // Calculate new totals if items are being updated
    let updatedData = { ...request };
    if (request.items) {
      const subtotal = this.calculateSubtotal(request.items);
      const expenses = request.expenses ?? existingTransaction.expenses;
      updatedData = {
        ...updatedData,
        subtotal,
        total: subtotal + expenses
      };
    } else if (request.expenses !== undefined) {
      const subtotal = existingTransaction.subtotal;
      updatedData = {
        ...updatedData,
        total: subtotal + request.expenses
      };
    }

    // Update the transaction
    const updatedTransaction = await this.transactionRepository.updateTransaction(updatedData);

    return updatedTransaction;
  }

  private validateUpdateRequest(request: UpdateTransactionRequest): void {
    if (!request.id) {
      throw new Error('Transaction ID is required');
    }

    if (request.status && !['in-progress', 'for-payment', 'completed', 'cancelled'].includes(request.status)) {
      throw new Error('Invalid transaction status');
    }

    if (request.customerType && !['person', 'company', 'government'].includes(request.customerType)) {
      throw new Error('Invalid customer type');
    }

    // Validate items if provided
    if (request.items) {
      if (request.items.length === 0) {
        throw new Error('Transaction must have at least one item');
      }

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
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((total, item) => {
      const quantity = item.weight || item.pieces || 0;
      const itemTotal = quantity * item.price;
      return total + itemTotal;
    }, 0);
  }
}
