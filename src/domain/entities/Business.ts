export interface Business {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  settings: BusinessSettings;
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BusinessSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  features: {
    inventoryManagement: boolean;
    advancedReporting: boolean;
    multiLocation: boolean;
    apiAccess: boolean;
  };
  limits: {
    maxEmployees: number;
    maxTransactionsPerMonth: number;
    maxStorageGB: number;
  };
}

export interface BusinessUser {
  id: string;
  businessId: string;
  userId: string;
  role: 'owner' | 'manager' | 'employee' | 'viewer';
  permissions: BusinessPermissions;
  isActive: boolean;
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPermissions {
  canManageEmployees: boolean;
  canManageTransactions: boolean;
  canManageCash: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canInviteUsers: boolean;
}

export interface BusinessInvitation {
  id: string;
  businessId: string;
  email: string;
  role: 'owner' | 'manager' | 'employee' | 'viewer';
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  acceptedBy?: string;
  createdAt: string;
  updatedAt: string;
}


