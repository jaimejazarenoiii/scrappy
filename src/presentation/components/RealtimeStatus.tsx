import { useRealtimeStatus } from '../hooks/useRealtimeData';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Wifi, WifiOff, Clock } from 'lucide-react';

export default function RealtimeStatus() {
  const { isConnected, lastSync } = useRealtimeStatus();

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    return date.toLocaleTimeString();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className={`flex items-center space-x-1 text-xs ${
                isConnected 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </Badge>
            
            {lastSync && (
              <Badge variant="outline" className="flex items-center space-x-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>{formatLastSync(lastSync)}</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold">
              {isConnected ? '🟢 Real-time Connected' : '🔴 Offline Mode'}
            </p>
            <p className="text-xs mt-1">
              {isConnected 
                ? 'Data syncs automatically across devices'
                : 'Connect to internet for real-time sync'
              }
            </p>
            {lastSync && (
              <p className="text-xs mt-1 text-gray-500">
                Last sync: {lastSync.toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
