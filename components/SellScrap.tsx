import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ActionLoading } from './ui/loading';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Package, 
  Truck, 
  Calculator,
  Receipt,
  Store,
  Edit,
  Check,
  X,
  Copy,
  Camera,
  Upload,
  ImageIcon,
  User
} from 'lucide-react';
import { Transaction, Employee } from '../services/supabaseService';

interface SellScrapProps {
  onBack: () => void;
  onComplete: (transaction: Transaction) => void;
  employees: Employee[];
  generateTransactionId: () => Promise<string>;
  onNavigateToTransaction?: (transactionId: string) => void;
  onSaveDraft?: (transaction: Transaction) => void;
}

interface SellItem {
  id: string;
  name: string;
  weight?: number;
  pieces?: number;
  pricePerUnit: number;
  total: number;
  category: 'scrap' | 'reusable';
  images: string[];
}

interface DeliveryExpense {
  id: string;
  type: string;
  amount: number;
  description: string;
}

export default function SellScrap({ onBack, onComplete, employees, generateTransactionId, onNavigateToTransaction, onSaveDraft }: SellScrapProps) {
  const [sessionType, setSessionType] = useState<'pickup' | 'delivery' | null>(null);
  const [customerType, setCustomerType] = useState<'person' | 'company' | 'government'>('person');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [pendingBackgroundSaves, setPendingBackgroundSaves] = useState(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [items, setItems] = useState<SellItem[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryExpenses, setDeliveryExpenses] = useState<DeliveryExpense[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SellItem | null>(null);
  const [addingMoreWeightFor, setAddingMoreWeightFor] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [transactionId, setTransactionId] = useState<string>('');
  const [draftCreated, setDraftCreated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Generate transaction ID on component mount
  useEffect(() => {
    const generateId = async () => {
      const id = await generateTransactionId();
      setTransactionId(id);
    };
    generateId();
  }, []);

  // Create draft transaction when session type is selected
  const createDraftTransaction = async (selectedSessionType: 'pickup' | 'delivery') => {
    if (!onSaveDraft || draftCreated) return;

    // Ensure we have a transaction ID before creating draft
    let currentTransactionId = transactionId;
    if (!currentTransactionId) {
      currentTransactionId = await generateTransactionId();
      setTransactionId(currentTransactionId);
    }

    const draftTransaction: Transaction = {
      id: currentTransactionId,
      type: 'sell',
      status: 'in-progress',
      timestamp: new Date().toISOString(),
      customerName: '',
      customerType: customerType,
      employee: 'System', // Use default employee for draft
      total: 0,
      subtotal: 0, // Add required subtotal field
      items: [],
      sessionType: selectedSessionType,
      location: selectedSessionType === 'pickup' ? 'shop' : '',
      customerInfo: '',
      deliveryAddress: selectedSessionType === 'delivery' ? '' : undefined,
      sessionImages: [],
      deliveryExpenses: []
    };

    try {
      await onSaveDraft(draftTransaction);
      setDraftCreated(true);
    } catch (error) {
      console.error('Error creating draft transaction:', error);
    }
  };

  // Auto-save current progress
  const autoSaveProgress = async () => {
    if (!onSaveDraft || !draftCreated || !sessionType) return;

    // Ensure we have a transaction ID
    let currentTransactionId = transactionId;
    if (!currentTransactionId) {
      console.error('No transaction ID available for auto-save');
      return;
    }

    console.log('SellScrap auto-saving with items:', items.length, items);

    const mappedItemsForAutoSave = items.map(item => ({
      id: item.id,
      name: `${item.name} (${item.category})`, // Match the format used in completeTransaction
      weight: item.weight || 0,
      pieces: item.pieces || 0,
      price: item.pricePerUnit || 0,
      total: item.total || 0,
      images: item.images || []
    }));

    const currentTransaction: Transaction = {
      id: currentTransactionId,
      type: 'sell',
      status: 'in-progress',
      timestamp: new Date().toISOString(),
      customerName: customerName,
      customerType: customerType,
      employee: selectedEmployees.length > 0 ? selectedEmployees.join(', ') : 'System',
      total: calculateGrandTotal(),
      subtotal: calculateSubtotal(),
      items: mappedItemsForAutoSave,
      sessionType: sessionType,
      location: sessionType === 'pickup' ? 'shop' : deliveryAddress,
      customerInfo: customerInfo,
      deliveryAddress: sessionType === 'delivery' ? deliveryAddress : undefined,
      sessionImages: [...capturedImages, ...sessionImages],
      deliveryExpenses: deliveryExpenses.map(expense => ({
        id: expense.id,
        type: expense.type,
        amount: expense.amount,
        description: expense.description
      }))
    };

    setIsAutoSaving(true);
    
    console.log('🔄 Auto-saving SellScrap transaction:', {
      transactionId: currentTransactionId,
      itemsCount: items.length,
      totalAmount: calculateGrandTotal()
    });

    try {
      await onSaveDraft(currentTransaction);
      setLastSaveTime(new Date());
      console.log('✅ Auto-save successful for SellScrap');
    } catch (error) {
      console.error('❌ Error auto-saving transaction:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Background auto-save every 15 seconds (more frequent for better UX)
  useEffect(() => {
    if (!draftCreated || !sessionType) return;

    console.log('🔄 Starting background auto-save for SellScrap transaction:', transactionId);
    const interval = setInterval(() => {
      console.log('⏰ Background auto-save triggered for SellScrap');
      autoSaveProgress();
    }, 15000); // 15 seconds - more frequent than before

    return () => {
      console.log('🛑 Stopping background auto-save for SellScrap');
      clearInterval(interval);
    };
  }, [draftCreated, sessionType, transactionId]); // Reduced dependencies to prevent too many re-renders

  // Auto-save before page unload/navigation
  useEffect(() => {
    if (!draftCreated) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Attempt to save before leaving
      autoSaveProgress();
      // Don't show confirmation dialog for better UX
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && draftCreated) {
        // Save when tab becomes hidden
        autoSaveProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [draftCreated]);

  // Fire-and-forget save on back navigation (non-blocking)
  const handleBack = () => {
    // Fire the save request in the background without waiting
    if (sessionType && draftCreated) {
      console.log('🚀 Firing background save on back navigation (SellScrap)');
      setPendingBackgroundSaves(prev => prev + 1);
      
      // Don't await - let it run in background
      autoSaveProgress()
        .then(() => {
          console.log('✅ Background save completed on navigation');
          setPendingBackgroundSaves(prev => Math.max(0, prev - 1));
        })
        .catch(error => {
          console.error('❌ Background save failed on navigation:', error);
          setPendingBackgroundSaves(prev => Math.max(0, prev - 1));
        });
    }
    
    // Navigate immediately without waiting for save
    if (sessionType) {
      // If we're in a session, go back to session selection
      setSessionType(null);
    } else {
      // If we're in session selection, go back to dashboard
      onBack();
    }
  };
  
  const [newItem, setNewItem] = useState({
    name: '',
    weight: '',
    pieces: '',
    pricePerUnit: '',
    inputType: 'weight' as 'weight' | 'pieces',
    category: 'scrap' as 'scrap' | 'reusable'
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const calculateSubtotal = () => 
    items.reduce((sum, item) => sum + item.total, 0);

  const calculateDeliveryExpenses = () => 
    deliveryExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const calculateGrandTotal = () => 
    calculateSubtotal() - calculateDeliveryExpenses();

  // Group items by name and category for display
  const groupedItems = items.reduce((groups, item) => {
    const key = `${item.name}_${item.category}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, SellItem[]>);

  const handleImageCapture = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSessionImageCapture = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSessionImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditImageCapture = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditingImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const captureImageFromCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "environment";
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  };

  const captureSessionImageFromCamera = () => {
    if (sessionFileInputRef.current) {
      sessionFileInputRef.current.accept = "image/*";
      sessionFileInputRef.current.capture = "environment";
      sessionFileInputRef.current.multiple = true;
      sessionFileInputRef.current.click();
    }
  };

  const uploadImageFromGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.multiple = true;
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const uploadSessionImageFromGallery = () => {
    if (sessionFileInputRef.current) {
      sessionFileInputRef.current.accept = "image/*";
      sessionFileInputRef.current.multiple = true;
      sessionFileInputRef.current.removeAttribute('capture');
      sessionFileInputRef.current.click();
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeSessionImage = (index: number) => {
    setSessionImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleEmployee = (employeeName: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeName)
        ? prev.filter(name => name !== employeeName)
        : [...prev, employeeName]
    );
  };

  const addItem = () => {
    if (!newItem.name.trim() || !newItem.pricePerUnit) return;

    const quantity = newItem.inputType === 'weight' 
      ? parseFloat(newItem.weight || '0')
      : parseInt(newItem.pieces || '0');
    
    if (quantity <= 0) return;

    const pricePerUnit = parseFloat(newItem.pricePerUnit);
    const total = quantity * pricePerUnit;

    const item: SellItem = {
      id: crypto.randomUUID(),
      name: newItem.name.trim(),
      [newItem.inputType]: quantity,
      pricePerUnit,
      total,
      category: newItem.category,
      images: [...capturedImages]
    };

    setItems([...items, item]);
    setNewItem({
      name: '',
      weight: '',
      pieces: '',
      pricePerUnit: '',
      inputType: 'weight',
      category: 'scrap'
    });
    setCapturedImages([]);
    setAddingMoreWeightFor(null);
  };

  const addMoreWeight = (existingItem: SellItem) => {
    setNewItem({
      name: existingItem.name,
      weight: existingItem.weight !== undefined ? '' : newItem.weight,
      pieces: existingItem.pieces !== undefined ? '' : newItem.pieces,
      pricePerUnit: existingItem.pricePerUnit.toString(),
      inputType: existingItem.weight !== undefined ? 'weight' : 'pieces',
      category: existingItem.category
    });
    setAddingMoreWeightFor(`${existingItem.name} (${existingItem.category})`);
    
    const addItemCard = document.querySelector('[data-add-item-card]');
    if (addItemCard) {
      addItemCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const cancelAddMoreWeight = () => {
    setAddingMoreWeightFor(null);
    setNewItem({
      name: '',
      weight: '',
      pieces: '',
      pricePerUnit: '',
      inputType: 'weight',
      category: 'scrap'
    });
    setCapturedImages([]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const startEditingItem = (item: SellItem) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item });
    setEditingImages([...item.images]);
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItem(null);
    setEditingImages([]);
  };

  const saveEditedItem = () => {
    if (!editingItem || !editingItem.name.trim()) return;

    const quantity = editingItem.weight || editingItem.pieces || 0;
    const updatedItem = {
      ...editingItem,
      name: editingItem.name.trim(),
      total: quantity * editingItem.pricePerUnit,
      images: [...editingImages]
    };

    setItems(items.map(item => 
      item.id === editingItem.id ? updatedItem : item
    ));

    setEditingItemId(null);
    setEditingItem(null);
    setEditingImages([]);
  };

  const updateEditingItem = (field: keyof SellItem, value: string | number) => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem, [field]: value };
    
    if (field === 'weight' || field === 'pieces' || field === 'pricePerUnit') {
      const quantity = updatedItem.weight || updatedItem.pieces || 0;
      updatedItem.total = quantity * updatedItem.pricePerUnit;
    }

    setEditingItem(updatedItem);
  };

  const addDeliveryExpense = () => {
    const expense: DeliveryExpense = {
      id: crypto.randomUUID(),
      type: 'Fuel',
      amount: 0,
      description: ''
    };
    setDeliveryExpenses([...deliveryExpenses, expense]);
  };

  const updateDeliveryExpense = (id: string, field: keyof DeliveryExpense, value: string | number) => {
    setDeliveryExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
  };

  const removeDeliveryExpense = (id: string) => {
    setDeliveryExpenses(prev => prev.filter(expense => expense.id !== id));
  };

  const completeTransaction = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Creating transaction...');

      console.log('SellScrap completing transaction with items:', items.length, items);

      const mappedItems = items.map(item => ({
        id: item.id,
        name: `${item.name} (${item.category})`,
        weight: item.weight,
        pieces: item.pieces,
        price: item.pricePerUnit,
        total: item.total,
        images: item.images
      }));

      const transaction: Transaction = {
        id: transactionId,
        type: 'sell',
        customerType,
        customerName: customerName.trim() || undefined,
        items: mappedItems,
        subtotal: calculateSubtotal(),
        total: calculateGrandTotal(),
        expenses: calculateDeliveryExpenses(),
        employee: selectedEmployees.join(', '), // For backward compatibility
        status: 'for-payment',
        location: sessionType === 'delivery' ? deliveryAddress : undefined,
        timestamp: new Date().toISOString(),
        isDelivery: sessionType === 'delivery',
        sessionImages: sessionImages.length > 0 ? sessionImages : undefined
      };

      console.log('SellScrap final transaction object:', transaction);

      await onComplete(transaction);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onNavigateToTransaction) {
          onNavigateToTransaction(transaction.id);
        }
      }, 2000);
    } catch (error) {
      console.error('Error completing transaction:', error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionType) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Sell Scrap</h1>
        </div>

        <div className="space-y-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300"
            onClick={() => {
              setSessionType('pickup');
              createDraftTransaction('pickup');
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Pickup at Shop</h3>
                  <p className="text-gray-600">Customer picks up items from the shop</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
            onClick={() => {
              setSessionType('delivery');
              createDraftTransaction('delivery');
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Delivery to Customer</h3>
                  <p className="text-gray-600">Deliver items to customer location</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleImageCapture(e.target.files)}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={sessionFileInputRef}
        onChange={(e) => e.target.files && handleSessionImageCapture(e.target.files)}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={editFileInputRef}
        onChange={(e) => e.target.files && handleEditImageCapture(e.target.files)}
        className="hidden"
        multiple
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {sessionType === 'pickup' ? 'Shop Pickup Sale' : 'Delivery Sale'}
            </h1>
            <Badge variant="secondary" className="mt-1">
              {sessionType === 'pickup' ? 'Customer Pickup' : 'Delivery Required'}
            </Badge>
          </div>
        </div>
        
        {/* Auto-save Status Indicator */}
        {draftCreated && (
          <div className="flex items-center space-x-2 text-xs mr-4">
            {isAutoSaving || pendingBackgroundSaves > 0 ? (
              <div className="flex items-center space-x-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>
                  {isAutoSaving ? 'Saving...' : `${pendingBackgroundSaves} pending save${pendingBackgroundSaves > 1 ? 's' : ''}...`}
                </span>
              </div>
            ) : lastSaveTime ? (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Saved {lastSaveTime.toLocaleTimeString()}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Draft mode</span>
              </div>
            )}
          </div>
        )}
        
        {/* Transaction ID Display */}
        <div className="text-right">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {transactionId}
          </Badge>
          <p className="text-sm text-gray-600 mt-1">Transaction ID</p>
        </div>
      </div>

      {/* Session Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Individual Person</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Customer Name (Optional)</Label>
              <Input
                placeholder="Enter customer name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
          </div>

          {sessionType === 'delivery' && (
            <div>
              <Label>Delivery Address</Label>
              <Textarea
                placeholder="Enter complete delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div>
            <Label>Assigned Employees</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {employees.map(employee => (
                <Button
                  key={employee.id}
                  variant={selectedEmployees.includes(employee.name) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleEmployee(employee.name)}
                  className="justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  {employee.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Session Photos</span>
            <Badge variant="secondary">{sessionImages.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={captureSessionImageFromCamera}>
              <Camera className="h-4 w-4 mr-2" />
              Take Photos
            </Button>
            <Button variant="outline" onClick={uploadSessionImageFromGallery}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
            </Button>
          </div>
          
          {sessionImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sessionImages.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Session ${index + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeSessionImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Items */}
      <Card data-add-item-card className={addingMoreWeightFor ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add Items for Sale</span>
            {addingMoreWeightFor && (
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-blue-500">
                  Adding more: {addingMoreWeightFor}
                </Badge>
                <Button variant="ghost" size="sm" onClick={cancelAddMoreWeight}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={newItem.category}
                onValueChange={(value: 'scrap' | 'reusable') => setNewItem({...newItem, category: value, name: ''})}
                disabled={!!addingMoreWeightFor}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scrap">Scrap Material</SelectItem>
                  <SelectItem value="reusable">Reusable Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="Enter item name..."
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                disabled={!!addingMoreWeightFor}
              />
            </div>

            <div>
              <Label>Unit Type</Label>
              <Select
                value={newItem.inputType}
                onValueChange={(value: 'weight' | 'pieces') => setNewItem({...newItem, inputType: value})}
                disabled={!!addingMoreWeightFor}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">By Weight (kg)</SelectItem>
                  <SelectItem value="pieces">By Pieces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{newItem.inputType === 'weight' ? 'Weight (kg)' : 'Pieces'}</Label>
              <Input
                type="number"
                step="0.1"
                placeholder={newItem.inputType === 'weight' ? '0.0' : '0'}
                value={newItem.inputType === 'weight' ? newItem.weight : newItem.pieces}
                onChange={(e) => setNewItem({
                  ...newItem,
                  [newItem.inputType]: e.target.value
                })}
                className={addingMoreWeightFor ? 'ring-2 ring-blue-400' : ''}
              />
            </div>

            <div>
              <Label>Price per {newItem.inputType === 'weight' ? 'kg' : 'piece'}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newItem.pricePerUnit}
                onChange={(e) => setNewItem({...newItem, pricePerUnit: e.target.value})}
                disabled={!!addingMoreWeightFor}
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={addItem} 
                className={`w-full ${addingMoreWeightFor ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingMoreWeightFor ? 'Add More' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Image Capture Section */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <span>Item Photos</span>
              <Badge variant="secondary">{capturedImages.length}</Badge>
            </Label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={captureImageFromCamera}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photos
              </Button>
              <Button type="button" variant="outline" onClick={uploadImageFromGallery}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </div>
            
            {capturedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {capturedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={image} 
                      alt={`Item ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items in Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([itemKey, itemGroup]) => {
                const firstItem = itemGroup[0];
                const totalWeight = itemGroup.reduce((sum, item) => sum + (item.weight || 0), 0);
                const totalPieces = itemGroup.reduce((sum, item) => sum + (item.pieces || 0), 0);
                const totalValue = itemGroup.reduce((sum, item) => sum + item.total, 0);
                const isWeight = firstItem.weight !== undefined;
                const totalImages = itemGroup.reduce((sum, item) => sum + item.images.length, 0);

                return (
                  <div key={itemKey} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    {/* Group Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-lg">{firstItem.name}</h4>
                          <Badge variant={firstItem.category === 'scrap' ? 'secondary' : 'default'} className="text-xs">
                            {firstItem.category}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            Total: {isWeight ? `${totalWeight} kg` : `${totalPieces} pieces`}
                          </span>
                          <span>Value: {formatCurrency(totalValue)}</span>
                          <span>Entries: {itemGroup.length}</span>
                          <span>Photos: {totalImages}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addMoreWeight(firstItem)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Add More Weight
                      </Button>
                    </div>

                    {/* Individual Entries */}
                    <div className="space-y-2">
                      {itemGroup.map((item, index) => (
                        <div key={item.id} className="p-2 bg-gray-50 rounded">
                          {editingItemId === item.id && editingItem ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div>
                                  <Label className="text-sm">Category</Label>
                                  <Select
                                    value={editingItem.category}
                                    onValueChange={(value: 'scrap' | 'reusable') => {
                                      updateEditingItem('category', value);
                                      updateEditingItem('name', ''); // Reset name when category changes
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="scrap">Scrap Material</SelectItem>
                                      <SelectItem value="reusable">Reusable Item</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-sm">Item Name</Label>
                                  <Input
                                    placeholder="Enter item name..."
                                    value={editingItem.name}
                                    onChange={(e) => updateEditingItem('name', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-sm">
                                    {editingItem.weight !== undefined ? 'Weight (kg)' : 'Pieces'}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-sm"
                                    value={editingItem.weight !== undefined ? editingItem.weight : editingItem.pieces}
                                    onChange={(e) => updateEditingItem(
                                      editingItem.weight !== undefined ? 'weight' : 'pieces',
                                      parseFloat(e.target.value) || 0
                                    )}
                                  />
                                </div>

                                <div>
                                  <Label className="text-sm">
                                    Price per {editingItem.weight !== undefined ? 'kg' : 'piece'}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-sm"
                                    value={editingItem.pricePerUnit}
                                    onChange={(e) => updateEditingItem('pricePerUnit', parseFloat(e.target.value) || 0)}
                                  />
                                </div>

                                <div>
                                  <Label className="text-sm">Total</Label>
                                  <div className="h-8 px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                                    {formatCurrency(editingItem.total)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end space-x-2">
                                <Button size="sm" variant="outline" onClick={cancelEditingItem}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={saveEditedItem}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {item.images.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {item.images.slice(0, 3).map((image, imgIndex) => (
                                      <img 
                                        key={imgIndex}
                                        src={image} 
                                        alt="Item" 
                                        className="w-12 h-12 object-cover rounded border-2 border-white"
                                      />
                                    ))}
                                    {item.images.length > 3 && (
                                      <div className="w-12 h-12 bg-gray-200 rounded border-2 border-white flex items-center justify-center text-xs">
                                        +{item.images.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">#{index + 1}</span>
                                    <span className="text-sm">
                                      {item.weight ? `${item.weight} kg` : `${item.pieces} pieces`} × {formatCurrency(item.pricePerUnit)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-green-600">{formatCurrency(item.total)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditingItem(item)}
                                  className="h-6 w-6 text-blue-500 hover:text-blue-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(item.id)}
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Expenses */}
      {sessionType === 'delivery' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Delivery Expenses
              <Button variant="outline" size="sm" onClick={addDeliveryExpense}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveryExpenses.length > 0 ? (
              <div className="space-y-3">
                {deliveryExpenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-4 gap-3 items-center">
                    <Select
                      value={expense.type}
                      onValueChange={(value) => updateDeliveryExpense(expense.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Toll">Toll</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Helper">Helper</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={expense.amount || ''}
                      onChange={(e) => updateDeliveryExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      placeholder="Description"
                      value={expense.description}
                      onChange={(e) => updateDeliveryExpense(expense.id, 'description', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDeliveryExpense(expense.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No delivery expenses added</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Transaction Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal ({items.length} entries, {Object.keys(groupedItems).length} item types)</span>
              <span className="text-green-600">{formatCurrency(calculateSubtotal())}</span>
            </div>
            
            {sessionType === 'delivery' && deliveryExpenses.length > 0 && (
              <div className="flex justify-between">
                <span>Delivery Expenses</span>
                <span className="text-red-600">-{formatCurrency(calculateDeliveryExpenses())}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-semibold">
              <span>Net Total</span>
              <span className="text-green-600">{formatCurrency(calculateGrandTotal())}</span>
            </div>

            <Button 
              onClick={completeTransaction}
              disabled={selectedEmployees.length === 0 || editingItemId !== null}
              className="w-full"
              size="lg"
            >
              <Receipt className="h-5 w-5 mr-2" />
              Complete Sale
            </Button>
          </CardContent>
        </Card>
      )}

      <ActionLoading
        isLoading={isLoading}
        success={showSuccess}
        error={showError}
        message={loadingMessage}
        successMessage="Transaction created successfully!"
        errorMessage="Failed to create transaction"
        onClose={() => {
          setShowSuccess(false);
          setShowError(false);
        }}
      />
    </div>
  );
}