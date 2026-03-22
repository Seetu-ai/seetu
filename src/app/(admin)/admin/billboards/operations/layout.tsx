'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Monitor,
  Shield,
  Package,
  ListOrdered,
  FolderOpen,
  DollarSign,
  Users,
  Bell,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/admin/billboards/operations', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/billboards/operations/live', label: 'Live', icon: Monitor },
  { href: '/admin/billboards/operations/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/billboards/operations/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/billboards/operations/queue', label: 'Queue', icon: ListOrdered },
  { href: '/admin/billboards/operations/content', label: 'Content', icon: FolderOpen },
  { href: '/admin/billboards/operations/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/billboards/operations/advertisers', label: 'Advertisers', icon: Users },
  { href: '/admin/billboards/operations/alerts', label: 'Alerts', icon: Bell },
  { href: '/admin/billboards/operations/settings', label: 'Settings', icon: Settings },
];

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billboard Operations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage the Dakar digital billboard network</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin/billboards/operations' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        {children}
      </div>
    </div>
  );
}
