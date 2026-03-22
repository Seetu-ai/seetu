'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, MessageCircle, Globe, Star, Loader2, Users } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Advertiser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'platform' | 'whatsapp';
  totalSpent: number;
  campaigns: number;
  status: 'active' | 'vip' | 'suspended';
  lastActivity: string;
}

export default function AdvertisersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useSWR('/api/v1/admin/billboards/advertisers', fetcher);

  const advertisers: Advertiser[] = data?.advertisers || [];
  const filtered = advertisers.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const statusStyles = {
    vip: 'bg-purple-100 text-purple-600 border-purple-200',
    active: 'bg-green-100 text-green-600 border-green-200',
    suspended: 'bg-red-100 text-red-600 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Advertiser CRM</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage platform users and WhatsApp customers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Advertiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{advertisers.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Advertisers</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{(advertisers.reduce((s, a) => s + a.totalSpent, 0) / 1000000).toFixed(1)}M</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue (FCFA)</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{advertisers.reduce((s, a) => s + a.campaigns, 0)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Campaigns</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{advertisers.filter((a) => a.type === 'whatsapp').length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">WhatsApp Leads</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search advertisers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500/50 focus:outline-none"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Users className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Advertisers</h3>
          <p className="text-slate-500 dark:text-slate-400">No advertisers in the system yet</p>
        </div>
      ) : (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Advertiser</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Total Spent</th>
              <th className="px-6 py-4">Campaigns</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((advertiser) => (
              <tr
                key={advertiser.id}
                onClick={() => setSelected(advertiser.id)}
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selected === advertiser.id ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                      {advertiser.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {advertiser.name}
                        {advertiser.status === 'vip' && <Star className="h-3 w-3 text-purple-500 fill-purple-500" />}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{advertiser.email || advertiser.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${advertiser.type === 'platform' ? 'text-red-600' : 'text-green-600'}`}>
                    {advertiser.type === 'platform' ? <Globe className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                    {advertiser.type === 'platform' ? 'Platform' : 'WhatsApp'}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{advertiser.totalSpent.toLocaleString()} FCFA</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{advertiser.campaigns}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${statusStyles[advertiser.status]}`}>
                    {advertiser.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{advertiser.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
