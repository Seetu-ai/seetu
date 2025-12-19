import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardHeader } from '@/components/dashboard/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user from database with brands
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: {
      brands: {
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' },
        ],
      },
    },
  });

  if (!user) {
    // User not found in DB - redirect to onboarding to create
    redirect('/onboarding');
  }

  // If no brands, redirect to onboarding
  if (user.brands.length === 0) {
    redirect('/onboarding');
  }

  const defaultBrand = user.brands.find(b => b.isDefault) || user.brands[0];

  // Prepare context data
  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    credits: Math.floor(user.creditUnits / 100),
    creditUnits: user.creditUnits,
    plan: user.plan,
    businessType: user.businessType,
  };

  const brandData = {
    id: defaultBrand.id,
    name: defaultBrand.name,
    instagramHandle: defaultBrand.instagramHandle,
    isDefault: defaultBrand.isDefault,
  };

  const allBrands = user.brands.map(b => ({
    id: b.id,
    name: b.name,
    isDefault: b.isDefault,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardHeader user={userData} brand={brandData} brands={allBrands} />
      <div className="flex">
        <DashboardNav user={userData} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 md:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
