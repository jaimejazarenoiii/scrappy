import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from './utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size], className)} />
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({ isVisible, message = 'Loading...', children }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full animate-pulse"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{message}</p>
            <p className="text-sm text-gray-600 mt-1">Please wait a moment...</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

interface ActionLoadingProps {
  isLoading: boolean;
  success?: boolean;
  error?: boolean;
  message?: string;
  successMessage?: string;
  errorMessage?: string;
  onClose?: () => void;
}

export function ActionLoading({ 
  isLoading, 
  success = false, 
  error = false, 
  message = 'Processing...', 
  successMessage = 'Success!',
  errorMessage = 'Something went wrong',
  onClose 
}: ActionLoadingProps) {
  if (!isLoading && !success && !error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          {isLoading && (
            <>
              <div className="relative">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{message}</p>
                <p className="text-sm text-gray-600 mt-1">Please wait...</p>
              </div>
            </>
          )}

          {success && (
            <>
              <div className="relative">
                <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-green-900">{successMessage}</p>
                <p className="text-sm text-gray-600 mt-1">Operation completed successfully</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Continue
                </button>
              )}
            </>
          )}

          {error && (
            <>
              <div className="relative">
                <div className="h-16 w-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-red-600/20 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-red-900">{errorMessage}</p>
                <p className="text-sm text-gray-600 mt-1">Please try again</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoading({ 
  isLoading, 
  message = 'Loading...', 
  size = 'md',
  className 
}: InlineLoadingProps) {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6'
  };

  return (
    <div className={cn('flex items-center justify-center space-x-3', sizeClasses[size], className)}>
      <LoadingSpinner size={size} />
      <span className="text-gray-600 font-medium">{message}</span>
    </div>
  );
}

interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  loadingText = 'Loading...', 
  className = '',
  disabled = false,
  onClick 
}: ButtonLoadingProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all',
        'bg-blue-600 hover:bg-blue-700 text-white',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" className="text-white" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
}

interface CardLoadingProps {
  lines?: number;
  className?: string;
}

export function CardLoading({ lines = 3, className }: CardLoadingProps) {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-gray-200 rounded h-4',
            i === 0 && 'w-3/4',
            i === 1 && 'w-full',
            i === 2 && 'w-2/3',
            i > 2 && 'w-5/6'
          )}
        />
      ))}
    </div>
  );
}

export default {
  LoadingSpinner,
  LoadingOverlay,
  ActionLoading,
  InlineLoading,
  ButtonLoading,
  CardLoading
};

