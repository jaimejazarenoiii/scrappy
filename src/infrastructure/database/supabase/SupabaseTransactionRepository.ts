import { 
  Transaction, 
  TransactionRepository, 
  CreateTransactionRequest, 
  UpdateTransactionRequest 
} from '../../../domain';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../shared/utils/supabase/info';

// Initialize Supabase client using existing configuration
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

export class SupabaseTransactionRepository implements TransactionRepository {
  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: request.type,
          customer_type: request.customerType,
          customer_name: request.customerName,
          employee: request.employee,
          location: request.location,
          items: request.items,
          expenses: request.expenses || 0,
          trip_expenses: request.tripExpenses || [],
          delivery_expenses: request.deliveryExpenses || [],
          session_images: request.sessionImages || [],
          is_pickup: request.isPickup || false,
          is_delivery: request.isDelivery || false,
          session_type: request.sessionType,
          status: 'for-payment',
          subtotal: this.calculateSubtotal(request.items),
          total: this.calculateSubtotal(request.items) + (request.expenses || 0),
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      return this.mapSupabaseToTransaction(data);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Transaction not found
        }
        throw new Error(`Failed to get transaction: ${error.message}`);
      }

      return this.mapSupabaseToTransaction(data);
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async getTransactions(filters?: any): Promise<Transaction[]> {
    try {
      let query = supabase.from('transactions').select('*');

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.employee) {
        query = query.eq('employee', filters.employee);
      }

      if (filters?.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('timestamp', filters.dateTo);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to get transactions: ${error.message}`);
      }

      return data.map((item: any) => this.mapSupabaseToTransaction(item));
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  async updateTransaction(request: UpdateTransactionRequest): Promise<Transaction> {
    try {
      const updateData: any = {};

      if (request.status !== undefined) updateData.status = request.status;
      if (request.customerType !== undefined) updateData.customer_type = request.customerType;
      if (request.customerName !== undefined) updateData.customer_name = request.customerName;
      if (request.employee !== undefined) updateData.employee = request.employee;
      if (request.location !== undefined) updateData.location = request.location;
      if (request.items !== undefined) updateData.items = request.items;
      if (request.expenses !== undefined) updateData.expenses = request.expenses;
      if (request.tripExpenses !== undefined) updateData.trip_expenses = request.tripExpenses;
      if (request.deliveryExpenses !== undefined) updateData.delivery_expenses = request.deliveryExpenses;
      if (request.sessionImages !== undefined) updateData.session_images = request.sessionImages;
      if (request.isPickup !== undefined) updateData.is_pickup = request.isPickup;
      if (request.isDelivery !== undefined) updateData.is_delivery = request.isDelivery;
      if (request.sessionType !== undefined) updateData.session_type = request.sessionType;

      // Recalculate totals if items or expenses changed
      if (request.items !== undefined || request.expenses !== undefined) {
        const existingTransaction = await this.getTransaction(request.id);
        if (existingTransaction) {
          const items = request.items || existingTransaction.items;
          const expenses = request.expenses !== undefined ? request.expenses : existingTransaction.expenses;
          updateData.subtotal = this.calculateSubtotal(items);
          updateData.total = updateData.subtotal + expenses;
        }
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      return this.mapSupabaseToTransaction(data);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete transaction: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async markTransactionAsPaid(id: string): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to mark transaction as paid: ${error.message}`);
      }

      return this.mapSupabaseToTransaction(data);
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      throw error;
    }
  }

  async autoSaveTransactionDraft(transaction: Transaction): Promise<void> {
    try {
      // Save to a drafts table or use a specific field to mark as draft
      const { error } = await supabase
        .from('transaction_drafts')
        .upsert([{
          id: transaction.id,
          transaction_data: transaction,
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        throw new Error(`Failed to autosave transaction draft: ${error.message}`);
      }
    } catch (error) {
      console.error('Error autosaving transaction draft:', error);
      throw error;
    }
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((total, item) => {
      const quantity = item.weight || item.pieces || 0;
      const itemTotal = quantity * item.price;
      return total + itemTotal;
    }, 0);
  }

  private mapSupabaseToTransaction(data: any): Transaction {
    return {
      id: data.id,
      type: data.type,
      status: data.status,
      customerType: data.customer_type,
      customerName: data.customer_name,
      employee: data.employee,
      location: data.location,
      timestamp: data.timestamp,
      subtotal: data.subtotal,
      expenses: data.expenses,
      total: data.total,
      items: data.items || [],
      tripExpenses: data.trip_expenses || [],
      deliveryExpenses: data.delivery_expenses || [],
      sessionImages: data.session_images || [],
      isPickup: data.is_pickup,
      isDelivery: data.is_delivery,
      sessionType: data.session_type
    };
  }
}
