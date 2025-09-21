import { Building2 } from 'lucide-react';
import { useBusinessSwitcher } from '../hooks/useBusinessContext';

export default function BusinessSwitcher() {
  const { currentBusiness, loading } = useBusinessSwitcher();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">No business assigned</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-4 w-4 text-emerald-600" />
      <span className="text-sm font-medium text-gray-900">
        {currentBusiness.name}
      </span>
    </div>
  );
}