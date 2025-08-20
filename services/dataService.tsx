// Browser-compatible data service using localStorage
// This replaces the server KV store imports to fix build errors

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  customerName?: string;
  customerType: 'individual' | 'business';
  items: Array<{
    name: string;
    weight?: number;
    pieces?: number;
    price: number;
    total: number;
    images?: string[];
  }>;
  subtotal: number;
  total: number;
  expenses?: number;
  timestamp: Date;
  completedAt?: Date;
  employee: string;
  status: 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
  isDelivery?: boolean;
  isPickup?: boolean;
  location?: string;
  sessionImages?: string[];
  created_by?: string;
  created_by_name?: string;
  created_by_role?: string;
}

export interface CashEntry {
  id: string;
  type: 'opening' | 'transaction' | 'expense' | 'adjustment';
  amount: number;
  description: string;
  timestamp: Date;
  employee: string;
  transactionId?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar: string;
  weeklySalary?: number;
  currentAdvances?: number;
  advances?: any[];
  sessionsHandled?: number;
}

// Browser storage utilities
class BrowserStorage {
  private static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  private static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  static get(key: string): any {
    return this.getItem(key);
  }

  static set(key: string, value: any): void {
    this.setItem(key, value);
  }

  static del(key: string): void {
    this.removeItem(key);
  }

  static getByPrefix(prefix: string): any[] {
    try {
      const results: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = this.getItem(key);
          if (value) {
            results.push(value);
          }
        }
      }
      return results;
    } catch (error) {
      console.error('Error getting by prefix from localStorage:', error);
      return [];
    }
  }
}

