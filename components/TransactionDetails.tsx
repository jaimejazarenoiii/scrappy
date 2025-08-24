import { Key, useState, useEffect } from 'react';
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from './ui/dropdown-menu';
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
  XCircle,
  Printer,
  ChevronDown,
  Download,
  Loader2
} from 'lucide-react';
import { Transaction, Employee } from '../services/supabaseService';

interface TransactionDetailsProps {
  transaction: Transaction;
  onBack: () => void;
  onUpdate: (updatedTransaction: Transaction) => void;
  onUpdateStatus?: (updatedTransaction: Transaction) => void; // Optimized for status-only updates
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
  onUpdateStatus,
  readOnly = false,
  userRole = 'owner'
}: TransactionDetailsProps) {
  console.log('TransactionDetails received transaction:', {
    id: transaction.id,
    type: transaction.type,
    subtotal: transaction.subtotal,
    total: transaction.total,
    expenses: transaction.expenses,
    itemsCount: transaction.items?.length || 0,
    items: transaction.items
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction>({ ...transaction });
  const [editedItems, setEditedItems] = useState<EditableItem[]>(
    transaction.items.map((item, index) => {
      console.log('Processing transaction item:', item);
      
      // Ensure item has a proper total calculated
      const quantity = item.weight || item.pieces || 0;
      const calculatedTotal = (item.price || 0) * quantity;
      const finalTotal = item.total || calculatedTotal;
      
      console.log(`Item ${item.name}: price=${item.price}, quantity=${quantity}, stored_total=${item.total}, calculated_total=${calculatedTotal}, final_total=${finalTotal}`);
      
      return {
      id: `item-${index}`,
        ...item,
        total: finalTotal // Ensure total is properly calculated
      };
    })
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(transaction.status);

  // Sync currentStatus when transaction prop changes
  useEffect(() => {
    setCurrentStatus(transaction.status);
  }, [transaction.status]);

  // Update transaction totals when items change during editing
  useEffect(() => {
    if (isEditing) {
      const newSubtotal = calculateItemSubtotal();
      const newTotal = calculateTransactionTotal();
      
      setEditedTransaction(prev => ({
        ...prev,
        subtotal: newSubtotal,
        total: newTotal
      }));
      
      console.log('🔄 Updated transaction totals during editing - subtotal:', newSubtotal, 'total:', newTotal);
    }
  }, [editedItems, isEditing]);

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

  const getStatusBadge = (status?: import('../App').TransactionStatus) => {
    const statusToUse = status || currentStatus;
    switch (statusToUse) {
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
    const canPrint = currentStatus === 'completed';
    console.log('🖨️ canPrintReceipt check: currentStatus =', currentStatus, ', canPrint =', canPrint);
    return canPrint;
  };

  const canProcessPayment = () => {
    return currentStatus === 'for-payment';
  };

  const canCancel = () => {
    return currentStatus !== 'cancelled' && currentStatus !== 'completed';
  };



  const handleMarkAsPaid = async () => {
    try {
      setIsMarkingPaid(true);
      const updatedTransaction = {
        ...transaction,
        status: 'completed' as const,
        completedAt: new Date().toISOString()
      };
      
      // Update local status immediately for UI responsiveness
      console.log('🔄 Updating status from', currentStatus, 'to completed');
      setCurrentStatus('completed');
      
      // Use optimized status update if available, otherwise fall back to full update
      if (onUpdateStatus) {
        console.log('🚀 Using optimized status update method');
        await onUpdateStatus(updatedTransaction);
      } else {
        console.log('⚠️ Using full transaction update method (slower)');
        await onUpdate(updatedTransaction);
      }
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      // Revert status if update failed
      setCurrentStatus(transaction.status);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const printThermalReceipt = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      alert('Please allow popups to print receipts');
      return;
    }

    // Generate thermal receipt HTML
    const receiptHtml = generateThermalReceiptHtml();
    
    // Write the receipt HTML to the new window
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Trigger print dialog
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Close the window after printing (optional)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const generateESCPOSCommands = () => {
    const subtotal = getDisplaySubtotal();
    
    const receiptDate = new Date(transaction.timestamp).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // ESC/POS commands for thermal printers
    let escpos = '';
    
    // Initialize printer
    escpos += '\x1B\x40'; // ESC @ - Initialize printer
    
    // Set character size and alignment
    escpos += '\x1B\x21\x08'; // ESC ! - Set character size (double height)
    escpos += '\x1B\x61\x01'; // ESC a - Center alignment
    
    // Print header
    escpos += 'JUNKSHOP MANAGEMENT\n';
    escpos += '\x1B\x21\x00'; // Normal character size
    escpos += 'Scrap Metal & Materials\n';
    escpos += 'Receipt\n';
    escpos += '================================\n';
    
    // Left alignment for details
    escpos += '\x1B\x61\x00'; // ESC a - Left alignment
    
    // Transaction info
    escpos += `Receipt #: ${transaction.id.slice(-8).toUpperCase()}\n`;
    escpos += `Date: ${receiptDate}\n`;
    escpos += `Type: ${transaction.type === 'buy' ? 'PURCHASE' : 'SALE'}\n`;
    escpos += `Employee: ${transaction.employee}\n`;
    
    if (transaction.customerName) {
      escpos += `Customer: ${transaction.customerName}\n`;
    }
    
    if (transaction.location) {
      escpos += `Location: ${transaction.location}\n`;
    }
    
    escpos += '--------------------------------\n';
    escpos += 'ITEMS:\n';
    escpos += '--------------------------------\n';
    
    // Items
    transaction.items.forEach(item => {
      const quantity = item.weight ? `${item.weight} kg` : `${item.pieces} pcs`;
      const itemTotal = item.total || ((item.weight || item.pieces || 0) * item.price);
      
      escpos += `${item.name}\n`;
      escpos += `  ${quantity} x ${formatCurrency(item.price)}\n`;
      escpos += `${' '.repeat(32 - formatCurrency(itemTotal).length)}${formatCurrency(itemTotal)}\n`;
    });
    
    escpos += '================================\n';
    
    // Customer totals (internal expenses not shown)
    escpos += `Subtotal:${' '.repeat(32 - 9 - formatCurrency(subtotal).length)}${formatCurrency(subtotal)}\n`;
    escpos += '================================\n';
    
    // Grand total (use subtotal as customer total, no internal expenses)
    escpos += '\x1B\x21\x08'; // Double height
    const totalLabel = `TOTAL ${transaction.type === 'buy' ? 'PAID:' : 'RECEIVED:'}`;
    escpos += `${totalLabel}\n`;
    escpos += `${formatCurrency(subtotal)}\n`;
    escpos += '\x1B\x21\x00'; // Normal size
    
    escpos += '================================\n';
    
    // Footer
    escpos += '\x1B\x61\x01'; // Center alignment
    escpos += 'Thank you for your business!\n';
    escpos += `Status: ${transaction.status.toUpperCase()}\n`;
    escpos += `${new Date().toLocaleDateString('en-PH')} ${new Date().toLocaleTimeString('en-PH')}\n`;
    
    // Cut paper and eject
    escpos += '\x1B\x64\x03'; // Feed 3 lines
    escpos += '\x1D\x56\x41'; // Cut paper
    
    return escpos;
  };

  const downloadESCPOSFile = () => {
    const escposData = generateESCPOSCommands();
    const blob = new Blob([escposData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${transaction.id.slice(-8)}.prn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    alert('ESC/POS file downloaded! Send this file directly to your thermal printer.');
  };

  const generateThermalReceiptHtml = () => {
    const receiptDate = new Date(transaction.timestamp).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const subtotal = getDisplaySubtotal();

    // Generate items list
    const itemsHtml = transaction.items.map(item => {
      const quantity = item.weight ? `${item.weight} kg` : `${item.pieces} pcs`;
      const itemTotal = item.total || ((item.weight || item.pieces || 0) * item.price);
      
      return `
        <tr>
          <td style="padding: 2px 0; font-size: 11px; vertical-align: top;">${item.name}</td>
          <td style="padding: 2px 0; font-size: 11px; text-align: right; vertical-align: top;">${formatCurrency(itemTotal)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 0 0 4px 0; font-size: 10px; color: #666;">
            ${quantity} × ${formatCurrency(item.price)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.id}</title>
        <style>
          /* Thermal printer optimized styles */
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            background: white;
            color: black;
            width: 58mm; /* Standard thermal paper width */
            max-width: 58mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          
          .shop-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .shop-info {
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 2px;
          }
          
          .receipt-info {
            margin-bottom: 12px;
            font-size: 11px;
          }
          
          .receipt-info div {
            margin-bottom: 2px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          
          .items-header {
            border-bottom: 1px dashed #000;
            margin-bottom: 4px;
          }
          
          .totals {
            border-top: 1px dashed #000;
            padding-top: 6px;
            font-size: 11px;
          }
          
          .totals .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          
          .grand-total {
            font-weight: bold;
            font-size: 13px;
            border-top: 1px solid #000;
            padding-top: 4px;
            margin-top: 4px;
          }
          
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 4px;
              -webkit-print-color-adjust: exact;
            }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">JUNKSHOP MANAGEMENT</div>
          <div class="shop-info">Scrap Metal & Materials</div>
          <div class="shop-info">Receipt</div>
        </div>

        <div class="receipt-info">
          <div><strong>Receipt #:</strong> ${transaction.id.slice(-8).toUpperCase()}</div>
          <div><strong>Date:</strong> ${receiptDate}</div>
          <div><strong>Type:</strong> ${transaction.type === 'buy' ? 'PURCHASE' : 'SALE'}</div>
          <div><strong>Employee:</strong> ${transaction.employee}</div>
          ${transaction.customerName ? `<div><strong>Customer:</strong> ${transaction.customerName}</div>` : ''}
          ${transaction.location ? `<div><strong>Location:</strong> ${transaction.location}</div>` : ''}
        </div>

        <div class="items-header">
          <strong>ITEMS:</strong>
        </div>
        
        <table class="items-table">
          ${itemsHtml}
        </table>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          
          <div class="total-line grand-total">
            <span>TOTAL ${transaction.type === 'buy' ? 'PAID:' : 'RECEIVED:'}</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div style="margin-top: 8px; font-size: 9px;">
            Transaction Status: ${transaction.status.toUpperCase()}
          </div>
          <div style="margin-top: 4px; font-size: 9px;">
            ${new Date().toLocaleDateString('en-PH')} ${new Date().toLocaleTimeString('en-PH')}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const calculateItemSubtotal = () => {
    const subtotal = editedItems.reduce((sum, item) => {
      // Calculate total from price and quantity if total is missing/zero
      let itemTotal = item.total || 0;
      
      if (!itemTotal && item.price) {
        const quantity = item.weight || item.pieces || 0;
        itemTotal = item.price * quantity;
        console.log(`Calculating missing total for item ${item.name}: ${item.price} * ${quantity} = ${itemTotal}`);
      }
      
      console.log(`Item: ${item.name}, stored total: ${item.total}, calculated total: ${itemTotal}, price: ${item.price}, weight: ${item.weight}, pieces: ${item.pieces}`);
      return sum + itemTotal;
    }, 0);
    console.log('Final calculated subtotal:', subtotal, 'from items:', editedItems);
    return subtotal;
  };

  const calculateTransactionTotal = () => {
    const itemSubtotal = calculateItemSubtotal();
    const expenses = editedTransaction.expenses || 0;
    
    // For sell transactions, expenses are deducted
    const total = transaction.type === 'sell' 
      ? itemSubtotal - expenses 
      : itemSubtotal + expenses;
      
    console.log('Calculated transaction total:', total, '= itemSubtotal:', itemSubtotal, (transaction.type === 'sell' ? '-' : '+'), 'expenses:', expenses);
    return total;
  };

  // Use calculated totals if stored totals are zero or invalid
  const getDisplaySubtotal = () => {
    const storedSubtotal = transaction.subtotal || 0;
    const calculatedSubtotal = calculateItemSubtotal();
    
    // If stored subtotal is zero but we have items with prices, use calculated
    if (!storedSubtotal && calculatedSubtotal > 0) {
      console.log('Using calculated subtotal instead of stored zero subtotal');
      return calculatedSubtotal;
    }
    
    return storedSubtotal;
  };

  const getDisplayTotal = () => {
    const storedTotal = transaction.total || 0;
    const calculatedTotal = calculateTransactionTotal();
    
    // If stored total is zero but we have items with prices, use calculated
    if (!storedTotal && calculatedTotal > 0) {
      console.log('Using calculated total instead of stored zero total');
      return calculatedTotal;
    }
    
    return storedTotal;
  };

  const updateItem = (itemId: string, field: keyof EditableItem, value: string | number) => {
    console.log('🔄 Updating item:', itemId, 'field:', field, 'value:', value);
    
    setEditedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total when quantity or price changes
          if (field === 'weight' || field === 'pieces' || field === 'price') {
            const quantity = updatedItem.weight || updatedItem.pieces || 0;
            const price = updatedItem.price || 0;
            const newTotal = quantity * price;
            updatedItem.total = newTotal;
            console.log(`📊 Recalculated total for ${item.name}: ${quantity} × ${price} = ${newTotal}`);
          }
          
          return updatedItem;
        }
        return item;
      });
      
      console.log('✅ Updated items state:', updated);
      return updated;
    });
  };

  const addNewItem = () => {
    const newItem: EditableItem = {
      id: crypto.randomUUID(),
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

  const saveChanges = async () => {
    try {
      setIsSavingChanges(true);
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
        timestamp: editedTransaction.timestamp // Keep as string for supabase interface
    };

      await onUpdate(updatedTransaction);
    setIsEditing(false);
    } catch (error) {
      console.error('Error saving transaction changes:', error);
    } finally {
      setIsSavingChanges(false);
    }
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Print Receipt
                      <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={printThermalReceipt}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print HTML Receipt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={downloadESCPOSFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download ESC/POS File
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Simple Payment Toggle Button for Owners */}
              {userRole === 'owner' && currentStatus === 'for-payment' && (
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                >
                  {isMarkingPaid ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {isMarkingPaid ? 'Marking as Paid...' : 'Mark as Paid'}
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
                disabled={!hasChanges() || isSavingChanges}
              >
                {isSavingChanges ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                <Save className="h-4 w-4 mr-2" />
                )}
                {isSavingChanges ? 'Saving Changes...' : 'Save Changes'}
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
                  {formatDateTime(new Date(transaction.timestamp))}
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
                    {getStatusBadge()}
                    {currentStatus === 'for-payment' && userRole !== 'owner' && (
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
                <span>{formatCurrency(isEditing ? calculateItemSubtotal() : getDisplaySubtotal())}</span>
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
                  {formatCurrency(isEditing ? calculateTransactionTotal() : getDisplayTotal())}
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
                          min="0"
                          value={item.weight !== undefined ? item.weight : item.pieces}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            updateItem(
                              item.id, 
                              item.weight !== undefined ? 'weight' : 'pieces', 
                              isNaN(value) ? 0 : value
                            );
                          }}
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
                          min="0"
                          value={item.price}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            updateItem(item.id, 'price', isNaN(value) ? 0 : value);
                          }}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Total</Label>
                        <div className="mt-1 h-9 px-3 py-2 bg-gray-100 rounded text-sm font-medium flex items-center">
                          {formatCurrency((item.weight || item.pieces || 0) * item.price)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.weight ? `${item.weight} kg` : `${item.pieces} pieces`} × {formatCurrency(item.price)} = {formatCurrency((item.weight || item.pieces || 0) * item.price)}
                        </p>
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