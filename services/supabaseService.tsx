import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Initialize Supabase client
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

// Re-export interfaces with Supabase-compatible types
export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  // Frontend fields (camelCase) - these are what components should use
  customerName?: string;
  customerType: 'person' | 'company' | 'government' | 'individual' | 'business';
  completedAt?: string;
  isDelivery?: boolean;
  isPickup?: boolean;
  sessionImages?: string[];
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for buy/sell transactions
  sessionType?: 'in-shop' | 'pickup' | 'delivery';
  customerInfo?: string;
  deliveryAddress?: string;
  tripExpenses?: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
  }>;
  deliveryExpenses?: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
  }>;
  // Common fields
  items: TransactionItem[];
  subtotal: number;
  total: number;
  expenses?: number;
  timestamp: string;
  employee: string;
  status: 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
  location?: string;
}

export interface TransactionItem {
  id?: string;
  transaction_id?: string;
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[];
}

export interface CashAdvance {
  id: string;
  // Frontend fields (camelCase) - these are what components should use
  employeeId?: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'deducted' | 'active';
}

export interface CashEntry {
  id?: string;
  type: 'opening' | 'transaction' | 'expense' | 'adjustment';
  amount: number;
  description: string;
  timestamp: string;
  employee: string;
  transaction_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id?: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar: string;
  // Frontend fields (camelCase) - these are what components should use
  weeklySalary?: number;
  currentAdvances?: number;
  sessionsHandled?: number;
  advances?: CashAdvance[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Profile {
  id: string;
  name: string;
  role: 'owner' | 'employee';
  phone?: string;
  email?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper functions to convert between camelCase and snake_case
function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const snakeObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = value;
  }
  return snakeObj;
}

function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const camelObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = value;
  }
  return camelObj;
}

function convertTransactionToDb(transaction: Partial<Transaction>): any {
  const {
    customerName,
    customerType,
    completedAt,
    isDelivery,
    isPickup,
    sessionType,
    sessionImages,
    createdBy,
    createdByName,
    createdByRole,
    createdAt,
    updatedAt,
    items,
    // Additional fields to exclude from ...rest
    customerInfo,
    deliveryAddress,
    tripExpenses,
    deliveryExpenses,
    // Extract common fields explicitly (these should be kept)
    id,
    type,
    subtotal,
    total,
    expenses,
    timestamp,
    employee,
    status,
    location,
    ...rest // Any remaining fields
  } = transaction as any;

  // Map frontend customer types to database values
  let dbCustomerType = customerType;
  if (customerType === 'person') {
    dbCustomerType = 'individual';
  } else if (customerType === 'company' || customerType === 'government') {
    dbCustomerType = 'business';
  }

  // Map sessionType to boolean fields
  let dbIsDelivery = isDelivery;
  let dbIsPickup = isPickup;
  if (sessionType) {
    dbIsDelivery = sessionType === 'delivery';
    dbIsPickup = sessionType === 'pickup';
  }

  return {
    // Core fields
    id,
    type,
    subtotal,
    total,
    expenses,
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
    employee,
    status,
    location,
    // Converted fields
    customer_name: customerName,
    customer_type: dbCustomerType,
    completed_at: completedAt,
    is_delivery: dbIsDelivery,
    is_pickup: dbIsPickup,
    session_images: sessionImages,
    created_by: createdBy,
    created_by_name: createdByName,
    created_by_role: createdByRole,
    // Add any remaining fields (excluding the destructured snake_case ones)
    ...rest
  };
}

function convertTransactionFromDb(dbTransaction: any): Transaction {
  const {
    customer_name,
    customer_type,
    completed_at,
    is_delivery,
    is_pickup,
    session_images,
    created_by,
    created_by_name,
    created_by_role,
    created_at,
    updated_at,
    transaction_items,
    ...rest
  } = dbTransaction;

  // Map database customer types back to frontend values
  let frontendCustomerType = customer_type;
  if (customer_type === 'individual') {
    frontendCustomerType = 'person';
  } else if (customer_type === 'business') {
    frontendCustomerType = 'company';
  }

  // Map boolean fields back to sessionType
  let sessionType: 'in-shop' | 'pickup' | 'delivery' | undefined;
  if (is_delivery) {
    sessionType = 'delivery';
  } else if (is_pickup) {
    sessionType = 'pickup';
  } else {
    sessionType = 'in-shop'; // Default for buy transactions
  }

  return {
    ...rest,
    customerName: customer_name,
    customerType: frontendCustomerType,
    completedAt: completed_at,
    isDelivery: is_delivery,
    isPickup: is_pickup,
    sessionType: sessionType,
    sessionImages: session_images,
    createdBy: created_by,
    createdByName: created_by_name,
    createdByRole: created_by_role,
    createdAt: created_at,
    updatedAt: updated_at,
    items: transaction_items || []
  };
}

