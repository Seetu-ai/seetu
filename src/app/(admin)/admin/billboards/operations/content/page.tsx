'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, Grid, List, Play, Image, CheckCircle, Clock, XCircle, Loader2, FileVideo, AlertCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ContentItem {
  id: string;
  mediaType: 'video' | 'image';
  originalUrl: string;
  processedUrls: Record<string, string>;
  status: string;
  whatsappPhone?: string;
  whatsappName?: string;
  createdAt: string;
  durationSeconds?: number;
  user?: { id: string; email: string; name?: string };
  payment?: { id: string; status: string; amountCfa: number };
  billboards: { id: string; name: string; queueStatus: string }[];
}

// Map API status to display status
function mapStatus(status: string): 'ready' | 'processing' | 'rejected' | 'pending' {
  if (status === 'ready') return 'ready';
  if (status === 'pending_validation' || status === 'pending_moderation' || status === 'pending_payment' || status === 'processing') return 'processing';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function ContentLibraryPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'ready' | 'processing' | 'rejected'>('all');

  const { data, isLoading } = useSWR('/api/v1/admin/billboards/content', fetcher);

  const content: ContentItem[] = data?.contents || [];
  const filtered = filter === 'all' ? content : content.filter((c: ContentItem) => mapStatus(c.status) === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const statusConfig = {
    ready: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    pending: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-100' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Content Library</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">All uploaded media across the billboard network</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search content..."
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500/50 focus:outline-none w-64"
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(['all', 'ready', 'processing', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f ? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button onClick={() => setView('grid')} className={`p-2 rounded-md ${view === 'grid' ? 'bg-red-600 text-white' : 'text-slate-600'}`}>
            <Grid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')} className={`p-2 rounded-md ${view === 'list' ? 'bg-red-600 text-white' : 'text-slate-600'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <FileVideo className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Content</h3>
          <p className="text-slate-500 dark:text-slate-400">No content uploaded yet</p>
        </div>
      ) : (
      <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
        {filtered.map((item: ContentItem) => {
          const displayStatus = mapStatus(item.status);
          const config = statusConfig[displayStatus] || statusConfig.processing;
          const StatusIcon = config.icon;
          const advertiser = item.whatsappName || item.user?.email || item.whatsappPhone || 'Unknown';

          return (
            <div key={item.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-red-300 transition-colors">
              <div className="aspect-[1/2] bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {(() => {
                  // Use processed URL if available, fallback to original
                  const mediaUrl = item.processedUrls?.url || item.processedUrls?.thumbnail || item.originalUrl;
                  if (!mediaUrl) {
                    return item.mediaType === 'video' ? <Play className="h-12 w-12 text-white/30" /> : <Image className="h-12 w-12 text-white/30" />;
                  }
                  return item.mediaType === 'video' ? (
                    <video src={mediaUrl} className="w-full h-full object-contain" muted />
                  ) : (
                    <img src={mediaUrl} alt="" className="w-full h-full object-contain" />
                  );
                })()}
                {item.durationSeconds && (
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {item.durationSeconds}s
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{advertiser}</p>
                  <span className={`flex items-center gap-1 text-xs font-bold ${config.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                {item.payment && (
                  <p className="text-xs text-green-600 font-medium mt-1">{item.payment.amountCfa} CFA - {item.payment.status}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
