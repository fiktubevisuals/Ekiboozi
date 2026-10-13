import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-full bg-[#E14545] text-white px-4 py-2 text-xs font-semibold shadow-2xl border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Offline Mode — Playing cached content</span>
    </div>
  );
};
