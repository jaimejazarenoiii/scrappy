import { Key, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Trash2,
  Plus,
  Calculator,
  Clock,
  User,
  MapPin,
  Package,
  ImageIcon,
  AlertCircle,
  Receipt,
  CheckCircle,
  CreditCard,
  XCircle
} from 'lucide-react';
import { Transaction, Employee } from '../App';

interface TransactionDetailsProps {
  transaction: Transaction;
  onBack: () => void;
  onUpdate: (updatedTransaction: Transaction) => void;
  readOnly?: boolean;
  userRole?: 'owner' | 'employee';
}

interface EditableItem {
  id: string;
  name: string;
  weight?: number;
  pieces?: number;
  price: number;
  total: number;
  images?: string[];
}

export default function TransactionDetails({ 
  transaction, 
  onBack, 
  onUpdate,
  readOnly = false,
  userRole = 'owner'
}: TransactionDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction>({ ...transaction });
  const [editedItems, setEditedItems] = useState<EditableItem[]>(
    transaction.items.map((item, index) => ({
      id: `item-${index}`,
      ...item
    }))
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatDateTime = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const getStatusBadge = (status: import('../App').TransactionStatus) => {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'for-payment':
        return <Badge className="bg-blue-100 text-blue-800">For Payment</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const canPrintReceipt = () => {
    return transaction.status === 'completed';
  };

  const canProcessPayment = () => {
    return transaction.status === 'for-payment';
  };

  const canCancel = () => {
    return transaction.status !== 'cancelled' && transaction.status !== 'completed';
  };

  const calculateItemSubtotal = () => 
    editedItems.reduce((sum, item) => sum + item.total, 0);

  const calculateTransactionTotal = () => 
    calculateItemSubtotal() + (editedTransaction.expenses || 0);

  const updateItem = (itemId: string, field: keyof EditableItem, value: string | number) => {
    setEditedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total when quantity or price changes
        if (field === 'weight' || field === 'pieces' || field === 'price') {
          const quantity = updatedItem.weight || updatedItem.pieces || 0;
          updatedItem.total = quantity * updatedItem.price;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addNewItem = () => {
    const newItem: EditableItem = {
      id: `item-${Date.now()}`,
      name: '',
      weight: transaction.type === 'buy' ? 1 : undefined,
      pieces: transaction.type === 'sell' ? 1 : undefined,
      price: 0,
      total: 0
    };
    setEditedItems([...editedItems, newItem]);
  };

  const removeItem = (itemId: string) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const startEditing = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedTransaction({ ...transaction });
    setEditedItems(
      transaction.items.map((item, index) => ({
        id: `item-${index}`,
        ...item
      }))
    );
  };

  const saveChanges = () => {
    const updatedTransaction: Transaction = {
      ...editedTransaction,
      items: editedItems.map(item => ({
        name: item.name,
        weight: item.weight,
        pieces: item.pieces,
        price: item.price,
        total: item.total,
        images: item.images
      })),
      subtotal: calculateItemSubtotal(),
      total: calculateTransactionTotal(),
      timestamp: new Date(editedTransaction.timestamp) // Ensure it's a Date object
    };

    onUpdate(updatedTransaction);
    setIsEditing(false);
  };

  const handleDelete = () => {
    // Delete functionality would be handled by parent component
    console.log('Delete transaction:', transaction.id);
  };

  const hasChanges = () => {
    return JSON.stringify(editedTransaction) !== JSON.stringify(transaction) ||
           JSON.stringify(editedItems.map(item => ({ ...item, id: undefined }))) !== 
           JSON.stringify(transaction.items.map(item => ({ ...item, id: undefined })));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transaction Details</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={transaction.type === 'buy' ? 'destructive' : 'default'}>
                {transaction.type.toUpperCase()}
              </Badge>
              {getStatusBadge(transaction.status)}
              <span className="text-gray-600">#{transaction.id}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!readOnly && !isEditing ? (
            <>
              {canPrintReceipt() && (
                <Button variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              )}
              
              {/* Simple Payment Toggle Button for Owners */}
              {userRole === 'owner' && transaction.status === 'for-payment' && (
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const updatedTransaction = {
                      ...transaction,
                      status: 'completed' as const,
                      completedAt: new Date().toISOString()
                    };
                    onUpdate(updatedTransaction);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              
              <Button variant="outline" onClick={startEditing}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          ) : isEditing && !readOnly ? (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={saveChanges}
                disabled={!hasChanges()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : readOnly ? (
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded">
              {userRole === 'employee' ? 'View Only - Employees cannot edit transactions' : 'Read Only'}
            </div>
          ) : null}
        </div>
      </div>



      {/* Transaction Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Transaction Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDateTime(transaction.timestamp)}
                </p>
              </div>
              <div>
                <Label>Type</Label>
                <p className="text-sm text-gray-600 mt-1 capitalize">
                  {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                {isEditing && userRole === 'owner' ? (
                  <Select 
                    value={editedTransaction.status} 
                    onValueChange={(value: any) => setEditedTransaction({
                      ...editedTransaction, 
                      status: value
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="for-payment">For Payment</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    {getStatusBadge(transaction.status)}
                    {transaction.status === 'for-payment' && userRole !== 'owner' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Only owners can mark transactions as completed
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label>Customer Type</Label>
                {isEditing ? (
                  <Select 
                    value={editedTransaction.customerType} 
                    onValueChange={(value: any) => setEditedTransaction({
                      ...editedTransaction, 
                      customerType: value
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Individual Person</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {transaction.customerType}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Employee</Label>
              <div className="flex items-center space-x-2 mt-1">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{transaction.employee || 'N/A'}</span>
              </div>
            </div>

            {(transaction.location || isEditing) && (
              <div>
                <Label>Location</Label>
                {isEditing ? (
                  <Textarea
                    value={editedTransaction.location || ''}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction, 
                      location: e.target.value
                    })}
                    placeholder="Enter location details..."
                    rows={2}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-600">{transaction.location}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(isEditing ? calculateItemSubtotal() : transaction.subtotal)}</span>
              </div>
              
              {(transaction.expenses || isEditing) && (
                <div className="flex justify-between">
                  <span>Expenses</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedTransaction.expenses || 0}
                      onChange={(e) => setEditedTransaction({
                        ...editedTransaction, 
                        expenses: parseFloat(e.target.value) || 0
                      })}
                      className="w-24 h-8 text-right"
                    />
                  ) : (
                    <span className="text-red-600">
                      {formatCurrency(transaction.expenses || 0)}
                    </span>
                  )}
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className={transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'}>
                  {transaction.type === 'buy' ? '-' : '+'}
                  {formatCurrency(isEditing ? calculateTransactionTotal() : transaction.total)}
                </span>
              </div>

              {/* Special transaction indicators */}
              <div className="flex flex-wrap gap-2">
                {transaction.isPickup && (
                  <Badge variant="secondary">Pickup</Badge>
                )}
                {transaction.isDelivery && (
                  <Badge variant="secondary">Delivery</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Items</span>
            </div>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addNewItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(isEditing ? editedItems : transaction.items.map((item, index) => ({ 
              id: `item-${index}`, 
              ...item 
            }))).map((item, index) => (
              <div key={item.id || index} className="p-4 border rounded-lg">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-sm">Item Name</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          placeholder="Enter item name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">
                          {item.weight !== undefined ? 'Weight (kg)' : 'Pieces'}
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.weight !== undefined ? item.weight : item.pieces}
                          onChange={(e) => updateItem(
                            item.id, 
                            item.weight !== undefined ? 'weight' : 'pieces', 
                            parseFloat(e.target.value) || 0
                          )}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">
                          Price per {item.weight !== undefined ? 'kg' : 'piece'}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Total</Label>
                        <div className="mt-1 h-9 px-3 py-2 bg-gray-100 rounded text-sm font-medium flex items-center">
                          {formatCurrency(item.total)}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-9 w-9 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.weight ? `${item.weight} kg` : `${item.pieces} pieces`} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                    
                    {/* Item Images Gallery */}
                    {item.images && item.images.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="h-4 w-4 text-gray-600" />
                          <Label className="text-sm font-medium">Item Photos</Label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {item.images.map((imageUrl, imgIndex) => (
                            <div 
                              key={imgIndex} 
                              className="aspect-square border rounded-lg overflow-hidden bg-gray-50 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                              onClick={() => window.open(imageUrl, '_blank')}
                            >
                              <img 
                                src={imageUrl} 
                                alt={`${item.name} - Photo ${imgIndex + 1}`} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Images */}
      {transaction.sessionImages && transaction.sessionImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Transaction Photos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Photos taken during this transaction session for documentation and verification purposes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transaction.sessionImages.map((imageUrl: string | URL | undefined, index: Key | null | undefined) => (
                  <div 
                    key={index} 
                    className="aspect-video border rounded-lg overflow-hidden bg-gray-50 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                    onClick={() => {
                      const imageUrlString = typeof imageUrl === 'string' ? imageUrl : imageUrl?.toString();
                      if (imageUrlString?.startsWith('data:')) {
                        // For data URLs, create a blob and open it
                        const link = document.createElement('a');
                        link.href = imageUrlString;
                        link.target = '_blank';
                        link.click();
                      } else {
                        // For regular URLs, use window.open
                        window.open(imageUrlString, '_blank');
                      }
                    }}
                  >
                    <div className="relative w-full h-full">
                      <img 
                        src={typeof imageUrl === 'string' ? imageUrl : imageUrl?.toString()} 
                        alt={`Transaction ${transaction.id} - Photo ${typeof index === 'number' ? index + 1 : 'N/A'}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white rounded-full p-2 shadow-lg">
                            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 text-center">
                Click on any image to view in full size
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}