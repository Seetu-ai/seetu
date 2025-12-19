'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, ChevronDown, Menu, Store } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardNav } from './nav';
import { CreditsBadge } from './credits-badge';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  credits: number;
  creditUnits: number;
  plan: string;
}

interface BrandData {
  id: string;
  name: string;
  instagramHandle: string | null;
  isDefault: boolean;
}

interface HeaderProps {
  user: UserData;
  brand: BrandData;
  brands: { id: string; name: string; isDefault: boolean }[];
}

export function DashboardHeader({ user, brand, brands }: HeaderProps) {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getPlanBadge = (plan: string) => {
    const planLabels: Record<string, string> = {
      free: 'Gratuit',
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    const planColors: Record<string, string> = {
      free: 'bg-slate-100 text-slate-700',
      starter: 'bg-blue-100 text-blue-700',
      pro: 'bg-violet-100 text-violet-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    return (
      <Badge className={planColors[plan] || planColors.free} variant="secondary">
        {planLabels[plan] || plan}
      </Badge>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/95 dark:border-slate-800">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Logo and Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <DashboardNav user={user} mobile />
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white hidden sm:inline">
              CABINE
            </span>
          </Link>

          {/* Brand selector */}
          {brands.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                  <Store className="h-4 w-4" />
                  {brand.name}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Mes marques</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {brands.map((b) => (
                  <DropdownMenuItem key={b.id} className="cursor-pointer">
                    {b.name}
                    {b.isDefault && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Par défaut
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: Credits and User */}
        <div className="flex items-center gap-3">
          {/* Credits - Client-side component for real-time updates */}
          <CreditsBadge />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || 'Utilisateur'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <div className="pt-1">{getPlanBadge(user.plan)}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
