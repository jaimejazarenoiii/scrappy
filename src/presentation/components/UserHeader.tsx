import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import BusinessSwitcher from './BusinessSwitcher';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { User, LogOut, Settings, Shield, Recycle, Loader2, CheckCircle } from 'lucide-react';
import RealtimeStatus from './RealtimeStatus';
import { useAuth } from '../contexts/AuthContext';

export default function UserHeader() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowLogoutDialog(false); // Close dialog
    try {
      await logout();
      setShowLogoutSuccess(true);
      // Brief success message before redirect
      setTimeout(() => {
        setShowLogoutSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout anyway
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 text-xs border border-purple-200/60 shadow-sm">👑 Owner</Badge>;
    }
    return <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 text-xs border border-blue-200/60 shadow-sm">👤 Employee</Badge>;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') {
      return <Shield className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

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

      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-white via-emerald-50/30 to-white border-b border-gray-200/60 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 transform hover:scale-105 transition-all duration-300">
              <Recycle className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-xl blur-md"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
              Scrappy
            </h1>
            <p className="text-sm text-gray-600 font-medium">Junkshop Management System</p>
          </div>
          
          {/* Business Switcher */}
          <BusinessSwitcher />
        </div>

                    <div className="flex items-center space-x-4">
              {/* Real-time Status */}
              <RealtimeStatus />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-4 h-auto p-3 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-lg hover:bg-white/80 transition-all duration-300">
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-800">{user.name}</p>
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    {getRoleBadge(user.role)}
                  </div>
                </div>
                <Avatar className="h-11 w-11 border-2 border-white shadow-lg shadow-emerald-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <span className="text-xs capitalize">{user.role}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
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
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              {user.role === 'employee' && (
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