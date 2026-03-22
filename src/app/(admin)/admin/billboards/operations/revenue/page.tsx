'use client';

import useSWR from 'swr';
import { TrendingUp, Download, Loader2, DollarSign } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RevenuePage() {
  const { data, isLoading } = useSWR('/api/v1/admin/billboards/revenue', fetcher);

  const stats = data?.stats || { totalRevenue: 0, monthlyGrowth: 0, activeBillboards: 0 };
  const locations = data?.revenueByLocation || [];
  const payments = data?.paymentMethods || [];
  const transactions = data?.transactions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    completed: 'bg-green-100 text-green-600',
    failed: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-600',
    refunded: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Revenue & Financial Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time financial tracking for digital billboards</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
          <Download className="h-4 w-4" /> Export Reports
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{(stats.totalRevenue / 1000000).toFixed(1)}M <span className="text-sm text-slate-500">FCFA</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Monthly Growth</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">+{stats.monthlyGrowth}% <TrendingUp className="h-5 w-5 text-green-500" /></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Active Billboards</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.activeBillboards}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue by Location */}
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Revenue by Location</h3>
          {locations.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500">No location data</div>
          ) : (
          <div className="flex items-end justify-between gap-4 h-48 px-2">
            {locations.map((loc: any) => (
              <div key={loc.name} className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-red-100 rounded-t-lg relative" style={{ height: `${loc.percentage * 1.8}px` }}>
                  <div className="absolute bottom-0 w-full bg-red-600 rounded-t-lg" style={{ height: `${loc.percentage}%` }} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">{loc.name}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-lg">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Payment Methods</h3>
          {payments.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500">No payment data</div>
          ) : (
          <div className="flex items-center justify-around h-48">
            <div
              className="relative size-40 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(${payments.map((p: any, i: number) => {
                const start = payments.slice(0, i).reduce((sum: number, pm: any) => sum + pm.percentage, 0);
                const end = start + p.percentage;
                return `${p.color} ${start}% ${end}%`;
              }).join(', ') || '#e2e8f0 0% 100%'})` }}
            >
              <div className="size-28 bg-slate-50 dark:bg-slate-800 rounded-full flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-slate-500">TOP</span>
                <span className="text-sm font-black text-red-600">{payments[0]?.name || 'N/A'} {payments[0]?.percentage || 0}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {payments.map((m: any) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-sm text-slate-900 dark:text-white">{m.name}</span>
                  <span className="text-sm text-slate-500 ml-auto">{m.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-10 w-10 text-slate-400 mb-3" />
            <p className="text-slate-500">No transactions yet</p>
          </div>
        ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Advertiser</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {transactions.map((tx: any) => (
              <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">#{tx.id}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{tx.date}</td>
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{tx.advertiser}</td>
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{tx.amount.toLocaleString()} FCFA</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusStyles[tx.status]}`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
