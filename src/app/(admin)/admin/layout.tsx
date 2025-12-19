import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Palette,
  Settings,
  ArrowLeft,
  Shield
} from 'lucide-react';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Check if user is superadmin
  const isSuperAdmin = SUPERADMIN_EMAILS.includes(authUser.email || '');

  if (!isSuperAdmin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Admin Header */}
      <header className="bg-red-600 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-lg">CABINE Admin</span>
            <span className="text-xs bg-red-700 px-2 py-1 rounded">SUPERADMIN</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-red-700">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'app
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-60px)] border-r border-slate-200 dark:border-slate-800 p-4">
          <nav className="space-y-2">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
            <Link
              href="/admin/templates"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Palette className="h-5 w-5" />
              Templates & Vibes
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5" />
              Paramètres
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
