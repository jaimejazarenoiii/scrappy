# Clean Architecture Implementation

This project implements Clean Architecture principles to ensure maintainability, testability, and scalability.

## Architecture Layers

### 🏛️ Domain Layer (`src/domain/`)
**Core business logic with no external dependencies**

- **Entities** (`entities/`): Core business objects
  - `Transaction.ts` - Transaction business entity
  - `Employee.ts` - Employee business entity
  
- **Use Cases** (`usecases/`): Business logic implementations
  - `transactions/CreateTransaction.ts` - Transaction creation logic
  - `transactions/UpdateTransaction.ts` - Transaction update logic
  - `transactions/GetTransactions.ts` - Transaction retrieval logic
  
- **Repositories** (`repositories/`): Interface contracts for data access
  - `TransactionRepository.ts` - Transaction data access contract
  - `EmployeeRepository.ts` - Employee data access contract
  - `AuthRepository.ts` - Authentication contract

### 🔧 Application Layer (`src/application/`)
**Application services and DTOs that depend on domain**

- **Services** (`services/`): Application service implementations
  - `TransactionService.ts` - Transaction application service
  
- **DTOs** (`dtos/`): Data Transfer Objects for API communication
  - `TransactionDTO.ts` - Transaction data transfer objects

### 🏗️ Infrastructure Layer (`src/infrastructure/`)
**External dependencies and implementations**

- **Database** (`database/`): Database implementations
  - `supabase/SupabaseTransactionRepository.ts` - Supabase transaction repository
  - `supabase/supabaseClient.ts` - Supabase client configuration

### 🎨 Presentation Layer (`src/presentation/`)
**UI components and React-specific logic**

- **Hooks** (`hooks/`): Custom React hooks
  - `useTransactions.ts` - Transaction management hook
  
- **Contexts** (`contexts/`): React context providers
  - `TransactionContext.tsx` - Transaction context provider

### 🔄 Shared Layer (`src/shared/`)
**Common utilities and types**

- **Types** (`types/`): Shared TypeScript types
  - `common.ts` - Common API and state types
  
- **Utils** (`utils/`): Utility functions
  - `formatters.ts` - Data formatting utilities
  - `validators.ts` - Validation utilities

## Dependency Flow

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain** has no dependencies on other layers
- **Application** depends only on Domain
- **Infrastructure** depends on Domain and Application
- **Presentation** depends on Application and Shared

## Key Benefits

### ✅ **Separation of Concerns**
- Business logic is isolated in the domain layer
- UI logic is separated from business logic
- Data access is abstracted through repositories

### ✅ **Testability**
- Domain logic can be tested without external dependencies
- Use cases can be unit tested with mock repositories
- Components can be tested with mock services

### ✅ **Maintainability**
- Changes to one layer don't affect others
- Business rules are centralized and consistent
- Easy to add new features or modify existing ones

### ✅ **Flexibility**
- Can swap out Supabase for another database
- Can change UI framework without affecting business logic
- Can add new data sources without changing use cases

## Usage Examples

### Creating a Transaction
```typescript
import { getTransactionService } from './src/container';

const transactionService = getTransactionService();
const transaction = await transactionService.createTransaction({
  type: 'buy',
  customerType: 'person',
  items: [...],
  // ... other fields
});
```

### Using in React Components
```typescript
import { useTransactionContext } from './src/presentation';

function TransactionList() {
  const { transactions, loading, createTransaction } = useTransactionContext();
  
  // Component logic
}
```

### Adding New Use Case
1. Create use case interface in `src/domain/usecases/`
2. Implement use case in `src/domain/usecases/`
3. Add to application service in `src/application/services/`
4. Implement repository method in `src/infrastructure/`
5. Add hook in `src/presentation/hooks/`

## Migration Strategy

To migrate existing components to clean architecture:

1. **Extract business logic** from components to use cases
2. **Create repository interfaces** for data access
3. **Implement infrastructure** repositories
4. **Create application services** that orchestrate use cases
5. **Update components** to use services instead of direct data access
6. **Add proper error handling** and validation

## Testing Strategy

- **Domain Layer**: Unit tests with no mocks
- **Application Layer**: Unit tests with mock repositories
- **Infrastructure Layer**: Integration tests with real database
- **Presentation Layer**: Component tests with mock services

This architecture ensures that your codebase remains maintainable and scalable as it grows.