function convertEmployeeToDb(employee: Employee): any {
  const {
    weeklySalary,
    currentAdvances,
    sessionsHandled,
    createdBy,
    createdAt,
    updatedAt,
    advances,
    // Extract core fields explicitly
    id,
    name,
    role,
    phone,
    email,
    avatar,
    ...rest
  } = employee as any;

  return {
    // Core fields
    id,
    name,
    role,
    phone,
    email,
    avatar,
    // Converted fields
    weekly_salary: weeklySalary,
    current_advances: currentAdvances,
    sessions_handled: sessionsHandled,
    created_by: createdBy,
    // Any remaining fields (excluding the destructured snake_case ones)
    ...rest
  };
}

function convertEmployeeFromDb(dbEmployee: any): Employee {
  const {
    weekly_salary,
    current_advances,
    sessions_handled,
    created_by,
    created_at,
    updated_at,
    cash_advances,
    ...rest
  } = dbEmployee;

  return {
    ...rest,
    weeklySalary: weekly_salary,
    currentAdvances: current_advances,
    sessionsHandled: sessions_handled,
    createdBy: created_by,
    createdAt: created_at,
    updatedAt: updated_at,
    advances: cash_advances ? cash_advances.map(convertCashAdvanceFromDb) : []
  };
}

function convertCashAdvanceToDb(advance: CashAdvance): any {
  const {
    employeeId,
    // Extract core fields explicitly
    id,
    amount,
    description,
    date,
    status,
    ...rest
  } = advance as any;

  return {
    // Core fields
    id,
    amount,
    description,
    date,
    status,
    // Converted fields
    employee_id: employeeId,
    // Any remaining fields (excluding the destructured snake_case ones)
    ...rest
  };
}

function convertCashAdvanceFromDb(dbAdvance: any): CashAdvance {
  const {
    employee_id,
    ...rest
  } = dbAdvance;

  return {
    ...rest,
    employeeId: employee_id
  };
}

class SupabaseDataService {
  private initialized = false;
  private realtimeSubscriptions: any[] = [];

  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Supabase data service...');
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    // Set up real-time subscriptions
    this.setupRealtimeSubscriptions();
    
