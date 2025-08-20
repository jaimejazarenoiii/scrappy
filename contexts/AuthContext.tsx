import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseService';

export type UserRole = 'owner' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  last_login?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check Supabase session first
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session) {
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error getting profile:', profileError);
          // If no profile exists, clear session
          await supabase.auth.signOut();
          localStorage.removeItem('scrappy_session');
          setLoading(false);
          return;
        }

        const user: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role
        };

        // Create session object for compatibility
        const authSession: AuthSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: new Date(session.expires_at || 0).getTime(),
          user
        };

        setUser(user);
        setSession(authSession);
        
        // Save to localStorage for persistence
        localStorage.setItem('scrappy_session', JSON.stringify(authSession));
      } else {
        // No Supabase session, clear any stored session
        localStorage.removeItem('scrappy_session');
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      localStorage.removeItem('scrappy_session');
    } finally {
      setLoading(false);
    }
  };

  // Demo users are now handled directly in the login function

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // Use Supabase auth for all authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error getting profile:', profileError);
          // If no profile exists, create a default one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              auth_user_id: data.user.id,
              name: data.user.email?.split('@')[0] || 'User',
              role: 'employee',
              email: data.user.email
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            throw new Error('Failed to create user profile');
          }

          const user: User = {
            id: newProfile.id,
            email: newProfile.email,
            name: newProfile.name,
            role: newProfile.role
          };

          const authSession: AuthSession = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: new Date(data.session.expires_at || 0).getTime(),
            user
          };

          setUser(user);
          setSession(authSession);

          if (rememberMe) {
            localStorage.setItem('scrappy_session', JSON.stringify(authSession));
          }
        } else {
          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role
          };

          const authSession: AuthSession = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: new Date(data.session.expires_at || 0).getTime(),
            user
          };

          setUser(user);
          setSession(authSession);

          if (rememberMe) {
            localStorage.setItem('scrappy_session', JSON.stringify(authSession));
          }
        }
      }

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // For real Supabase auth (when configured)
      await supabase.auth.signOut();

      // Clear local state and storage
      setUser(null);
      setSession(null);
      localStorage.removeItem('scrappy_session');
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local session even if there are errors
      setUser(null);
      setSession(null);
      localStorage.removeItem('scrappy_session');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Permission matrix
    const permissions = {
      owner: [
        'view_dashboard',
        'buy_scrap', 
        'sell_scrap',
        'manage_employees',
        'view_reports',
        'manage_cash',
        'process_payments',
        'edit_completed_transactions',
        'view_all_transactions',
        'manage_settings'
      ],
      employee: [
        'view_dashboard',
        'buy_scrap',
        'sell_scrap',
        'edit_in_progress_transactions'
      ]
    };

    return permissions[user.role]?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};