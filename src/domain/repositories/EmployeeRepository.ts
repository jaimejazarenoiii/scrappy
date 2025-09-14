import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../entities';

export interface EmployeeRepository {
  // Create operations
  createEmployee(request: CreateEmployeeRequest): Promise<Employee>;
  
  // Read operations
  getEmployee(id: string): Promise<Employee | null>;
  getEmployees(): Promise<Employee[]>;
  getEmployeeByEmail(email: string): Promise<Employee | null>;
  
  // Update operations
  updateEmployee(request: UpdateEmployeeRequest): Promise<Employee>;
  deactivateEmployee(id: string): Promise<Employee>;
  
  // Delete operations
  deleteEmployee(id: string): Promise<void>;
}
