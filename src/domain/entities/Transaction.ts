export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  status: 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
  customerType: 'individual' | 'business' | 'government';
  customerName?: string;
  employee?: string;
  location?: string;
  timestamp: string;
  subtotal: number;
  expenses: number;
  total: number;
  items: TransactionItem[];
  tripExpenses?: TripExpense[];
  deliveryExpenses?: DeliveryExpense[];
  sessionImages?: string[];
  isPickup?: boolean;
  isDelivery?: boolean;
  sessionType?: string;
}

export interface TransactionItem {
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[];
  category?: string;
}

export interface TripExpense {
  id: string;
  type: string;
  amount: number;
  description: string;
}

export interface DeliveryExpense {
  id: string;
  type: string;
  amount: number;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'employee';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
