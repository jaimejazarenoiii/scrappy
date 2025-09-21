import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ShoppingCart, 
  DollarSign, 
  Users, 
  BarChart3, 
  Wallet,
  Plus,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarIcon,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Target,
  Sparkles,
  LogOut,
  Loader2,
  CheckCircle,
  Recycle
} from 'lucide-react';
import { Transaction, supabaseDataService } from '../../infrastructure/database/supabaseService';
import { startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import BusinessSwitcher from './BusinessSwitcher';
import RealtimeStatus from './RealtimeStatus';
import { useRealtimeData } from '../hooks/useRealtimeData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Alert, AlertDescription } from './ui/alert';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onTransactionClick?: (transactionId: string) => void;
  userRole: 'owner' | 'employee';
  userName?: string;
  businessName?: string;
}

export default function Dashboard({ onNavigate, onTransactionClick, userRole, userName = "User", businessName = "Jazareno Scrap Trading" }: DashboardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Use real-time data hook for all data
  const { 
    transactions, 
    cashEntries, 
    loading: dataLoading, 
    error: dataError,
    refreshData 
  } = useRealtimeData();

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return amount < 0 ? `-₱${formatted}` : `₱${formatted}`;
  };

  const formatTime = (date: Date) => 
    new Date(date).toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    return { start: startOfDay(now), end: endOfDay(now) };
  };

  // Calculate current balance from cash entries
  const currentBalance = useMemo(() => {
    const expenseEntries = cashEntries.filter(e => e.type === 'expense');
    const transactionEntries = cashEntries.filter(e => e.type === 'transaction');
    const adjustmentEntries = cashEntries.filter(e => e.type === 'adjustment');

    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalTransactionRevenue = transactionEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalAdjustments = adjustmentEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return totalTransactionRevenue + totalAdjustments + totalExpenses;
  }, [cashEntries]);

  const calculateTransactionTotal = (transaction: Transaction): number => {
    if (transaction.total && transaction.total !== 0) {
      return transaction.total;
    }
    
    if (transaction.items && transaction.items.length > 0) {
      const subtotal = transaction.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const expenses = transaction.expenses || 0;
      return transaction.type === 'buy' ? subtotal + expenses : subtotal - expenses;
    }
    
    return 0;
  };

  const filteredData = useMemo(() => {
    // For metrics: Filter by today's date
    const { start, end } = getDateRange();
    const todayTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= start && transactionDate <= end;
    });

    // For recent transactions: Get the last 20 transactions overall, sorted by timestamp
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    // Calculate metrics from today's transactions
    const todayBuyTransactions = todayTransactions.filter(t => t.type === 'buy');
    const todaySellTransactions = todayTransactions.filter(t => t.type === 'sell');
    const todayCompletedTransactions = todayTransactions.filter(t => t.status === 'completed');
    const todayCompletedBuyTransactions = todayCompletedTransactions.filter(t => t.type === 'buy');
    const todayCompletedSellTransactions = todayCompletedTransactions.filter(t => t.type === 'sell');
    
    const todayTotalBought = todayCompletedBuyTransactions.reduce((sum, t) => sum + calculateTransactionTotal(t), 0);
    const todayTotalSold = todayCompletedSellTransactions.reduce((sum, t) => sum + calculateTransactionTotal(t), 0);
    const todayTotalExpenses = todayCompletedTransactions.reduce((sum, t) => sum + (t.expenses || 0), 0);
    const todayNetProfit = todayTotalSold - todayTotalBought - todayTotalExpenses;

    return {
      transactions: todayTransactions, // For compatibility
      recentTransactions: recentTransactions.slice(0, 5), // Show 5 most recent from the real-time data
      totalBought: todayTotalBought,
      totalSold: todayTotalSold,
      totalExpenses: todayTotalExpenses,
      netProfit: todayNetProfit,
      transactionCount: todayTransactions.length,
      buyCount: todayCompletedBuyTransactions.length, // Only count completed purchases
      sellCount: todayCompletedSellTransactions.length // Only count completed sales
    };
  }, [transactions]);

  const handleTransactionClick = (transactionId: string) => {
    if (onTransactionClick) {
      onTransactionClick(transactionId);
    }
  };

  // Logout functionality
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowLogoutDialog(false);
    try {
      await logout();
      setShowLogoutSuccess(true);
      setTimeout(() => {
        setShowLogoutSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  // Keyboard shortcut for logout (Ctrl+Shift+L)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        handleLogoutClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 text-xs border border-purple-200/60 shadow-sm">👑 Owner</Badge>;
    }
    return <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 text-xs border border-blue-200/60 shadow-sm">👤 Employee</Badge>;
  };

  // Employee Dashboard - Modern Design
  if (userRole === 'employee') {
    return (
      <>
        {/* Logout Success Alert */}
        {showLogoutSuccess && (
          <Alert className="border-green-200 bg-green-50 mb-0">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully signed out! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            {/* Gradient Orbs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
            
            {/* Floating Particles */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
            <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-ping opacity-75 animation-delay-1000"></div>
            <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping opacity-75 animation-delay-2000"></div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 w-full max-w-7xl">
            <div className="space-y-8">
            {/* Integrated Header with User Info */}
            <div className="pt-8 pb-4 animate-fade-in-up">
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      {/* App Logo */}
                      <div className="relative">
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                          <Recycle className="h-7 w-7 text-white" />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl blur-md"></div>
                      </div>
                      
                      {/* App Title */}
                      <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                          Scrappy
                        </h1>
                        <p className="text-sm text-purple-200 font-medium">Junkshop Management System</p>
                      </div>

                    </div>

                    <div className="flex items-center space-x-4">

                      {/* User Info and Sign Out */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="flex items-center justify-end space-x-2 mt-1">
                            {userRole === 'owner' ? (
                              <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-200 text-xs border border-yellow-400/30 shadow-sm">👑 Owner</Badge>
                            ) : (
                              <Badge className="bg-gradient-to-r from-blue-400/20 to-cyan-500/20 text-blue-200 text-xs border border-blue-400/30 shadow-sm">👤 Employee</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-300 hover:text-red-200 hover:bg-red-500/20 border border-red-400/30"
                          onClick={handleLogoutClick}
                          disabled={isLoggingOut}
                        >
                          {isLoggingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing Out...
                            </>
                          ) : (
                            <>
                              <LogOut className="mr-2 h-4 w-4" />
                              Sign Out
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personalized Greeting */}
            <div className="pb-4 animate-fade-in-up">
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-2">
                        Hi, {userName}! 👋
                      </h1>
                      <div className="flex items-center space-x-3">
                        <div className="h-1 w-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                        <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                          {businessName}
                        </h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-200">Today</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date().toLocaleDateString('en-PH', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card 
              className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-purple-500/40 cursor-pointer animate-fade-in-scale stagger-1"
              onClick={() => onNavigate('buy-scrap')}
              onMouseEnter={() => setHoveredCard('buy')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-8 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl backdrop-blur-sm border border-white/20">
                      <Plus className="h-8 w-8" />
                    </div>
                    <ArrowUpRight className={`h-6 w-6 transition-transform duration-300 ${hoveredCard === 'buy' ? 'translate-x-1 -translate-y-1' : ''}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Buy Scrap</h3>
                  <p className="text-purple-200 text-lg">Purchase materials from suppliers</p>
                  <div className="mt-6 flex items-center text-sm text-purple-300">
                    <Activity className="h-4 w-4 mr-2" />
                    {filteredData.buyCount} purchases today
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-pink-500/40 cursor-pointer animate-fade-in-scale stagger-2"
              onClick={() => onNavigate('sell-scrap')}
              onMouseEnter={() => setHoveredCard('sell')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className="p-8 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-2xl backdrop-blur-sm border border-white/20">
                      <DollarSign className="h-8 w-8" />
                    </div>
                    <ArrowUpRight className={`h-6 w-6 transition-transform duration-300 ${hoveredCard === 'sell' ? 'translate-x-1 -translate-y-1' : ''}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Sell Scrap</h3>
                  <p className="text-pink-200 text-lg">Process sales to customers</p>
                  <div className="mt-6 flex items-center text-sm text-pink-300">
                    <Target className="h-4 w-4 mr-2" />
                    {filteredData.sellCount} sales today
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Activity */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl border border-white/20">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-white">Today's Activity</span>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 border border-purple-400/30">
                  {formatCurrency(filteredData.netProfit)} profit
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {filteredData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {filteredData.recentTransactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/20 cursor-pointer transition-all duration-300 hover:shadow-lg"
                      onClick={() => handleTransactionClick(transaction.id)}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/20 ${
                          transaction.type === 'buy' 
                            ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-200 group-hover:from-red-500/40 group-hover:to-red-600/40' 
                            : 'bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-200 group-hover:from-green-500/40 group-hover:to-green-600/40'
                        }`}>
                          {transaction.type === 'buy' ? (
                            <ShoppingCart className="h-6 w-6" />
                          ) : (
                            <DollarSign className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-3">
                            <p className="font-semibold text-white">
                              #{transaction.id} - {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                            </p>
                            <Badge className={`${
                              transaction.status === 'completed' ? 'bg-green-500/20 text-green-200 border-green-400/30' :
                              transaction.status === 'for-payment' ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' :
                              transaction.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                              'bg-red-500/20 text-red-200 border-red-400/30'
                            }`}>
                              {transaction.status === 'completed' ? 'Completed' :
                               transaction.status === 'for-payment' ? 'For Payment' :
                               transaction.status === 'in-progress' ? 'In Progress' :
                               'Cancelled'}
                            </Badge>
                          </div>
                          <p className="text-sm text-purple-200">
                            {formatDate(new Date(transaction.timestamp))} {formatTime(new Date(transaction.timestamp))} • {transaction.employee}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            transaction.type === 'buy' ? 'text-red-200' : 'text-green-200'
                          }`}>
                            {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(Math.abs(calculateTransactionTotal(transaction)))}
                          </p>
                          <p className="text-sm text-purple-300">
                            {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Eye className="h-5 w-5 text-purple-300 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl mb-4 border border-white/20">
                    <ShoppingCart className="h-8 w-8 text-purple-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No transactions today</h3>
                  <p className="text-purple-200">Start by buying or selling scrap materials</p>
                </div>
              )}

              {filteredData.recentTransactions.length > 0 && transactions.length > 5 && (
                <div className="pt-6 border-t border-white/20">
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate('all-transactions')}
                    className="w-full h-12 rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/10 text-white transition-all duration-300"
                  >
                    View all transactions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          </div>
        </div>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <LogOut className="h-5 w-5 text-red-600" />
                <span>Sign Out Confirmation</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out of Scrappy? You will need to sign back in to access your account.
                {userRole === 'employee' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <strong>Note:</strong> Any unsaved work in progress transactions may be lost.
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Tip: You can also use <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Ctrl+Shift+L</kbd> to sign out quickly.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setShowLogoutDialog(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Owner Dashboard - Full Analytics View
  return (
    <>
      {/* Logout Success Alert */}
      {showLogoutSuccess && (
        <Alert className="border-green-200 bg-green-50 mb-0">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully signed out! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <div className="min-h-screen flex items-center justify-center p-4 relative">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Gradient Orbs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          
          {/* Floating Particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-ping opacity-75 animation-delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping opacity-75 animation-delay-2000"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-7xl">
          <div className="space-y-8">
          {/* Integrated Header with User Info */}
          <div className="pt-8 pb-4 animate-fade-in-up">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* App Logo */}
                    <div className="relative">
                      <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                        <Recycle className="h-7 w-7 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl blur-md"></div>
                    </div>
                
                    {/* App Title */}
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                        Scrappy
                      </h1>
                      <p className="text-sm text-purple-200 font-medium">Junkshop Management System</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">

                    {/* User Info and Sign Out */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          {userRole === 'owner' ? (
                            <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-200 text-xs border border-yellow-400/30 shadow-sm">👑 Owner</Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-blue-400/20 to-cyan-500/20 text-blue-200 text-xs border border-blue-400/30 shadow-sm">👤 Employee</Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/20 border border-red-400/30"
                        onClick={handleLogoutClick}
                        disabled={isLoggingOut}
                      >
                        {isLoggingOut ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing Out...
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personalized Greeting */}
          <div className="pb-4 animate-fade-in-up">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Hi, {userName}! 👋
                    </h1>
                    <div className="flex items-center space-x-3">
                      <div className="h-1 w-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                        {businessName}
                      </h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-purple-200">Today</p>
                    <p className="text-lg font-semibold text-white">
                      {new Date().toLocaleDateString('en-PH', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Today's Overview Card */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden animate-fade-in-scale stagger-1">
          <CardContent className="p-8">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl border border-white/20">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">Today's Overview</span>
              </div>
              
              <Badge className="ml-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 border border-purple-400/30 px-4 py-2 text-sm font-medium">
                Today • {formatCurrency(filteredData.netProfit)} profit
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/40 transition-all duration-500 hover:scale-105 rounded-3xl animate-fade-in-scale stagger-2">
            <CardContent className="p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-200 mb-1">Net Profit</p>
                    <p className="text-3xl font-bold text-white mb-2">
                      {formatCurrency(filteredData.netProfit)}
                    </p>
                    <p className="text-xs text-green-300">Sales - Purchases</p>
                  </div>
                  <div className="h-14 w-14 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/20">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-red-500/40 transition-all duration-500 hover:scale-105 rounded-3xl animate-fade-in-scale stagger-3">
            <CardContent className="p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-200 mb-1">Purchases</p>
                    <p className="text-3xl font-bold text-white mb-2">
                      {formatCurrency(filteredData.totalBought)}
                    </p>
                    <p className="text-xs text-red-300">{filteredData.buyCount} completed</p>
                  </div>
                  <div className="h-14 w-14 bg-gradient-to-r from-red-500/30 to-red-600/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/20">
                    <ShoppingCart className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-green-500/40 transition-all duration-500 hover:scale-105 rounded-3xl animate-fade-in-scale stagger-4">
            <CardContent className="p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-200 mb-1">Sales</p>
                    <p className="text-3xl font-bold text-white mb-2">
                      {formatCurrency(filteredData.totalSold)}
                    </p>
                    <p className="text-xs text-green-300">{filteredData.sellCount} completed</p>
                  </div>
                  <div className="h-14 w-14 bg-gradient-to-r from-green-500/30 to-green-600/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/20">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Funds Alert */}
        {userRole === 'owner' && cashEntries.reduce((sum, entry) => sum + entry.amount, 0) < 10000 && (
          <Card className="bg-white/10 backdrop-blur-xl border border-orange-400/30 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-2xl flex items-center justify-center border border-white/20">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-200 text-lg">Low Funds Alert</h3>
                    <p className="text-sm text-orange-300">
                      Current balance is below ₱10,000. Consider adding more cash.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Button
            onClick={() => onNavigate('buy-scrap')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Buy Scrap</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('sell-scrap')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-sm font-medium">Sell Scrap</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('all-transactions')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <Receipt className="h-6 w-6" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('reports')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm font-medium">Reports</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('cash-management')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <Wallet className="h-6 w-6" />
              <span className="text-sm font-medium">Cash & Expenses</span>
            </div>
          </Button>

          <Button
            onClick={() => onNavigate('employees')}
            className="h-24 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white shadow-2xl hover:shadow-gray-500/40 transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Employees</span>
            </div>
          </Button>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl border border-white/20">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-white">Recent Transactions</span>
              </div>
              <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 border border-purple-400/30">
                {dataLoading ? 'Loading...' : `5 recent`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dataLoading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl mb-4 border border-white/20">
                  <Loader2 className="h-8 w-8 text-purple-300 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Loading recent transactions...</h3>
                <p className="text-purple-200">Fetching the latest transactions</p>
              </div>
            ) : filteredData.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredData.recentTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="group flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/20 cursor-pointer transition-all duration-300 hover:shadow-lg"
                    onClick={() => handleTransactionClick(transaction.id)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/20 ${
                        transaction.type === 'buy' 
                          ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-200 group-hover:from-red-500/40 group-hover:to-red-600/40' 
                          : 'bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-200 group-hover:from-green-500/40 group-hover:to-green-600/40'
                      }`}>
                        {transaction.type === 'buy' ? (
                          <ShoppingCart className="h-6 w-6" />
                        ) : (
                          <DollarSign className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <p className="font-semibold text-white">
                            #{transaction.id} - {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                          </p>
                          <Badge className={`${
                            transaction.status === 'completed' ? 'bg-green-500/20 text-green-200 border-green-400/30' :
                            transaction.status === 'for-payment' ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' :
                            transaction.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                            'bg-red-500/20 text-red-200 border-red-400/30'
                          }`}>
                            {transaction.status === 'completed' ? 'Completed' :
                             transaction.status === 'for-payment' ? 'For Payment' :
                             transaction.status === 'in-progress' ? 'In Progress' :
                             'Cancelled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-purple-200">
                          {formatDate(new Date(transaction.timestamp))} {formatTime(new Date(transaction.timestamp))} • {transaction.employee}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          transaction.type === 'buy' ? 'text-red-200' : 'text-green-200'
                        }`}>
                          {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(Math.abs(calculateTransactionTotal(transaction)))}
                        </p>
                        <p className="text-sm text-purple-300">
                          {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <Eye className="h-5 w-5 text-purple-300 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl mb-4 border border-white/20">
                  <ShoppingCart className="h-8 w-8 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No recent transactions</h3>
                <p className="text-purple-200">Start by buying or selling scrap materials</p>
              </div>
            )}

            {userRole === 'owner' && transactions.length > 5 && (
              <div className="pt-6 border-t border-white/20">
                <Button 
                  variant="outline" 
                  onClick={() => onNavigate('all-transactions')}
                  className="w-full h-12 rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/10 text-white transition-all duration-300"
                >
                  View all transactions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <LogOut className="h-5 w-5 text-red-600" />
              <span>Sign Out Confirmation</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of Scrappy? You will need to sign back in to access your account.
              {user?.role === 'employee' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong>Note:</strong> Any unsaved work in progress transactions may be lost.
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                Tip: You can also use <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Ctrl+Shift+L</kbd> to sign out quickly.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}