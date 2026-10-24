import React from 'react';
import { RefreshCw } from 'lucide-react';

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20 text-[#9ca3af]">
    <div className="flex flex-col items-center gap-2">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      <span className="text-xs font-mono">Loading...</span>
    </div>
  </div>
);
