import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Printer } from 'lucide-react';
import { Transaction } from '../App';

interface ReceiptProps {
  transaction: Transaction;
  onBack: () => void;
}

export default function Receipt({ transaction, onBack }: ReceiptProps) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const printReceipt = () => {
    window.print();
  };

  const itemsWithImages = transaction.items.filter(item => item.image);
  const hasImages = itemsWithImages.length > 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      {/* Header - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Receipt</h1>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          #{transaction.id}
        </Badge>
      </div>

      {/* Receipt Content */}
      <Card className="max-w-80 mx-auto font-mono text-sm print-area">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center border-b-2 border-dashed pb-4">
            <h2 className="text-lg font-bold">JUNKSHOP MANAGER</h2>
            <p className="text-xs">Scrap Metal & Recyclables</p>
            <p className="text-xs">123 Main Street, City</p>
            <p className="text-xs">Tel: (02) 123-4567</p>
          </div>

          {/* Transaction Info */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(transaction.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="uppercase">{transaction.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="capitalize">{transaction.customerType}</span>
            </div>
            {transaction.employee && (
              <div className="flex justify-between">
                <span>Staff:</span>
                <span>{transaction.employee}</span>
              </div>
            )}
            {transaction.location && (
              <div className="space-y-1">
                <span>Location:</span>
                <p className="text-xs break-words">{transaction.location}</p>
              </div>
            )}
          </div>

          <div className="border-b border-dashed my-4"></div>

          {/* Items */}
          <div className="space-y-2">
            <h3 className="font-bold text-center">ITEMS</h3>
            {transaction.items.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="font-medium break-words">{item.name}</div>
                <div className="flex justify-between text-xs">
                  <span>
                    {item.weight ? `${item.weight} kg` : `${item.pieces} pcs`} 
                    × {formatCurrency(item.price)}
                  </span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
                {index < transaction.items.length - 1 && (
                  <div className="border-b border-dotted"></div>
                )}
              </div>
            ))}
          </div>

          <div className="border-b border-dashed my-4"></div>

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            
            {transaction.expenses && transaction.expenses > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Expenses:</span>
                <span>-{formatCurrency(transaction.expenses)}</span>
              </div>
            )}
            
            <div className="border-b border-dashed my-2"></div>
            
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL:</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>
          </div>

          {/* Transaction Type Specific Info */}
          {transaction.isPickup && (
            <div className="text-center text-xs bg-blue-50 p-2 rounded">
              <span className="font-bold">PICKUP TRANSACTION</span>
            </div>
          )}
          
          {transaction.isDelivery && (
            <div className="text-center text-xs bg-green-50 p-2 rounded">
              <span className="font-bold">DELIVERY TRANSACTION</span>
            </div>
          )}

          <div className="border-b border-dashed my-4"></div>

          {/* Item Images Section - Only show if there are images */}
          {hasImages && (
            <>
              <div className="space-y-3">
                <h3 className="font-bold text-center">ITEM PHOTOS</h3>
                <div className="grid grid-cols-2 gap-2">
                  {itemsWithImages.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-16 object-cover rounded border"
                      />
                      <p className="text-xs text-center truncate">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-b border-dashed my-4"></div>
            </>
          )}

          {/* Footer */}
          <div className="text-center text-xs space-y-2">
            <p className="font-bold">
              {transaction.type === 'buy' ? 'THANK YOU FOR YOUR SCRAP!' : 'THANK YOU FOR YOUR BUSINESS!'}
            </p>
            <p>Please keep this receipt for your records</p>
            <p>
              {transaction.type === 'buy' 
                ? 'We appreciate your contribution to recycling' 
                : 'Your order will be processed promptly'
              }
            </p>
            {hasImages && (
              <p className="text-xs text-gray-600 mt-2">
                Item photos are for reference and verification purposes
              </p>
            )}
            <div className="mt-4 pt-2 border-t border-dashed">
              <p className="text-xs">Generated by Junkshop Manager</p>
              <p className="text-xs">Contact us for any inquiries</p>
            </div>
          </div>

          {/* Barcode Simulation */}
          <div className="text-center mt-4">
            <div className="flex justify-center space-x-1">
              {Array.from({length: 20}, (_, i) => (
                <div 
                  key={i} 
                  className="bg-black" 
                  style={{
                    width: Math.random() > 0.5 ? '2px' : '1px',
                    height: '30px'
                  }}
                />
              ))}
            </div>
            <p className="text-xs mt-1">*{transaction.id}*</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Hidden in print */}
      <div className="flex flex-col space-y-3 print:hidden">
        <Button 
          onClick={printReceipt} 
          className="bg-blue-600 hover:bg-blue-700 w-full" 
          size="lg"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={printReceipt} 
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Again
          </Button>
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-600 mt-4">
          <p>You can print this receipt multiple times</p>
          <p>Transaction #{transaction.id} • {formatCurrency(transaction.total)}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}