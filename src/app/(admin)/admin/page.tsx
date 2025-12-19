import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Palette, Zap } from 'lucide-react';

export default async function AdminDashboard() {
  const [userCount, brandCount, templatePackCount, jobCount] = await Promise.all([
    prisma.user.count(),
    prisma.brand.count(),
    prisma.templatePack.count(),
    prisma.generationJob.count(),
  ]);

  const stats = [
    { label: 'Utilisateurs', value: userCount, icon: Users, color: 'text-blue-600' },
    { label: 'Marques', value: brandCount, icon: Package, color: 'text-green-600' },
    { label: 'Template Packs', value: templatePackCount, icon: Palette, color: 'text-purple-600' },
    { label: 'Générations', value: jobCount, icon: Zap, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Vue d'ensemble de la plateforme CABINE.AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
