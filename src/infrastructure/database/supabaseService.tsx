import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../shared/utils/supabase/info';
import { ImageUploadService } from '../../infrastructure/services/ImageUploadService';

// Initialize Supabase client
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

// Save deduplication cache to prevent rapid duplicate saves
const saveCache = new Map<string, Promise<void>>();
const SAVE_CACHE_TTL = 5000; // 5 seconds

// Re-export interfaces with Supabase-compatible types
export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  businessId: string; // Multi-tenant support
  // Frontend fields (camelCase) - these are what components should use
  customerName?: string;
  customerType: 'individual' | 'business' | 'government';
  completedAt?: string;
  isDelivery?: boolean;
  isPickup?: boolean;
  sessionImages?: string[]; // Image URLs from Supabase Storage
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
  businessId: string; // Multi-tenant support
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[]; // Image URLs from Supabase Storage
}

export interface CashAdvance {
  id: string;
  businessId: string; // Multi-tenant support
  // Frontend fields (camelCase) - these are what components should use
  employeeId?: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'deducted' | 'active';
}

export interface CashEntry {
  id?: string;
  businessId: string; // Multi-tenant support
  type: 'opening' | 'transaction' | 'expense' | 'adjustment' | 'sell' | 'buy';
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
  id: string;
  businessId: string; // Multi-tenant support
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
  businessId: string; // Multi-tenant support
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
    businessId, // Extract businessId for conversion
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

  // No mapping needed - frontend and database use the same values now
  // individual, business, government
  let dbCustomerType = customerType;

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
    business_id: businessId, // Convert camelCase to snake_case
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
    business_id, // Extract business_id for conversion
    ...rest
  } = dbTransaction;

  console.log('🔄 Converting transaction from DB:', {
    id: dbTransaction.id,
    customer_type: customer_type,
    customer_name: customer_name,
    sessionImages: session_images,
    sessionImagesType: typeof session_images,
    sessionImagesLength: session_images?.length,
    rawDbTransaction: dbTransaction
  });

  // Map database customer types back to frontend values
  let frontendCustomerType = customer_type;
  if (customer_type === 'individual') {
    frontendCustomerType = 'individual'; // Keep as 'individual' since that's what the UI should show
  } else if (customer_type === 'business') {
    frontendCustomerType = 'business'; // Keep as 'business' since that's what the UI should show
  } else if (customer_type === 'government') {
    frontendCustomerType = 'government'; // Keep as 'government'
  } else if (!customer_type || customer_type === null || customer_type === undefined) {
    // Handle undefined/null customer types by defaulting to 'individual'
    frontendCustomerType = 'individual';
  }
  
  console.log('🔄 Customer type mapping:', {
    originalCustomerType: customer_type,
    originalCustomerTypeType: typeof customer_type,
    originalCustomerTypeIsNull: customer_type === null,
    originalCustomerTypeIsUndefined: customer_type === undefined,
    mappedCustomerType: frontendCustomerType,
    mappedCustomerTypeType: typeof frontendCustomerType
  });

  // Map boolean fields back to sessionType
  let sessionType: 'in-shop' | 'pickup' | 'delivery' | undefined;
  if (is_delivery) {
    sessionType = 'delivery';
  } else if (is_pickup) {
    sessionType = 'pickup';
  } else {
    sessionType = 'in-shop'; // Default for buy transactions
  }

  // Convert transaction items from snake_case to camelCase
  const convertedItems = (transaction_items || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    weight: item.weight,
    pieces: item.pieces,
    price: item.price,
    total: item.total,
    images: item.images,
    businessId: item.business_id // Convert snake_case to camelCase
  }));

  const convertedTransaction = {
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
    businessId: business_id, // Convert snake_case to camelCase
    items: convertedItems
  };

  console.log('✅ Final converted transaction:', {
    id: convertedTransaction.id,
    customerType: convertedTransaction.customerType,
    customerName: convertedTransaction.customerName,
    sessionImages: convertedTransaction.sessionImages,
    sessionImagesType: typeof convertedTransaction.sessionImages,
    sessionImagesLength: convertedTransaction.sessionImages?.length
  });

  return convertedTransaction;
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
    businessId, // Extract businessId for conversion
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
    business_id: businessId, // Convert camelCase to snake_case
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
    business_id, // Extract business_id for conversion
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
    businessId: business_id, // Convert snake_case to camelCase
    advances: cash_advances ? cash_advances.map(convertCashAdvanceFromDb) : []
  };
}

