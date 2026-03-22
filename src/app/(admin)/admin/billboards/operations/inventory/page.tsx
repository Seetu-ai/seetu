'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, Settings, Copy, Wifi, WifiOff, Wrench, Loader2, Monitor } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Billboard {
  id: string;
  name: string;
  slug: string;
  address: string;
  status: 'online' | 'offline' | 'maintenance';
  resolution: string;
  pricePerSlot: number;
  apiKey: string;
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useSWR('/api/v1/admin/billboards?include_inactive=true', fetcher);

  const billboards: Billboard[] = data?.billboards || [];
  const filtered = billboards.filter((b: Billboard) =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const statusConfig = {
    online: { icon: Wifi, color: 'text-green-600', bg: 'bg-green-100' },
    offline: { icon: WifiOff, color: 'text-red-600', bg: 'bg-red-100' },
    maintenance: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Billboard Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage all digital billboards in the network</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Billboard
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: billboards.length },
          { label: 'Online', value: billboards.filter((b: Billboard) => b.status === 'online').length },
          { label: 'Offline', value: billboards.filter((b: Billboard) => b.status === 'offline').length },
          { label: 'Maintenance', value: billboards.filter((b: Billboard) => b.status === 'maintenance').length },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search billboards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500/50 focus:outline-none"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Monitor className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Billboards</h3>
          <p className="text-slate-500 dark:text-slate-400">Add your first billboard to get started</p>
        </div>
      ) : (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Billboard</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Resolution</th>
              <th className="px-6 py-4">Price/Slot</th>
              <th className="px-6 py-4">API Key</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((billboard: Billboard) => {
              const config = statusConfig[billboard.status];
              const StatusIcon = config.icon;
              return (
                <tr key={billboard.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{billboard.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{billboard.address}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 ${config.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-xs font-bold capitalize">{billboard.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{billboard.resolution}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{billboard.pricePerSlot.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <code className="text-xs">bb_•••</code>
                      <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
