import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Recycle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  // Clear any residual session data on component mount
  useEffect(() => {
    localStorage.removeItem('scrappy_session');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-200/30 via-teal-200/20 to-cyan-200/30"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Beautiful Card */}
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 rounded-lg"></div>
        <div className="relative">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center py-8">
            {/* Logo and Branding */}
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Recycle className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl font-bold text-white">
                  Scrappy
                </h1>
                <p className="text-emerald-100">Junkshop Management System</p>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mt-4">
              <CardTitle className="text-2xl text-white">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-emerald-100 mt-2">
                Sign in to continue managing your junkshop operations
              </CardDescription>
            </div>
          </CardHeader>
        
          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-lg"
                />
              </div>

              <div className="flex items-center space-x-3 py-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  disabled={loading}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me for 30 days
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg transform transition-transform hover:scale-105"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Accounts */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-center text-sm font-semibold text-gray-700 mb-4">Demo Accounts</p>
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <p className="text-sm font-bold text-purple-700 mb-1">👑 Owner Account</p>
                  <p className="text-xs text-purple-600">
                    <span className="font-mono bg-white/60 px-2 py-1 rounded">owner@scrappy.com</span>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    <span className="font-mono bg-white/60 px-2 py-1 rounded">password123</span>
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-bold text-blue-700 mb-1">👤 Employee Account</p>
                  <p className="text-xs text-blue-600">
                    <span className="font-mono bg-white/60 px-2 py-1 rounded">employee@scrappy.com</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <span className="font-mono bg-white/60 px-2 py-1 rounded">password123</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}