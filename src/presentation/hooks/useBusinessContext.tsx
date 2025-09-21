import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Business, BusinessUser } from '../../domain/entities/Business';
import { businessService } from '../../infrastructure/services/BusinessService';

interface BusinessContextType {
  currentBusiness: Business | null;
  userBusinesses: Business[];
  businessUsers: BusinessUser[];
  loading: boolean;
  error: string | null;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusiness: () => Promise<void>;
  refreshBusinessUsers: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentBusiness = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading current business...');
      const business = await businessService.getCurrentBusiness();
      console.log('Current business:', business);
      
      // If no business is found, create a fallback business object
      if (business) {
        setCurrentBusiness(business);
        // Load business users for current business
        console.log('Loading business users for business:', business.id);
        const users = await businessService.getBusinessUsers(business.id);
        console.log('Business users loaded:', users);
        setBusinessUsers(users);
      } else {
        console.log('No business found for current user, using fallback');
        // Use a fallback business object
        const fallbackBusiness = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Default Business',
          description: 'Default business for unassociated users',
          address: '',
          phone: '',
          email: '',
          logoUrl: '',
          settings: {},
          subscriptionPlan: 'free',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: ''
        };
        setCurrentBusiness(fallbackBusiness);
        setBusinessUsers([]);
      }
    } catch (err) {
      console.error('Error loading current business:', err);
      setError(err instanceof Error ? err.message : 'Failed to load business');
      // Set fallback business even on error
      const fallbackBusiness = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Default Business',
        description: 'Default business for unassociated users',
        address: '',
        phone: '',
        email: '',
        logoUrl: '',
        settings: {},
        subscriptionPlan: 'free',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: ''
      };
      setCurrentBusiness(fallbackBusiness);
      setBusinessUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBusinesses = async () => {
    try {
      const businesses = await businessService.getUserBusinesses();
      setUserBusinesses(businesses);
    } catch (err) {
      console.error('Error loading user businesses:', err);
    }
  };

  const switchBusiness = async (businessId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await businessService.switchBusiness(businessId);
      
      // Reload current business and users
      await loadCurrentBusiness();
    } catch (err) {
      console.error('Error switching business:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch business');
    } finally {
      setLoading(false);
    }
  };

  const refreshBusiness = async () => {
    await loadCurrentBusiness();
  };

  const refreshBusinessUsers = async () => {
    if (currentBusiness) {
      try {
        const users = await businessService.getBusinessUsers(currentBusiness.id);
        setBusinessUsers(users);
      } catch (err) {
        console.error('Error refreshing business users:', err);
      }
    }
  };

  useEffect(() => {
    const initializeBusiness = async () => {
      try {
        // Wait a bit for authentication to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await Promise.all([
          loadCurrentBusiness(),
          loadUserBusinesses()
        ]);
      } catch (error) {
        console.error('Error initializing business context:', error);
        setError('Failed to initialize business context');
        setLoading(false);
      }
    };

    initializeBusiness();
  }, []);

  const value: BusinessContextType = {
    currentBusiness,
    userBusinesses,
    businessUsers,
    loading,
    error,
    switchBusiness,
    refreshBusiness,
    refreshBusinessUsers
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}

// Hook for business selection/switching
export function useBusinessSwitcher() {
  const { userBusinesses, currentBusiness, switchBusiness, loading } = useBusinessContext();
  
  const switchToBusiness = async (businessId: string) => {
    if (businessId !== currentBusiness?.id) {
      await switchBusiness(businessId);
    }
  };

  return {
    businesses: userBusinesses,
    currentBusiness,
    switchToBusiness,
    loading
  };
}
