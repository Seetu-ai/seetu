'use client';

import { useDisplayStore } from '@/lib/display/use-display-store';

export function OfflineIndicator() {
  const isOnline = useDisplayStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
      </span>
      <span className="text-red-400 text-xs font-mono">OFFLINE</span>
    </div>
  );
}
