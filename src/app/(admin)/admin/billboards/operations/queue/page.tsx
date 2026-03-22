'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Play, Pause, SkipForward, Trash2, GripVertical, Tv, RefreshCw, Plus, AlertCircle, WifiOff, Loader2, Monitor } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QueueControlPage() {
  const [selectedBillboard, setSelectedBillboard] = useState<string | null>(null);
  const { data: billboardsData, isLoading } = useSWR('/api/v1/admin/billboards/queues', fetcher, { refreshInterval: 5000 });

  const displayBillboards = billboardsData?.billboards || [];
  const currentBillboard = displayBillboards.find((b: any) => b.id === selectedBillboard) || displayBillboards[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (displayBillboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <Monitor className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Billboards</h3>
        <p className="text-slate-500 dark:text-slate-400">Add billboards to manage their queues</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Billboard Sidebar */}
      <div className="col-span-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tv className="h-5 w-5 text-red-600" /> Select Billboard
          </h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {displayBillboards.map((billboard: any) => (
            <div
              key={billboard.id}
              onClick={() => setSelectedBillboard(billboard.id)}
              className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${
                currentBillboard?.id === billboard.id ? 'bg-red-50 dark:bg-red-900/20 border-l-2 border-l-red-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`size-2 rounded-full ${billboard.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="font-bold text-sm text-slate-900 dark:text-white">{billboard.name}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{billboard.address}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{billboard.queue?.length || 0} in queue</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors">
            <AlertCircle className="h-5 w-5" /> Emergency Stop
          </button>
        </div>
      </div>

      {/* Main Queue Area */}
      <div className="col-span-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Queue Control</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage real-time rotation for {currentBillboard?.name}</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Media
            </button>
          </div>
        </div>

        {currentBillboard?.status === 'offline' ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <WifiOff className="h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Billboard Offline</h3>
            <p className="text-slate-500 dark:text-slate-400">This billboard is currently disconnected</p>
          </div>
        ) : (
          <>
            {currentBillboard?.currentlyPlaying && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-5">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 mb-4">
                  <span className="size-2 bg-red-600 rounded-full animate-pulse" /> Currently Playing
                </h3>
                <div className="flex gap-6">
                  <div className="w-32 h-20 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Play className="h-8 w-8 text-white/50" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{currentBillboard.currentlyPlaying.content.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{currentBillboard.currentlyPlaying.content.advertiser}</p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                      <div className="h-full w-[65%] bg-red-600 rounded-full" />
                    </div>
                    <div className="flex gap-4 mt-3">
                      <button className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
                        <Pause className="h-4 w-4" /> Pause
                      </button>
                      <button className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
                        <SkipForward className="h-4 w-4" /> Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                Up Next ({currentBillboard?.queue?.length || 0} Items)
              </h3>
              <div className="space-y-3">
                {currentBillboard?.queue?.map((item: any, index: number) => (
                  <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                    <GripVertical className="h-5 w-5 text-slate-400 cursor-grab" />
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="w-16 h-10 bg-slate-900 rounded flex items-center justify-center">
                      <Play className="h-4 w-4 text-white/50" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">{item.content.title}</h5>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{item.content.durationSeconds}s • Starts {item.scheduledFor}</p>
                    </div>
                    <button className="text-slate-400 hover:text-red-500 transition-colors p-2">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Proof of Play Sidebar */}
      <div className="col-span-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Proof of Play</h3>
          <span className="text-[10px] bg-green-100 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-bold">LIVE</span>
        </div>
        <div className="w-full aspect-video bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 mb-6 flex items-center justify-center">
          <Tv className="h-8 w-8 text-slate-600" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="aspect-video bg-slate-900 rounded border border-slate-300 dark:border-slate-600" />
              <span className="text-[9px] text-slate-500 font-mono">14:{25 - i * 5}:00</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