    this.initialized = true;
    console.log('Supabase data service initialized successfully');
  }

  // Setup real-time subscriptions for live data sync
  setupRealtimeSubscriptions() {
    console.log('Setting up real-time subscriptions...');

    // Subscribe to transactions changes
    const transactionsSubscription = supabase
      .channel('transactions_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Transactions change:', payload);
          // Emit custom event for components to listen to
          window.dispatchEvent(new CustomEvent('transactions_changed', { detail: payload }));
        }
      )
      .subscribe();

    // Subscribe to employees changes
    const employeesSubscription = supabase
      .channel('employees_channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('Employees change:', payload);
          window.dispatchEvent(new CustomEvent('employees_changed', { detail: payload }));
        }
      )
      .subscribe();

    // Subscribe to cash entries changes
    const cashEntriesSubscription = supabase
      .channel('cash_entries_channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cash_entries' },
        (payload) => {
          console.log('Cash entries change:', payload);
          window.dispatchEvent(new CustomEvent('cash_entries_changed', { detail: payload }));
        }
      )
      .subscribe();

    this.realtimeSubscriptions = [
      transactionsSubscription,
      employeesSubscription,
      cashEntriesSubscription
    ];
  }

  // Clean up subscriptions
  cleanup() {
    this.realtimeSubscriptions.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    this.realtimeSubscriptions = [];
  }

  // Transaction methods
  async getAllTransactions(options?: { 
    limit?: number; 
    offset?: number; 
    status?: string[];
    includeItems?: boolean;
  }): Promise<Transaction[]> {
    try {
      console.time('getAllTransactions');
      
      const { 
        limit = 50, // Default limit to improve performance
        offset = 0,
        status,
        includeItems = false // Only fetch items when needed
      } = options || {};

      let query = supabase
        .from('transactions')
        .select(includeItems ? `*, transaction_items (*)` : '*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Add status filter if provided
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.timeEnd('getAllTransactions');
      console.log(`Fetched ${data?.length || 0} transactions`);

      // Transform data to match frontend interface
      return (data || []).map(transaction => convertTransactionFromDb(transaction));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Fast method for dashboard/list views - without items
  async getTransactionsSummary(options?: {
    limit?: number;
    status?: string[];
    type?: 'buy' | 'sell';
  }): Promise<Transaction[]> {
    try {
      console.time('getTransactionsSummary');
      
      const { 
        limit = 100,
        status,
        type
      } = options || {};

      let query = supabase
        .from('transactions')
        .select('id, type, customer_name, employee, status, total, timestamp, created_at')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.timeEnd('getTransactionsSummary');
      console.log(`Fetched ${data?.length || 0} transaction summaries`);

      return (data || []).map(transaction => convertTransactionFromDb(transaction));
    } catch (error) {
      console.error('Error fetching transaction summaries:', error);
      return [];
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      console.log('🔍 getTransaction called with ID:', id);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Database error in getTransaction:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ No transaction found with ID:', id);
        return null;
      }

      console.log('✅ Transaction found:', {
        id: data.id,
        type: data.type,
        status: data.status,
        itemsCount: data.transaction_items?.length || 0
      });

      return convertTransactionFromDb(data);
    } catch (error) {
      console.error('❌ Error fetching transaction:', error);
      return null;
    }
  }

  // Optimized method for simple status updates
  async updateTransactionStatus(transactionId: string, status: 'in-progress' | 'for-payment' | 'completed' | 'cancelled', completedAt?: string): Promise<void> {
    try {
      console.time('updateTransactionStatus');
      
      const updateData: any = { status };
      if (completedAt) {
        updateData.completed_at = completedAt;
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId);
      
      if (error) throw error;
      
      console.log('✅ Transaction status updated successfully');
      console.timeEnd('updateTransactionStatus');
    } catch (error) {
      console.error('❌ Error updating transaction status:', error);
      throw error;
    }
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    try {
      const { items, ...transactionData } = transaction;
      
      console.log('saveTransaction called with:', {
        transactionId: transaction.id,
        transactionType: transaction.type,
        itemsCount: items?.length || 0,
        items: items
      });
      
      // Convert frontend camelCase to database snake_case (without items)
      const dbTransaction = convertTransactionToDb(transactionData);
      
      console.log('Transaction data before save:', dbTransaction);
      
      // Validate required fields
      const requiredFields = ['id', 'type', 'subtotal', 'total', 'timestamp', 'employee', 'status'];
      for (const field of requiredFields) {
        if (!dbTransaction[field] && dbTransaction[field] !== 0) {
          throw new Error(`Required field '${field}' is missing or undefined`);
        }
      }
      
      // Validate customer_type for database constraint
      if (!dbTransaction.customer_type || !['individual', 'business'].includes(dbTransaction.customer_type)) {
        throw new Error(`Invalid customer_type: ${dbTransaction.customer_type}. Must be 'individual' or 'business'`);
      }
      
      // For new transactions (first save), always INSERT
      // For subsequent saves (updates), UPDATE
      let transactionError;
      
      // Check if this transaction already exists in the database
      const { data: existingTransaction, error: checkError } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', dbTransaction.id)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      console.log('Checking existing transaction:', { existingTransaction, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is OK for new transactions
        throw checkError;
      }

      if (existingTransaction) {
        // Transaction exists - UPDATE it
        const updateData = Object.fromEntries(
          Object.entries(dbTransaction).filter(([_, value]) => value !== undefined)
        );
        console.log('Updating existing transaction with data:', updateData);
        
        const result = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', dbTransaction.id);
        transactionError = result.error;
        console.log('Update result:', result.error);
      } else {
        // Transaction doesn't exist - INSERT it
        console.log('Inserting new transaction with data:', dbTransaction);
        
        const result = await supabase
          .from('transactions')
          .insert([dbTransaction]); // Wrap in array for insert
        transactionError = result.error;
        console.log('Insert result:', result.error);
      }

      if (transactionError) throw transactionError;

      // Update employee statistics after saving transaction
      if (dbTransaction.employee) {
        await this.updateEmployeeSessionsHandled(dbTransaction.employee);
      }

      // Save transaction items
      console.log('Processing transaction items:', { 
        itemsExists: !!items, 
        itemsLength: items?.length || 0, 
        items: items,
        transactionItems: transaction.items // Check if items exist on original transaction
      });
      
      if (items && items.length > 0) {
        console.log('Deleting existing items for transaction:', transaction.id);
        
        // Delete existing items first
        const { error: deleteError } = await supabase
          .from('transaction_items')
          .delete()
          .eq('transaction_id', transaction.id);
          
        if (deleteError) {
          console.error('Error deleting existing items:', deleteError);
          throw deleteError;
        }

        // Insert new items
        const itemsWithTransactionId = items.map(item => ({
          ...item,
          transaction_id: transaction.id
        }));
        
        console.log('Inserting transaction items:', itemsWithTransactionId);

        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(itemsWithTransactionId);

        if (itemsError) {
          console.error('Error inserting transaction items:', itemsError);
          throw itemsError;
        }
        
        console.log('Successfully saved', items.length, 'transaction items');
      } else {
        console.log('No items to save for transaction:', transaction.id);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async generateTransactionId(): Promise<string> {
    try {
      // Get the highest existing ID number
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .like('id', 'TXN-%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastId = data[0].id;
        const match = lastId.match(/TXN-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `TXN-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating transaction ID:', error);
      return `TXN-${Date.now()}`;
    }
  }

  // Employee methods
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          cash_advances (*)
        `)
        .order('name');

      if (error) throw error;

      return (data || []).map(employee => convertEmployeeFromDb(employee));
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          cash_advances (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? convertEmployeeFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      return null;
    }
  }

  async saveEmployee(employee: Employee): Promise<void> {
    try {
      const { advances, ...employeeData } = employee;
      
      // Convert frontend camelCase to database snake_case
      const dbEmployee = convertEmployeeToDb(employeeData);
      
      const { error } = await supabase
        .from('employees')
        .upsert(dbEmployee);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving employee:', error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Cash entry methods
  async getAllCashEntries(): Promise<CashEntry[]> {
    try {
      const { data, error } = await supabase
        .from('cash_entries')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cash entries:', error);
      return [];
    }
  }

  async getCashEntry(id: string): Promise<CashEntry | null> {
    try {
      const { data, error } = await supabase
        .from('cash_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching cash entry:', error);
      return null;
    }
  }

  async saveCashEntry(cashEntry: CashEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('cash_entries')
        .upsert(cashEntry);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cash entry:', error);
      throw error;
    }
  }

  async deleteCashEntry(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cash_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting cash entry:', error);
      throw error;
    }
  }

  async generateCashEntryId(): Promise<string> {
    // Supabase will auto-generate UUIDs, but we can return a placeholder
    return crypto.randomUUID();
  }

  // Cash advance methods
  async saveCashAdvance(advance: CashAdvance): Promise<void> {
    try {
      // Convert frontend camelCase to database snake_case
      const dbAdvance = convertCashAdvanceToDb(advance);
      
      const { error } = await supabase
        .from('cash_advances')
        .upsert(dbAdvance);

      if (error) throw error;

      // Update employee statistics after saving cash advance
      if (advance.employeeId) {
        await this.updateEmployeeCurrentAdvances(advance.employeeId);
      }
    } catch (error) {
      console.error('Error saving cash advance:', error);
      throw error;
    }
  }

  async getCashAdvancesByEmployee(employeeId: string): Promise<CashAdvance[]> {
    try {
      const { data, error } = await supabase
        .from('cash_advances')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data ? data.map(convertCashAdvanceFromDb) : [];
    } catch (error) {
      console.error('Error fetching cash advances:', error);
      return [];
    }
  }

  async updateCashAdvanceStatus(advanceId: string, status: 'active' | 'deducted' | 'pending'): Promise<void> {
    try {
      const { error } = await supabase
        .from('cash_advances')
        .update({ status })
        .eq('id', advanceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cash advance status:', error);
      throw error;
    }
  }

  // Employee statistics update functions
  async updateEmployeeSessionsHandled(employeeName: string): Promise<void> {
    try {
      // Count distinct transactions for this employee
      const { data: transactionCount, error: countError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('employee', employeeName);

      if (countError) throw countError;

      // Update the employee's sessions_handled
      const { error: updateError } = await supabase
        .from('employees')
        .update({ sessions_handled: transactionCount?.length || 0 })
        .eq('name', employeeName);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating employee sessions:', error);
    }
  }

  async updateEmployeeCurrentAdvances(employeeId: string): Promise<void> {
    try {
      // Sum active cash advances for this employee
      const { data: advances, error: advancesError } = await supabase
        .from('cash_advances')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('status', 'active');

      if (advancesError) throw advancesError;

      const totalAdvances = advances?.reduce((sum, advance) => sum + advance.amount, 0) || 0;

      // Update the employee's current_advances
      const { error: updateError } = await supabase
        .from('employees')
        .update({ current_advances: totalAdvances })
        .eq('id', employeeId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating employee advances:', error);
    }
  }

  async updateAllEmployeeStats(): Promise<void> {
    try {
      // Get all employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name');

      if (employeesError) throw employeesError;

      // Update stats for each employee
      for (const employee of employees || []) {
        await this.updateEmployeeSessionsHandled(employee.name);
        await this.updateEmployeeCurrentAdvances(employee.id);
      }
    } catch (error) {
      console.error('Error updating all employee stats:', error);
    }
  }
}

// Create singleton instance
export const supabaseDataService = new SupabaseDataService();

// Export the supabase client for direct use if needed
export { supabase };
