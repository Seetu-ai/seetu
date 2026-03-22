'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Shield, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ModerationItem {
  id: string;
  thumbnailUrl: string;
  advertiser: string;
  submittedAt: string;
  riskLevel: 'low' | 'medium' | 'high';
  aiAnalysis: { nudity: number; violence: number; political: number; overall: number };
}

export default function ModerationPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useSWR('/api/v1/admin/billboards/content?status=pending_moderation', fetcher);

  const items: ModerationItem[] = data?.content || [];
  const selectedItem = items.find((i: ModerationItem) => i.id === selected) || items[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All Caught Up!</h3>
        <p className="text-slate-500 dark:text-slate-400">No content pending moderation</p>
      </div>
    );
  }

  const riskConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    medium: { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    high: { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Queue List */}
      <div className="col-span-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Queue ({items.length})
          </h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {items.map((item: ModerationItem) => {
            const config = riskConfig[item.riskLevel];
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${
                  selectedItem?.id === item.id ? 'bg-red-50 dark:bg-red-900/20 border-l-2 border-l-red-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex gap-3">
                  <div className="size-12 bg-slate-200 dark:bg-slate-700 rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.advertiser}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.submittedAt}</p>
                    <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {item.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="col-span-6 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center mb-4">
            <Play className="h-16 w-16 text-white/30" />
          </div>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors">
              <CheckCircle className="h-5 w-5" /> Approve
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors">
              <XCircle className="h-5 w-5" /> Reject
            </button>
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div className="col-span-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-6">AI Analysis</h3>
        {selectedItem && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Overall Safety Score</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{selectedItem.aiAnalysis.overall}%</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${selectedItem.aiAnalysis.overall > 70 ? 'bg-green-500' : selectedItem.aiAnalysis.overall > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${selectedItem.aiAnalysis.overall}%` }}
                />
              </div>
            </div>
            {['nudity', 'violence', 'political'].map((key) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">{key}</span>
                <span className={`font-mono text-sm ${(selectedItem.aiAnalysis as any)[key] > 20 ? 'text-red-500' : 'text-green-500'}`}>
                  {(selectedItem.aiAnalysis as any)[key]}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