function convertCashAdvanceToDb(advance: CashAdvance): any {
  const {
    employeeId,
    businessId,
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
    business_id: businessId,
    // Any remaining fields (excluding the destructured snake_case ones)
    ...rest
  };
}

function convertCashAdvanceFromDb(dbAdvance: any): CashAdvance {
  const {
    employee_id,
    business_id,
    ...rest
  } = dbAdvance;

  return {
    ...rest,
    employeeId: employee_id,
    businessId: business_id
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

  // Fast method for dashboard/list views - with items for recent transactions
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

      // For recent transactions (first 20), include items to calculate accurate totals
      // For the rest, use fast summary without items
      const includeItemsLimit = Math.min(20, limit);
      
      let query = supabase
        .from('transactions')
        .select('id, type, customer_name, customer_type, employee, status, total, subtotal, expenses, timestamp, created_at, session_images, transaction_items (*)')
        .order('timestamp', { ascending: false })
        .limit(includeItemsLimit);

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.timeEnd('getTransactionsSummary');
      console.log(`Fetched ${data?.length || 0} transaction summaries with items`);

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
        customerName: data.customer_name,
        customerType: data.customer_type,
        customerTypeType: typeof data.customer_type,
        itemsCount: data.transaction_items?.length || 0,
        sessionImages: data.session_images,
        sessionImagesType: typeof data.session_images,
        sessionImagesLength: data.session_images?.length,
        allFields: Object.keys(data),
        rawData: data
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
    // Create a cache key for this transaction save
    const cacheKey = `save_${transaction.id}`;
    
    // Check if there's already a save in progress for this transaction
    if (saveCache.has(cacheKey)) {
      console.log('Save already in progress for transaction:', transaction.id, 'waiting for completion...');
      return saveCache.get(cacheKey)!;
    }
    
    // Create the save promise and cache it
    const savePromise = this._performSaveTransaction(transaction);
    saveCache.set(cacheKey, savePromise);
    
    try {
      await savePromise;
    } finally {
      // Clean up cache after completion
      saveCache.delete(cacheKey);
    }
  }

  private async _performSaveTransaction(transaction: Transaction): Promise<void> {
    try {
      const { items, sessionImages, ...transactionData } = transaction;
      
      console.log('saveTransaction called with:', {
        transactionId: transaction.id,
        transactionType: transaction.type,
        customerType: transaction.customerType,
        customerName: transaction.customerName,
        itemsCount: items?.length || 0,
        sessionImagesCount: sessionImages?.length || 0,
        items: items
      });
      
      // Handle session images - only upload if they are base64 data, not URLs
      let sessionImageUrls: string[] = [];
      if (sessionImages && sessionImages.length > 0) {
        // Check if images are already URLs (already uploaded) or base64 data (need upload)
        const needsUpload = sessionImages.some(img => 
          img.startsWith('data:image/') || img.includes('base64')
        );
        
        if (needsUpload) {
          console.log('Uploading session images to Supabase Storage...');
          try {
            // Upload session images one by one to avoid Promise.all failures
            const uploadPromises = sessionImages.map(async (base64, index) => {
              try {
                const result = await ImageUploadService.uploadBase64Image(base64, 'transaction-images', `session-${transaction.id}-${index + 1}`);
                return result.publicUrl;
              } catch (uploadError) {
                console.error(`Failed to upload session image ${index + 1}:`, uploadError);
                return null; // Return null for failed uploads
              }
            });
            
            const uploadResults = await Promise.all(uploadPromises);
            sessionImageUrls = uploadResults.filter(url => url !== null); // Filter out failed uploads
            console.log('Session images uploaded successfully:', sessionImageUrls);
          } catch (uploadError) {
            console.error('Failed to upload session images:', uploadError);
            // Continue without images rather than failing the entire transaction
          }
        } else {
          // Images are already URLs, use them directly
          console.log('Session images are already URLs, using them directly:', sessionImages);
          sessionImageUrls = sessionImages;
        }
      }
      
      // Update transaction data with image URLs instead of base64
      const transactionWithImageUrls = {
        ...transactionData,
        sessionImages: sessionImageUrls.length > 0 ? sessionImageUrls : undefined
      };
      
      // Convert frontend camelCase to database snake_case (without items)
      const dbTransaction = convertTransactionToDb(transactionWithImageUrls);
      
      console.log('Transaction data before save:', dbTransaction);
      
      // Validate required fields
      const requiredFields = ['id', 'type', 'subtotal', 'total', 'timestamp', 'employee', 'status'];
      for (const field of requiredFields) {
        if (!dbTransaction[field] && dbTransaction[field] !== 0) {
          throw new Error(`Required field '${field}' is missing or undefined`);
        }
      }
      
      // Ensure customer_type has a valid default value if missing
      if (!dbTransaction.customer_type) {
        dbTransaction.customer_type = 'individual'; // Default to 'individual' if not specified
      }
      
      // No mapping needed - frontend and database use the same values now
      // individual, business, government
      
      console.log('🔄 Customer type in saveTransaction:', {
        originalCustomerType: transaction.customerType,
        finalCustomerType: dbTransaction.customer_type
      });
      
      // Validate customer_type for database constraint
      if (!['individual', 'business', 'government'].includes(dbTransaction.customer_type)) {
        throw new Error(`Invalid customer_type: ${dbTransaction.customer_type}. Must be 'individual', 'business', or 'government'`);
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
        transactionItems: transaction.items, // Check if items exist on original transaction
        transactionId: transaction.id,
        transactionType: transaction.type,
        transactionStatus: transaction.status
      });
      
      // Only save items if there are items to save AND this is not just a draft
      // Draft transactions with status 'in-progress' and no items should not save items
      const isDraftWithNoItems = transaction.status === 'in-progress' && (!items || items.length === 0);
      
      if (items && items.length > 0) {
        console.log('Deleting existing items for transaction:', transaction.id);
        
        // Delete existing items first - always do this to prevent conflicts
        const { error: deleteError } = await supabase
          .from('transaction_items')
          .delete()
          .eq('transaction_id', transaction.id);
          
        if (deleteError) {
          console.error('Error deleting existing items:', deleteError);
          // Don't throw here, continue with insert as items might not exist
          console.log('Continuing with insert despite delete error...');
        } else {
          console.log('Successfully deleted existing items');
        }

        // Process items and handle item images with better error handling
        const processedItems = await Promise.allSettled(items.map(async (item) => {
          let itemImageUrls: string[] = [];
          
          // Handle item images - only upload if they are base64 data, not URLs
          if (item.images && item.images.length > 0) {
            // Check if images are already URLs (already uploaded) or base64 data (need upload)
            const needsUpload = item.images.some(img => 
              img.startsWith('data:image/') || img.includes('base64')
            );
            
            if (needsUpload) {
              console.log(`Uploading ${item.images.length} images for item: ${item.name}`);
              try {
                // Upload images one by one to avoid Promise.all failures
                const uploadPromises = item.images.map(async (base64, index) => {
                  try {
                    const result = await ImageUploadService.uploadBase64Image(base64, 'item-images', `item-${item.id}-${index + 1}`);
                    return result.publicUrl;
                  } catch (uploadError) {
                    console.error(`Failed to upload image ${index + 1} for item ${item.name}:`, uploadError);
                    return null; // Return null for failed uploads
                  }
                });
                
                const uploadResults = await Promise.all(uploadPromises);
                itemImageUrls = uploadResults.filter(url => url !== null); // Filter out failed uploads
                console.log(`Item images uploaded successfully for ${item.name}:`, itemImageUrls);
              } catch (uploadError) {
                console.error(`Failed to upload images for item ${item.name}:`, uploadError);
                // Continue without images rather than failing the entire transaction
              }
            } else {
              // Images are already URLs, use them directly
              console.log(`Item images are already URLs for ${item.name}, using them directly:`, item.images);
              itemImageUrls = item.images;
            }
          }
          
          return {
            id: item.id || crypto.randomUUID(), // Generate proper UUID if not provided
            name: item.name,
            weight: item.weight,
            pieces: item.pieces,
            price: item.price,
            total: item.total,
            images: itemImageUrls.length > 0 ? itemImageUrls : undefined,
            transaction_id: transaction.id,
            business_id: item.businessId // Convert camelCase to snake_case
          };
        }));

        // Filter out failed items and log any failures
        const successfulItems = processedItems
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);

        const failedItems = processedItems
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected');

        if (failedItems.length > 0) {
          console.error('Some items failed to process:', failedItems.map(result => result.reason));
        }

        console.log(`Successfully processed ${successfulItems.length} out of ${items.length} items`);
        
        console.log('Inserting transaction items with uploaded images:', successfulItems);

        // Insert items with retry logic for duplicate key errors
        let itemsError = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const { error } = await supabase
              .from('transaction_items')
              .insert(successfulItems);

            if (error) {
              // If it's a duplicate key error, try to delete and re-insert
              if (error.code === '23505') {
                console.log(`Duplicate key error detected, retrying... (attempt ${retryCount + 1})`);
                
                // Delete existing items for this transaction
                await supabase
                  .from('transaction_items')
                  .delete()
                  .eq('transaction_id', transaction.id);
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
                
                retryCount++;
                continue;
              } else {
                itemsError = error;
                break;
              }
            } else {
              // Success, break out of retry loop
              break;
            }
          } catch (retryError) {
            console.error(`Retry attempt ${retryCount + 1} failed:`, retryError);
            retryCount++;
            if (retryCount >= maxRetries) {
              itemsError = retryError;
              break;
            }
            // Wait before next retry
            await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
          }
        }

        if (itemsError) {
          console.error('Error inserting transaction items after retries:', itemsError);
          throw itemsError;
        }
        
        console.log('Successfully saved', successfulItems.length, 'transaction items');
      } else if (isDraftWithNoItems) {
        console.log('Skipping items save for draft transaction with no items:', transaction.id);
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

      return `TXN-${String(nextNumber).padStart(8, '0')}`;
    } catch (error) {
      console.error('Error generating transaction ID:', error);
      return `TXN-${Date.now()}`;
    }
  }

  // Employee methods
  async getAllEmployees(): Promise<Employee[]> {
    try {
      console.log('getAllEmployees: Fetching employees from database...');
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          cash_advances (*)
        `)
        .order('name');

      if (error) {
        console.error('getAllEmployees: Database error:', error);
        throw error;
      }

      console.log('getAllEmployees: Raw data from database:', data?.length || 0, 'employees');
      console.log('getAllEmployees: Raw employee data:', data?.map(e => ({ id: e.id, name: e.name })));

      const employees = (data || []).map(employee => convertEmployeeFromDb(employee));
      console.log('getAllEmployees: Returning', employees.length, 'employees');
      return employees;
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
      console.log('Deleting employee ID:', id);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete employee failed:', error);
        throw error;
      }
      
      console.log('Employee deleted successfully');
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
      
      // Convert snake_case to camelCase
      return (data || []).map((dbEntry: any) => ({
        id: dbEntry.id,
        type: dbEntry.type,
        amount: dbEntry.amount,
        description: dbEntry.description,
        timestamp: dbEntry.timestamp,
        employee: dbEntry.employee,
        transactionId: dbEntry.transaction_id,
        businessId: dbEntry.business_id, // Convert snake_case to camelCase
        createdBy: dbEntry.created_by,
        createdAt: dbEntry.created_at,
        updatedAt: dbEntry.updated_at
      }));
    } catch (error) {
      console.error('Error fetching cash entries:', error);
      return [];
    }
  }

  async getCashEntriesPaginated(page: number = 1, pageSize: number = 10, dateFilter?: { startDate?: string, endDate?: string }): Promise<{ entries: CashEntry[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * pageSize;
      
      // Build query
      let query = supabase
        .from('cash_entries')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply date filter if provided
      if (dateFilter?.startDate) {
        query = query.gte('timestamp', dateFilter.startDate);
      }
      if (dateFilter?.endDate) {
        query = query.lte('timestamp', dateFilter.endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      // Convert snake_case to camelCase
      const entries = (data || []).map((dbEntry: any) => ({
        id: dbEntry.id,
        type: dbEntry.type,
        amount: dbEntry.amount,
        description: dbEntry.description,
        timestamp: dbEntry.timestamp,
        employee: dbEntry.employee,
        transactionId: dbEntry.transaction_id,
        businessId: dbEntry.business_id,
        createdBy: dbEntry.created_by,
        createdAt: dbEntry.created_at,
        updatedAt: dbEntry.updated_at
      }));

      const total = count || 0;
      const hasMore = offset + pageSize < total;

      return {
        entries,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching paginated cash entries:', error);
      return {
        entries: [],
        total: 0,
        hasMore: false
      };
    }
  }

  async getCashMetrics(dateFilter?: { startDate?: string, endDate?: string }): Promise<{
    transactionIncome: number;
    totalExpenses: number;
    currentBalance: number;
    sellIncome: number;
    buyExpenses: number;
    generalExpenses: number;
    adjustments: number;
  }> {
    try {
      let query = supabase
        .from('cash_entries')
        .select('type, amount');

      // Apply date filter if provided
      if (dateFilter?.startDate) {
        query = query.gte('timestamp', dateFilter.startDate);
      }
      if (dateFilter?.endDate) {
        query = query.lte('timestamp', dateFilter.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate metrics from filtered data
      const entries = data || [];
      
      // Transaction income (sell entries)
      const sellIncome = entries
        .filter(entry => entry.type === 'sell')
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Transaction expenses (buy entries)
      const buyExpenses = entries
        .filter(entry => entry.type === 'buy')
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

      // General expenses
      const generalExpenses = entries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

      // Adjustments
      const adjustments = entries
        .filter(entry => entry.type === 'adjustment')
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Total transaction income (sell)
      const transactionIncome = sellIncome;

      // Total expenses (buy + general)
      const totalExpenses = buyExpenses + generalExpenses;

      // Current balance (sum of all entries in the date range)
      const currentBalance = entries.reduce((sum, entry) => sum + entry.amount, 0);

      return {
        transactionIncome,
        totalExpenses,
        currentBalance,
        sellIncome,
        buyExpenses,
        generalExpenses,
        adjustments
      };
    } catch (error) {
      console.error('Error fetching cash metrics:', error);
      return {
        transactionIncome: 0,
        totalExpenses: 0,
        currentBalance: 0,
        sellIncome: 0,
        buyExpenses: 0,
        generalExpenses: 0,
        adjustments: 0
      };
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
      // Convert camelCase to snake_case for database
      const dbCashEntry = {
        id: cashEntry.id,
        type: cashEntry.type,
        amount: cashEntry.amount,
        description: cashEntry.description,
        timestamp: cashEntry.timestamp,
        employee: cashEntry.employee,
        transaction_id: cashEntry.transaction_id,
        business_id: cashEntry.businessId, // Convert camelCase to snake_case
        created_by: cashEntry.created_by,
        created_at: cashEntry.created_at,
        updated_at: cashEntry.updated_at
      };

      const { error } = await supabase
        .from('cash_entries')
        .upsert(dbCashEntry);

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

  // Financial metrics methods for optimized queries
  async getFinancialMetrics(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    currentBalance: number;
    totalSpent: number;
    totalEarned: number;
    netProfit: number;
    totalTransactions: number;
    totalPurchases: number;
    totalSales: number;
  }> {
    try {
      console.time('getFinancialMetrics');
      
      const { startDate, endDate } = options || {};

      // Get current balance from cash entries
      const { data: cashEntries, error: cashError } = await supabase
        .from('cash_entries')
        .select('amount');

      if (cashError) throw cashError;

      const currentBalance = cashEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

      // Build transaction query with date filtering
      let transactionQuery = supabase
        .from('transactions')
        .select('type, total, expenses, status');

      if (startDate && endDate) {
        transactionQuery = transactionQuery
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }

      const { data: transactions, error: transactionError } = await transactionQuery;

      if (transactionError) throw transactionError;

      // Calculate metrics from transactions
      const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
      const buyTransactions = completedTransactions.filter(t => t.type === 'buy');
      const sellTransactions = completedTransactions.filter(t => t.type === 'sell');

      const totalSpent = buyTransactions.reduce((sum, t) => sum + (t.total || 0) + (t.expenses || 0), 0);
      const totalEarned = sellTransactions.reduce((sum, t) => sum + (t.total || 0) - (t.expenses || 0), 0);
      const netProfit = totalEarned - totalSpent;
      const totalTransactions = completedTransactions.length;
      const totalPurchases = buyTransactions.length;
      const totalSales = sellTransactions.length;

      console.timeEnd('getFinancialMetrics');

      return {
        currentBalance,
        totalSpent,
        totalEarned,
        netProfit,
        totalTransactions,
        totalPurchases,
        totalSales
      };
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      return {
        currentBalance: 0,
        totalSpent: 0,
        totalEarned: 0,
        netProfit: 0,
        totalTransactions: 0,
        totalPurchases: 0,
        totalSales: 0
      };
    }
  }

  // Get only transactions for a specific page (no count)
  async getTransactionsPage(options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string[];
    type?: 'buy' | 'sell';
  }): Promise<Transaction[]> {
    try {
      console.time('getTransactionsPage');
      
      const { 
        page = 1, 
        limit = 20, 
        startDate, 
        endDate, 
        status,
        type 
      } = options || {};

      const offset = (page - 1) * limit;

      // Build query for transactions only (no count)
      let query = supabase
        .from('transactions')
        .select('*, transaction_items (*)')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (startDate && endDate) {
        query = query
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.timeEnd('getTransactionsPage');
      console.log(`Fetched page ${page} with ${data?.length || 0} transactions`);

      return (data || []).map(transaction => convertTransactionFromDb(transaction));
    } catch (error) {
      console.error('Error fetching transactions page:', error);
      return [];
    }
  }

  // Get total count for pagination (separate query)
  async getTransactionsCount(options?: {
    startDate?: string;
    endDate?: string;
    status?: string[];
    type?: 'buy' | 'sell';
  }): Promise<number> {
    try {
      console.time('getTransactionsCount');
      
      const { 
        startDate, 
        endDate, 
        status,
        type 
      } = options || {};

      // Build count query (no data, just count)
      let query = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (startDate && endDate) {
        query = query
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { count, error } = await query;

      if (error) throw error;

      console.timeEnd('getTransactionsCount');
      console.log(`Total transactions count: ${count || 0}`);

      return count || 0;
    } catch (error) {
      console.error('Error fetching transactions count:', error);
      return 0;
    }
  }

  // Specialized Reports queries - return only aggregated data
  async getReportsMetrics(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalTransactions: number;
    totalBought: number;
    totalSold: number;
    totalExpenses: number;
    netProfit: number;
    buyCount: number;
    sellCount: number;
    topItems: Array<{
      name: string;
      total: number;
      weight: number;
      pieces: number;
    }>;
    employeePerformance: Array<{
      name: string;
      transactionCount: number;
      totalValue: number;
      avgValue: number;
    }>;
    chartData: Array<{
      date: string;
      purchases: number;
      sales: number;
    }>;
  }> {
    try {
      console.time('getReportsMetrics');
      
      const { startDate, endDate } = options || {};

      // 1. Get transaction counts and totals
      let transactionQuery = supabase
        .from('transactions')
        .select('type, total, expenses, status')
        .eq('status', 'completed')
        .limit(10000); // Explicit limit to get all transactions
      
      if (startDate && endDate) {
        transactionQuery = transactionQuery
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }
      
      const { data: transactionStats, error: statsError } = await transactionQuery;

      if (statsError) throw statsError;

      const totalTransactions = transactionStats?.length || 0;
      const buyTransactions = transactionStats?.filter(t => t.type === 'buy') || [];
      const sellTransactions = transactionStats?.filter(t => t.type === 'sell') || [];
      
      console.log('Reports - Fetched transactions:', {
        total: totalTransactions,
        buy: buyTransactions.length,
        sell: sellTransactions.length,
        dateFilter: startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'
      });
      
      const totalBought = buyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalSold = sellTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalExpenses = transactionStats?.reduce((sum, t) => sum + (t.expenses || 0), 0) || 0;
      const netProfit = totalSold - totalBought - totalExpenses;

      // 2. Get top items
      let itemsQuery = supabase
        .from('transactions')
        .select('transaction_items(name, total, weight, pieces)')
        .eq('status', 'completed')
        .limit(10000); // Explicit limit to get all transactions
      
      if (startDate && endDate) {
        itemsQuery = itemsQuery
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }
      
      const { data: itemsData, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      const topItems = (itemsData || [])
        .flatMap(t => t.transaction_items || [])
        .reduce((acc: any, item) => {
          const existing = acc.find((i: any) => i.name === item.name);
          if (existing) {
            existing.total += item.total || 0;
            existing.weight += item.weight || 0;
            existing.pieces += item.pieces || 0;
          } else {
            acc.push({
              name: item.name,
              total: item.total || 0,
              weight: item.weight || 0,
              pieces: item.pieces || 0
            });
          }
          return acc;
        }, [])
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);

      // 3. Get employee performance
      let employeeQuery = supabase
        .from('transactions')
        .select('employee, total')
        .eq('status', 'completed')
        .limit(10000); // Explicit limit to get all transactions
      
      if (startDate && endDate) {
        employeeQuery = employeeQuery
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }
      
      const { data: employeeData, error: employeeError } = await employeeQuery;

      if (employeeError) throw employeeError;

      const employeePerformance = (employeeData || [])
        .reduce((acc: any, t) => {
          const existing = acc.find((e: any) => e.name === t.employee);
          if (existing) {
            existing.transactionCount += 1;
            existing.totalValue += t.total || 0;
          } else {
            acc.push({
              name: t.employee,
              transactionCount: 1,
              totalValue: t.total || 0,
              avgValue: 0
            });
          }
          return acc;
        }, [])
        .map((emp: any) => ({
          ...emp,
          avgValue: emp.transactionCount > 0 ? emp.totalValue / emp.transactionCount : 0
        }))
        .sort((a: any, b: any) => b.totalValue - a.totalValue);

      // 4. Get chart data (grouped by date)
      let chartQuery = supabase
        .from('transactions')
        .select('timestamp, type, total')
        .eq('status', 'completed')
        .order('timestamp', { ascending: true })
        .limit(10000); // Explicit limit to get all transactions
      
      if (startDate && endDate) {
        chartQuery = chartQuery
          .gte('timestamp', startDate)
          .lte('timestamp', endDate);
      }
      
      const { data: chartData, error: chartError } = await chartQuery;

      if (chartError) throw chartError;

      const chartDataGrouped = (chartData || [])
        .reduce((acc: any, t) => {
          const date = new Date(t.timestamp).toISOString().split('T')[0];
          const existing = acc.find((d: any) => d.date === date);
          if (existing) {
            if (t.type === 'buy') {
              existing.purchases += t.total || 0;
            } else {
              existing.sales += t.total || 0;
            }
          } else {
            acc.push({
              date,
              purchases: t.type === 'buy' ? (t.total || 0) : 0,
              sales: t.type === 'sell' ? (t.total || 0) : 0
            });
          }
          return acc;
        }, [])
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log('Reports - Chart data generated:', {
        rawTransactions: chartData?.length || 0,
        groupedDataPoints: chartDataGrouped.length,
        dateRange: chartDataGrouped.length > 0 ? {
          first: chartDataGrouped[0]?.date,
          last: chartDataGrouped[chartDataGrouped.length - 1]?.date
        } : null
      });

      console.timeEnd('getReportsMetrics');

      return {
        totalTransactions,
        totalBought,
        totalSold,
        totalExpenses,
        netProfit,
        buyCount: buyTransactions.length,
        sellCount: sellTransactions.length,
        topItems,
        employeePerformance,
        chartData: chartDataGrouped
      };
    } catch (error) {
      console.error('Error fetching reports metrics:', error);
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
  }
}

// Create singleton instance
export const supabaseDataService = new SupabaseDataService();

// Export the supabase client for direct use if needed
export { supabase };
