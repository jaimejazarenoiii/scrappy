export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

export const validatePositiveNumber = (value: number): boolean => {
  return typeof value === 'number' && value > 0;
};

export const validateTransactionType = (type: string): boolean => {
  return ['buy', 'sell'].includes(type);
};

export const validateCustomerType = (type: string): boolean => {
  return ['person', 'company', 'government'].includes(type);
};

export const validateTransactionStatus = (status: string): boolean => {
  return ['in-progress', 'for-payment', 'completed', 'cancelled'].includes(status);
};

export const validateEmployeeRole = (role: string): boolean => {
  return ['owner', 'employee'].includes(role);
};

export const validateItem = (item: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateRequired(item.name)) {
    errors.push('Item name is required');
  }

  const quantity = item.weight || item.pieces;
  if (!validatePositiveNumber(quantity)) {
    errors.push('Item quantity must be greater than 0');
  }

  if (!validatePositiveNumber(item.price)) {
    errors.push('Item price must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateTransaction = (transaction: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateTransactionType(transaction.type)) {
    errors.push('Invalid transaction type');
  }

  if (!validateCustomerType(transaction.customerType)) {
    errors.push('Invalid customer type');
  }

  if (!transaction.items || transaction.items.length === 0) {
    errors.push('Transaction must have at least one item');
  } else {
    transaction.items.forEach((item: any, index: number) => {
      const itemValidation = validateItem(item);
      if (!itemValidation.isValid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
