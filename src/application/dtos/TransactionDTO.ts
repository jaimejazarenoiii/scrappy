import { Transaction, TransactionItem } from '../../domain/entities';

export interface TransactionCreateDTO {
  type: 'buy' | 'sell';
  customerType: 'person' | 'company' | 'government';
  customerName?: string;
  employee?: string;
  location?: string;
  items: TransactionItemCreateDTO[];
  expenses?: number;
  tripExpenses?: TripExpenseCreateDTO[];
  deliveryExpenses?: DeliveryExpenseCreateDTO[];
  sessionImages?: string[];
  isPickup?: boolean;
  isDelivery?: boolean;
  sessionType?: string;
}

export interface TransactionUpdateDTO {
  id: string;
  status?: 'in-progress' | 'for-payment' | 'completed' | 'cancelled';
  customerType?: 'person' | 'company' | 'government';
  customerName?: string;
  employee?: string;
  location?: string;
  items?: TransactionItemUpdateDTO[];
  expenses?: number;
  tripExpenses?: TripExpenseUpdateDTO[];
  deliveryExpenses?: DeliveryExpenseUpdateDTO[];
  sessionImages?: string[];
  isPickup?: boolean;
  isDelivery?: boolean;
  sessionType?: string;
}

export interface TransactionItemCreateDTO {
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[];
  category?: string;
}

export interface TransactionItemUpdateDTO {
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[];
  category?: string;
}

export interface TripExpenseCreateDTO {
  type: string;
  amount: number;
  description: string;
}

export interface TripExpenseUpdateDTO {
  id?: string;
  type: string;
  amount: number;
  description: string;
}

export interface DeliveryExpenseCreateDTO {
  type: string;
  amount: number;
  description: string;
}

export interface DeliveryExpenseUpdateDTO {
  id?: string;
  type: string;
  amount: number;
  description: string;
}

export interface TransactionResponseDTO extends Transaction {}

export interface TransactionListResponseDTO {
  transactions: TransactionResponseDTO[];
  total: number;
  page: number;
  limit: number;
}
