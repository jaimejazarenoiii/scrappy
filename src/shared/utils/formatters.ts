export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(1)} kg`;
};

export const formatPieces = (pieces: number): string => {
  return `${pieces} pieces`;
};

export const formatQuantity = (item: { weight?: number; pieces?: number }): string => {
  if (item.weight !== undefined) {
    return formatWeight(item.weight);
  }
  if (item.pieces !== undefined) {
    return formatPieces(item.pieces);
  }
  return '0';
};
