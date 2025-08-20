import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  UserPlus, 
  DollarSign, 
  Clock, 
  Edit,
  Trash2,
  CalendarIcon,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Employee, CashAdvance } from '../services/supabaseService';
import { format } from 'date-fns';
import { cn } from './ui/utils';

interface EmployeesProps {
  employees: Employee[];
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  onBack: () => void;
  onAddAdvance: (employeeId: string, advance: CashAdvance) => void;
  onRefreshStats?: (employeeName?: string) => Promise<void>;
  onUpdateAdvanceStatus?: (advanceId: string, status: 'active' | 'deducted' | 'pending', employeeId?: string) => Promise<void>;
}

export default function Employees({ employees, addEmployee, updateEmployee, deleteEmployee, onBack, onAddAdvance, onRefreshStats, onUpdateAdvanceStatus }: EmployeesProps) {
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDescription, setAdvanceDescription] = useState('');
  const [advanceDate, setAdvanceDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    weeklySalary: '',
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.weeklySalary) return;

    const employee: Employee = {
      id: crypto.randomUUID(),
      name: newEmployee.name,
      role: 'employee',
      phone: '',
      email: '',
      avatar: '',
      weeklySalary: parseFloat(newEmployee.weeklySalary),
      currentAdvances: 0,
      sessionsHandled: 0,
      advances: []
    };

    try {
      await addEmployee(employee);
      setNewEmployee({ name: '', weeklySalary: '' });
      setShowAddEmployee(false);
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const removeEmployee = async (id: string) => {
    try {
      await deleteEmployee(id);
    } catch (error) {
      console.error('Error removing employee:', error);
    }
  };

  const handleAdvanceSubmit = () => {
    if (!selectedEmployeeId || !advanceAmount || !advanceDescription) return;

    const advance: CashAdvance = {
      id: crypto.randomUUID(),
      employeeId: selectedEmployeeId,
      amount: parseFloat(advanceAmount),
      date: advanceDate.toISOString(),
      description: advanceDescription,
      status: 'active'
    };

    onAddAdvance(selectedEmployeeId, advance);
    
    // Reset form
    setAdvanceAmount('');
    setAdvanceDescription('');
    setAdvanceDate(new Date());
    setSelectedEmployeeId('');
    setShowAdvanceDialog(false);
  };

  const deductAdvance = async (employeeId: string, advanceId: string) => {
    if (!onUpdateAdvanceStatus) return;
    
    try {
      await onUpdateAdvanceStatus(advanceId, 'deducted', employeeId);
    } catch (error) {
      console.error('Error deducting advance:', error);
    }
  };

  const getTotalWeeklySalaries = () => 
    employees.reduce((total, emp) => total + (emp.weeklySalary || 0), 0);

  const getTotalAdvances = () => 
    employees.reduce((total, emp) => total + (emp.currentAdvances || 0), 0);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Employee Management</h1>
        </div>
        
        <div className="flex space-x-3">
          {onRefreshStats && (
            <Button 
              variant="outline"
              onClick={() => onRefreshStats()}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          )}
          
          <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Cash Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Cash Advance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Date</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !advanceDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {advanceDate ? format(advanceDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={advanceDate}
                        onSelect={(date) => {
                          if (date) {
                            setAdvanceDate(date);
                            setDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Reason for advance..."
                    value={advanceDescription}
                    onChange={(e) => setAdvanceDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleAdvanceSubmit}
                  disabled={!selectedEmployeeId || !advanceAmount || !advanceDescription}
                  className="w-full"
                >
                  Add Advance
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowAddEmployee(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Weekly Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(getTotalWeeklySalaries())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Advances</p>
                <p className="text-2xl font-bold">{formatCurrency(getTotalAdvances())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Form */}
      {showAddEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Employee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Employee Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Weekly Salary</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newEmployee.weeklySalary}
                  onChange={(e) => setNewEmployee({...newEmployee, weeklySalary: e.target.value})}
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleAddEmployee} disabled={!newEmployee.name || !newEmployee.weeklySalary}>
                Add Employee
              </Button>
              <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees List */}
      <div className="space-y-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Employee Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {employee.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{employee.name}</h3>
                      <p className="text-gray-600">Weekly Salary: {formatCurrency(employee.weeklySalary || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">
                      {employee.sessionsHandled || 0} sessions
                    </Badge>
                    {(employee.currentAdvances || 0) > 0 && (
                      <Badge variant="destructive">
                        {formatCurrency(employee.currentAdvances || 0)} advance
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => employee.id && removeEmployee(employee.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Employee Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Weekly Salary</p>
                    <p className="font-semibold">{formatCurrency(employee.weeklySalary || 0)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Current Advances</p>
                    <p className="font-semibold text-red-600">{formatCurrency(employee.currentAdvances || 0)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Sessions Handled</p>
                    <p className="font-semibold">{employee.sessionsHandled || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Net Weekly Pay</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency((employee.weeklySalary || 0) - (employee.currentAdvances || 0))}
                    </p>
                  </div>
                </div>

                {/* Cash Advances */}
                {employee.advances && employee.advances.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Cash Advances History
                      </h4>
                      <div className="space-y-2">
                        {(employee.advances || [])
                          .sort((a: CashAdvance, b: CashAdvance) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((advance: CashAdvance) => (
                            <div 
                              key={advance.id} 
                              className={`flex items-center justify-between p-3 rounded border ${
                                advance.status === 'deducted' ? 'bg-gray-50 opacity-60' : 'bg-white'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium">{formatCurrency(advance.amount)}</span>
                                  <span className="text-sm text-gray-600">{formatDate(new Date(advance.date))}</span>
                                  <Badge variant={advance.status === 'active' ? 'destructive' : 'secondary'}>
                                    {advance.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{advance.description}</p>
                              </div>
                              {advance.status === 'active' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => employee.id && deductAdvance(employee.id, advance.id)}
                                >
                                  Mark as Deducted
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}