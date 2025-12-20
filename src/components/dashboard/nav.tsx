'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Camera,
  CreditCard,
  Settings,
  Palette,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  credits: number;
  creditUnits: number;
  plan: string;
}

interface NavProps {
  user: UserData;
  mobile?: boolean;
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Produits',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Studio',
    href: '/studio',
    icon: Layers,
    badge: 'New',
  },
  {
    title: 'Historique',
    href: '/shoots',
    icon: Camera,
  },
  {
    title: 'Crédits',
    href: '/credits',
    icon: CreditCard,
  },
];

const settingsItems = [
  {
    title: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Ma Marque',
    href: '/settings/branding',
    icon: Palette,
  },
];

export function DashboardNav({ user, mobile }: NavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'flex flex-col gap-2 p-4',
        mobile
          ? 'w-full'
          : 'fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-white dark:bg-slate-900 dark:border-slate-800 hidden md:flex'
      )}
    >
      {/* Main Navigation */}
      <div className="space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {(item as any).badge && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                  {(item as any).badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Settings Navigation */}
      <div className="mt-6 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Administration
        </p>
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t dark:border-slate-800">
        <div className="px-3 py-2">
          <p className="text-xs text-slate-400">
            Seetu v1.0
          </p>
        </div>
      </div>
    </nav>
  );
}
