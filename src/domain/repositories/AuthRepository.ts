export interface User {
  id: string;
  email: string;
  role: 'owner' | 'employee';
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'employee';
}

export interface AuthRepository {
  // Authentication operations
  login(request: LoginRequest): Promise<User>;
  signup(request: SignupRequest): Promise<User>;
  logout(): Promise<void>;
  
  // Session operations
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
  
  // Password operations
  resetPassword(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}