class DataService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing data service...');
    
    // Check if we have any existing data
    const existingTransactions = await this.getAllTransactions();
    
    if (existingTransactions.length === 0) {
      console.log('No existing data found, seeding initial data...');
      await this.seedInitialData();
    }
    
    this.initialized = true;
    console.log('Data service initialized successfully');
  }

  private async seedInitialData() {
    // Seed sample transactions
    const sampleTransactions: Transaction[] = [
      {
        id: 'TXN-001',
        type: 'buy',
        customerName: 'Juan dela Cruz',
        customerType: 'individual',
        employee: 'Maria Santos',
        status: 'completed',
        items: [
          { 
            name: 'Copper Wire', 
            weight: 5.2, 
            price: 400, 
            total: 2080,
            images: [
              'https://images.unsplash.com/photo-1645521214162-10ab9661858f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3BwZXIlMjB3aXJlJTIwc2NyYXAlMjBtZXRhbHxlbnwxfHx8fDE3NTU1OTExNDV8MA&ixlib=rb-4.1.0&q=80&w=400'
            ]
          },
          { 
            name: 'Aluminum Cans', 
            weight: 12.5, 
            price: 25, 
            total: 312.5,
            images: [
              'https://images.unsplash.com/photo-1582126924905-7cdf67fab6cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbHVtaW51bSUyMGNhbnMlMjByZWN5Y2xpbmd8ZW58MXx8fHwxNzU1NTkxMTQ5fDA&ixlib=rb-4.1.0&q=80&w=400'
            ]
          }
        ],
        subtotal: 2392.5,
        total: 2392.5,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        completedAt: new Date(Date.now() - 1000 * 60 * 25),
        sessionImages: [
          'https://images.unsplash.com/photo-1579122383972-33379509fc38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqdW5reWFyZCUyMHdhcmVob3VzZSUyMHRyYW5zYWN0aW9ufGVufDF8fHx8MTc1NTU5MTE2MXww&ixlib=rb-4.1.0&q=80&w=400'
        ]
      },
      {
        id: 'TXN-002', 
        type: 'sell',
        customerType: 'business',
        employee: 'Carlos Reyes',
        status: 'for-payment',
        items: [
          { 
            name: 'Mixed Metal Scrap', 
            weight: 100, 
            price: 35, 
            total: 3500,
            images: [
              'https://images.unsplash.com/photo-1593083887541-8f8c5a8a42e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVlbCUyMHNjcmFwJTIwbWV0YWwlMjB5YXJkfGVufDF8fHx8MTc1NTU5MTE1M3ww&ixlib=rb-4.1.0&q=80&w=400'
            ]
          }
        ],
        subtotal: 3500,
        total: 3500,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        isDelivery: true,
        location: '123 Industrial Ave, Quezon City',
        sessionImages: [
          'https://images.unsplash.com/photo-1684695749267-233af13276d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwd2FyZWhvdXNlfGVufDF8fHx8MTc1NTUxMjQxOXww&ixlib=rb-4.1.0&q=80&w=400'
        ]
      },
      {
        id: 'TXN-003',
        type: 'buy',
        customerName: 'ABC Manufacturing',
        customerType: 'business',
        employee: 'Ana Lopez',
        status: 'in-progress',
        items: [
          { 
            name: 'Steel Scrap', 
            weight: 25.0, 
            price: 15, 
            total: 375,
            images: [
              'https://images.unsplash.com/photo-1593083887541-8f8c5a8a42e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVlbCUyMHNjcmFwJTIwbWV0YWwlMjB5YXJkfGVufDF8fHx8MTc1NTU5MTE1M3ww&ixlib=rb-4.1.0&q=80&w=400'
            ]
          },
          { 
            name: 'Brass Fittings', 
            pieces: 10, 
            price: 50, 
            total: 500,
            images: [
              'https://images.unsplash.com/photo-1732532399621-afd080eb0b52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmFzcyUyMGZpdHRpbmdzJTIwbWV0YWx8ZW58MXx8fHwxNzU1NTkxMTU2fDA&ixlib=rb-4.1.0&q=80&w=400'
            ]
          }
        ],
        subtotal: 875,
        total: 875,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
      }
    ];

    const sampleEmployees: Employee[] = [
      { id: '1', name: 'Maria Santos', role: 'Senior Buyer', phone: '+63 917 123 4567', email: 'maria@scrappy.com', avatar: 'MS' },
      { id: '2', name: 'Carlos Reyes', role: 'Logistics Coordinator', phone: '+63 918 234 5678', email: 'carlos@scrappy.com', avatar: 'CR' },
      { id: '3', name: 'Ana Lopez', role: 'Quality Inspector', phone: '+63 919 345 6789', email: 'ana@scrappy.com', avatar: 'AL' }
    ];

    const sampleCashEntries: CashEntry[] = [
      {
        id: '1',
        type: 'opening',
        amount: 10000,
        description: 'Daily opening balance',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
        employee: 'Maria Santos'
      },
      {
        id: '2',
        type: 'transaction',
        amount: -2392.5,
        description: 'Purchase transaction TXN-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        employee: 'Maria Santos',
        transactionId: 'TXN-001'
      }
    ];

    // Store all sample data
    for (const transaction of sampleTransactions) {
      await this.saveTransaction(transaction);
    }
    
    for (const employee of sampleEmployees) {
      await this.saveEmployee(employee);
    }
    
    for (const cashEntry of sampleCashEntries) {
      await this.saveCashEntry(cashEntry);
    }

    // Set counters
    BrowserStorage.set('counter:transactions', 4);
    BrowserStorage.set('counter:employees', 4);
    BrowserStorage.set('counter:cash', 3);
  }

  // Transaction methods
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const transactions = BrowserStorage.getByPrefix('transaction:');
      return transactions.map(item => this.deserializeTransaction(item));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const result = BrowserStorage.get(`transaction:${id}`);
      return result ? this.deserializeTransaction(result) : null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    try {
      BrowserStorage.set(`transaction:${transaction.id}`, this.serializeTransaction(transaction));
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      BrowserStorage.del(`transaction:${id}`);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async generateTransactionId(): Promise<string> {
    try {
      const counter = BrowserStorage.get('counter:transactions') || 1;
      const newCounter = typeof counter === 'number' ? counter : parseInt(counter as string) || 1;
      BrowserStorage.set('counter:transactions', newCounter + 1);
      return `TXN-${String(newCounter).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating transaction ID:', error);
      return `TXN-${Date.now()}`;
    }
  }

  // Employee methods
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const employees = BrowserStorage.getByPrefix('employee:');
      return employees.map(item => item as Employee);
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      const result = BrowserStorage.get(`employee:${id}`);
      return result as Employee || null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      return null;
    }
  }

  async saveEmployee(employee: Employee): Promise<void> {
    try {
      BrowserStorage.set(`employee:${employee.id}`, employee);
    } catch (error) {
      console.error('Error saving employee:', error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      BrowserStorage.del(`employee:${id}`);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Cash entry methods
  async getAllCashEntries(): Promise<CashEntry[]> {
    try {
      const cashEntries = BrowserStorage.getByPrefix('cash:');
      return cashEntries.map(item => this.deserializeCashEntry(item));
    } catch (error) {
      console.error('Error fetching cash entries:', error);
      return [];
    }
  }

  async getCashEntry(id: string): Promise<CashEntry | null> {
    try {
      const result = BrowserStorage.get(`cash:${id}`);
      return result ? this.deserializeCashEntry(result) : null;
    } catch (error) {
      console.error('Error fetching cash entry:', error);
      return null;
    }
  }

  async saveCashEntry(cashEntry: CashEntry): Promise<void> {
    try {
      BrowserStorage.set(`cash:${cashEntry.id}`, this.serializeCashEntry(cashEntry));
    } catch (error) {
      console.error('Error saving cash entry:', error);
      throw error;
    }
  }

  async deleteCashEntry(id: string): Promise<void> {
    try {
      BrowserStorage.del(`cash:${id}`);
    } catch (error) {
      console.error('Error deleting cash entry:', error);
      throw error;
    }
  }

  async generateCashEntryId(): Promise<string> {
    try {
      const counter = BrowserStorage.get('counter:cash') || 1;
      const newCounter = typeof counter === 'number' ? counter : parseInt(counter as string) || 1;
      BrowserStorage.set('counter:cash', newCounter + 1);
      return String(newCounter);
    } catch (error) {
      console.error('Error generating cash entry ID:', error);
      return String(Date.now());
    }
  }

  // Serialization helpers for Date objects
  private serializeTransaction(transaction: Transaction): any {
    return {
      ...transaction,
      timestamp: transaction.timestamp.toISOString(),
      completedAt: transaction.completedAt?.toISOString()
    };
  }

  private deserializeTransaction(data: any): Transaction {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined
    };
  }

  private serializeCashEntry(cashEntry: CashEntry): any {
    return {
      ...cashEntry,
      timestamp: cashEntry.timestamp.toISOString()
    };
  }

  private deserializeCashEntry(data: any): CashEntry {
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  }
}

// Create singleton instance
export const dataService = new DataService();