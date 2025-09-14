import { TransactionService, TransactionServiceImpl } from './application';
import { SupabaseTransactionRepository } from './infrastructure';

// Dependency Injection Container
export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeServices(): void {
    // Initialize repositories
    const transactionRepository = new SupabaseTransactionRepository();
    this.services.set('transactionRepository', transactionRepository);

    // Initialize services
    const transactionService = new TransactionServiceImpl(transactionRepository);
    this.services.set('transactionService', transactionService);
  }

  public get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }
}

// Convenience functions
export const getTransactionService = (): TransactionService => {
  return Container.getInstance().get<TransactionService>('transactionService');
};

export const getTransactionRepository = () => {
  return Container.getInstance().get('transactionRepository');
};
