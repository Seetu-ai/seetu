'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Download, Loader2, Bell } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'resolved';
  title: string;
  description: string;
  timestamp: string;
  billboardId?: string;
  read: boolean;
}

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  const { data, isLoading } = useSWR('/api/v1/admin/billboards/activity', fetcher);

  const alerts: Alert[] = data?.alerts || [];
  const stats = data?.stats || {
    total: alerts.length,
    critical: alerts.filter((a: Alert) => a.type === 'critical').length,
    warning: alerts.filter((a: Alert) => a.type === 'warning').length,
    info: alerts.filter((a: Alert) => a.type === 'info').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const filteredAlerts = activeTab === 'all' ? alerts : alerts.filter((a: Alert) => a.type === activeTab);

  const toggleSelect = (id: string) => {
    setSelectedAlerts((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const typeConfig = {
    critical: { color: 'border-red-200', stripe: 'bg-red-500', iconBg: 'bg-red-100 text-red-600', icon: AlertCircle },
    warning: { color: 'border-amber-200', stripe: 'bg-amber-500', iconBg: 'bg-amber-100 text-amber-600', icon: AlertTriangle },
    info: { color: 'border-blue-200', stripe: 'bg-blue-500', iconBg: 'bg-blue-100 text-blue-600', icon: Info },
    resolved: { color: 'border-slate-200', stripe: 'bg-slate-400', iconBg: 'bg-slate-100 text-slate-500', icon: CheckCircle },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alert Center</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time monitoring and system status</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Download className="h-4 w-4" /> Export Logs
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
            Mark all as read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          {[
            { id: 'all', label: 'All Alerts', count: stats.total },
            { id: 'critical', label: 'Critical', count: stats.critical },
            { id: 'warning', label: 'Warnings', count: stats.warning },
            { id: 'info', label: 'System Info', count: stats.info },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 pt-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px]">{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Bell className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Alerts</h3>
          <p className="text-slate-500 dark:text-slate-400">All systems operating normally</p>
        </div>
      ) : (
      <div className="space-y-3">
        {filteredAlerts.map((alert: Alert) => {
          const config = typeConfig[alert.type];
          const Icon = config.icon;
          return (
            <div
              key={alert.id}
              className={`flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border ${config.color} relative overflow-hidden ${alert.read ? 'opacity-60' : ''}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.stripe}`} />
              <div className="flex items-center h-full ml-2">
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert.id)}
                  onChange={() => toggleSelect(alert.id)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 bg-transparent size-5 cursor-pointer"
                />
              </div>
              <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className={`text-base font-bold ${alert.read ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{alert.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{alert.timestamp} {alert.billboardId && `• ID: ${alert.billboardId}`}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{alert.description}</p>
              </div>
              <div className="shrink-0">
                {alert.type !== 'resolved' ? (
                  <button className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    alert.type === 'critical' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                    View Issue
                  </button>
                ) : (
                  <button className="text-slate-500 text-sm font-bold hover:underline">Details</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Showing {filteredAlerts.length} of {stats.total} alerts</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold">1</button>
          <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">2</button>
          <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Next</button>
        </div>
      </div>
    </div>
  );
}
