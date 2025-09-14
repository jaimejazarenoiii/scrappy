export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'employee';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  role: 'owner' | 'employee';
}

export interface UpdateEmployeeRequest {
  id: string;
  name?: string;
  email?: string;
  role?: 'owner' | 'employee';
  isActive?: boolean;
}
