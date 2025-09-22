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
import { supabaseDataService } from '../../infrastructure/database/supabaseService';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Employee, CashAdvance } from '../../infrastructure/database/supabaseService';
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
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [advanceDate, setAdvanceDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    weeklySalary: '',
  });
  const [deductingAdvances, setDeductingAdvances] = useState<Set<string>>(new Set());

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
    console.log('Add Employee button clicked');
    console.log('newEmployee:', newEmployee);
    
    if (!newEmployee.name || !newEmployee.weeklySalary) {
      console.log('Validation failed - missing name or weeklySalary');
      return;
    }

    const weeklySalary = parseFloat(newEmployee.weeklySalary);
    if (isNaN(weeklySalary) || weeklySalary <= 0) {
      console.log('Invalid weekly salary:', newEmployee.weeklySalary);
      return;
    }

    const employee: Employee = {
      id: crypto.randomUUID(),
      name: newEmployee.name,
      role: 'employee',
      phone: '',
      email: '',
      avatar: '',
      weeklySalary: weeklySalary,
      currentAdvances: 0,
      sessionsHandled: 0,
      advances: [],
      businessId: '00000000-0000-0000-0000-000000000001'
    };

    console.log('Creating employee:', employee);
    setIsAddingEmployee(true);
    try {
      await addEmployee(employee);
      setNewEmployee({ name: '', weeklySalary: '' });
      setShowAddEmployee(false);
      console.log('Employee added successfully');
    } catch (error) {
      console.error('Error adding employee:', error);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const removeEmployee = async (id: string) => {
    console.log('=== COMPONENT removeEmployee START ===');
    console.log('Remove employee clicked for ID:', id);
    if (!id) {
      console.error('No employee ID provided');
      return;
    }
    
    setDeletingEmployeeId(id);
    try {
      console.log('Calling deleteEmployee with ID:', id);
      await deleteEmployee(id);
      console.log('Employee deleted successfully in component');
      
      // Refresh stats after deletion
      if (onRefreshStats) {
        console.log('Calling onRefreshStats...');
        await onRefreshStats();
        console.log('onRefreshStats completed');
      }
      
      // Force component refresh
      console.log('Forcing component refresh...');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error removing employee:', error);
      
      // If database delete fails, try to remove from local state anyway for testing
      console.log('Database delete failed, trying local state removal for testing...');
      // This won't actually work since we can't modify the employees prop directly
      // But it will show us if the issue is with the database or the UI
    } finally {
      setDeletingEmployeeId(null);
      console.log('=== COMPONENT removeEmployee END ===');
    }
  };



  const handleAdvanceSubmit = async () => {
    console.log('Cash advance submit clicked');
    console.log('selectedEmployeeId:', selectedEmployeeId);
    console.log('advanceAmount:', advanceAmount);
    console.log('advanceDescription:', advanceDescription);
    
    if (!selectedEmployeeId || !advanceAmount || !advanceDescription) {
      console.log('Validation failed - missing required fields');
      return;
    }

    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid amount:', advanceAmount);
      return;
    }

    const advance: CashAdvance = {
      id: crypto.randomUUID(),
      employeeId: selectedEmployeeId,
      amount: amount,
      date: advanceDate.toISOString(),
      description: advanceDescription,
      status: 'active',
      businessId: '00000000-0000-0000-0000-000000000001'
    };

    console.log('Creating cash advance:', advance);
    setIsAddingAdvance(true);
    try {
      await onAddAdvance(selectedEmployeeId, advance);
      console.log('Cash advance added successfully');
      
      // Reset form
      setAdvanceAmount('');
      setAdvanceDescription('');
      setAdvanceDate(new Date());
      setSelectedEmployeeId('');
      setShowAdvanceDialog(false);
    } catch (error) {
      console.error('Error adding cash advance:', error);
    } finally {
      setIsAddingAdvance(false);
    }
  };

  const deductAdvance = async (employeeId: string, advanceId: string) => {
    if (!onUpdateAdvanceStatus) return;
    
    try {
      setDeductingAdvances(prev => new Set(prev).add(advanceId));
      await onUpdateAdvanceStatus(advanceId, 'deducted', employeeId);
    } catch (error) {
      console.error('Error deducting advance:', error);
    } finally {
      setDeductingAdvances(prev => {
        const newSet = new Set(prev);
        newSet.delete(advanceId);
        return newSet;
      });
    }
  };

  const getTotalWeeklySalaries = () => 
    employees.reduce((total, emp) => total + (emp.weeklySalary || 0), 0);

  const getTotalAdvances = () => 
    employees.reduce((total, emp) => total + (emp.currentAdvances || 0), 0);

  return (
    <div className="min-h-screen relative">
      
      <div className="relative z-10 p-4 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Employee Management</h1>
          </div>
        
        <div className="flex space-x-3">
          {onRefreshStats && (
            <Button 
              variant="outline"
              onClick={() => onRefreshStats()}
              className="text-white border-white/20 hover:bg-white/20 bg-white/10"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          )}
          
          <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/20 bg-white/10">
                <DollarSign className="h-4 w-4 mr-2" />
                Cash Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white/10 backdrop-blur-xl border border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white">Add Cash Advance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Employee</Label>
                  <select 
                    className="w-full p-2 border border-white/20 rounded bg-white/10 text-white disabled:opacity-50"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    disabled={isAddingAdvance}
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label className="text-white">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    disabled={isAddingAdvance}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Date</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/10 border-white/20 text-white",
                          !advanceDate && "text-gray-300"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {advanceDate ? format(advanceDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white/10 backdrop-blur-xl border border-white/20" align="start">
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
                        className="bg-white/10 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    placeholder="Reason for advance..."
                    value={advanceDescription}
                    onChange={(e) => setAdvanceDescription(e.target.value)}
                    rows={3}
                    disabled={isAddingAdvance}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 disabled:opacity-50"
                  />
                </div>
                
                <Button 
                  onClick={handleAdvanceSubmit}
                  disabled={!selectedEmployeeId || !advanceAmount || !advanceDescription || isAddingAdvance}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingAdvance ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Advance'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => {
              console.log('Add Employee button clicked - opening form');
              setShowAddEmployee(true);
            }} 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-200">Total Employees</p>
                <p className="text-2xl font-bold text-white">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-200">Weekly Payroll</p>
                <p className="text-2xl font-bold text-green-200">{formatCurrency(getTotalWeeklySalaries())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-200">Total Advances</p>
                <p className="text-2xl font-bold text-orange-200">{formatCurrency(getTotalAdvances())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Form */}
      {showAddEmployee && (
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="text-white">Add New Employee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Employee Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  disabled={isAddingEmployee}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 disabled:opacity-50"
                />
              </div>
              <div>
                <Label className="text-white">Weekly Salary</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newEmployee.weeklySalary}
                  onChange={(e) => setNewEmployee({...newEmployee, weeklySalary: e.target.value})}
                  disabled={isAddingEmployee}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleAddEmployee} 
                disabled={!newEmployee.name || !newEmployee.weeklySalary || isNaN(parseFloat(newEmployee.weeklySalary)) || parseFloat(newEmployee.weeklySalary) <= 0 || isAddingEmployee}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingEmployee ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Employee'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddEmployee(false)} 
                disabled={isAddingEmployee}
                className="text-white border-white/20 hover:bg-white/20 bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Refresh Button for Testing */}
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-4">
          <p className="text-sm text-purple-200 mt-2">
            Current employees: {employees.length}
          </p>
        </CardContent>
      </Card>

      {/* Employees List */}
      <div className="space-y-4">
        {employees.map((employee) => (
          <Card key={`${employee.id}-${refreshKey}`} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Employee Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {employee.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{employee.name}</h3>
                      <p className="text-purple-200">Weekly Salary: {formatCurrency(employee.weeklySalary || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-white/10 text-white border border-white/20">
                      {employee.sessionsHandled || 0} sessions
                    </Badge>
                    {(employee.currentAdvances || 0) > 0 && (
                      <Badge variant="destructive" className="bg-red-500/10 text-red-200 border border-red-400/20">
                        {formatCurrency(employee.currentAdvances || 0)} advance
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        console.log('=== DELETE BUTTON CLICKED ===');
                        console.log('Employee object:', employee);
                        console.log('Employee ID:', employee.id);
                        console.log('Employee name:', employee.name);
                        console.log('ID type:', typeof employee.id);
                        console.log('ID is undefined?', employee.id === undefined);
                        console.log('ID is null?', employee.id === null);
                        
                        if (!employee.id) {
                          console.error('No employee ID found!');
                          return;
                        }
                        
                        removeEmployee(employee.id);
                      }}
                      disabled={deletingEmployeeId === employee.id}
                      className="text-red-200 hover:text-red-300 hover:bg-white/20 disabled:opacity-50"
                    >
                      {deletingEmployeeId === employee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                  </div>
                </div>

                {/* Employee Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white/10 rounded border border-white/20">
                    <p className="text-sm text-purple-200">Weekly Salary</p>
                    <p className="font-semibold text-white">{formatCurrency(employee.weeklySalary || 0)}</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded border border-white/20">
                    <p className="text-sm text-purple-200">Current Advances</p>
                    <p className="font-semibold text-red-200">{formatCurrency(employee.currentAdvances || 0)}</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded border border-white/20">
                    <p className="text-sm text-purple-200">Sessions Handled</p>
                    <p className="font-semibold text-white">{employee.sessionsHandled || 0}</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded border border-white/20">
                    <p className="text-sm text-purple-200">Net Weekly Pay</p>
                    <p className="font-semibold text-green-200">
                      {formatCurrency((employee.weeklySalary || 0) - (employee.currentAdvances || 0))}
                    </p>
                  </div>
                </div>

                {/* Cash Advances */}
                {employee.advances && employee.advances.length > 0 && (
                  <>
                    <Separator className="bg-white/20" />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center text-white">
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
                                advance.status === 'deducted' ? 'bg-white/5 opacity-60 border-white/10' : 'bg-white/10 border-white/20'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-white">{formatCurrency(advance.amount)}</span>
                                  <span className="text-sm text-purple-200">{formatDate(new Date(advance.date))}</span>
                                  <Badge variant={advance.status === 'active' ? 'destructive' : 'secondary'} className={advance.status === 'active' ? 'bg-red-500/10 text-red-200 border border-red-400/20' : 'bg-white/10 text-white border border-white/20'}>
                                    {advance.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-purple-200 mt-1">{advance.description}</p>
                              </div>
                              {advance.status === 'active' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => employee.id && deductAdvance(employee.id, advance.id)}
                                  disabled={deductingAdvances.has(advance.id)}
                                  className="text-white border-white/20 hover:bg-white/20 bg-white/10"
                                >
                                  {deductingAdvances.has(advance.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Deducting...
                                    </>
                                  ) : (
                                    'Mark as Deducted'
                                  )}
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
    </div>
  );
}