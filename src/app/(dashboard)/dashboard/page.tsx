import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  Camera,
  Zap,
  CreditCard,
  ArrowRight,
  Sparkles,
  ImageIcon,
  Plus,
} from 'lucide-react';

export default async function DashboardPage() {
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user with brands
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { brands: true },
  });

  if (!user) {
    redirect('/login');
  }

  if (user.brands.length === 0) {
    redirect('/onboarding');
  }

  const defaultBrand = user.brands.find(b => b.isDefault) || user.brands[0];

  // Get stats for current user
  const [productsCount, shootsCount, recentJobs, recentStudioSessions] = await Promise.all([
    prisma.product.count({ where: { brandId: defaultBrand.id } }),
    prisma.shoot.count({ where: { userId: user.id } }),
    prisma.generationJob.findMany({
      where: {
        shoot: { userId: user.id },
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
      take: 6,
      include: {
        product: true,
      },
    }),
    prisma.studioSession.findMany({
      where: {
        userId: user.id,
        status: 'completed',
        generatedUrls: { isEmpty: false },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  // Combine recent generations from both sources
  const studioImages = recentStudioSessions.flatMap(session =>
    session.generatedUrls.map(url => ({
      id: `${session.id}-${url}`,
      outputUrl: url,
      createdAt: session.createdAt,
      source: 'studio' as const,
    }))
  );

  const jobImages = recentJobs
    .filter(job => job.outputUrl)
    .map(job => ({
      id: job.id,
      outputUrl: job.outputUrl!,
      createdAt: job.completedAt || new Date(),
      source: 'job' as const,
      productName: job.product?.name,
    }));

  const recentGenerations = [...studioImages, ...jobImages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const credits = Math.floor(user.creditUnits / 100);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Bienvenue, {user.name || 'Utilisateur'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {defaultBrand.name} - Votre studio photo IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/products">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter produit
            </Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600">
            <Link href="/studio">
              <Zap className="mr-2 h-4 w-4" />
              Générer
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Crédits</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credits}</div>
            <p className="text-xs text-slate-500">disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Produits</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsCount}</div>
            <p className="text-xs text-slate-500">dans la bibliothèque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Shoots</CardTitle>
            <Camera className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shootsCount}</div>
            <p className="text-xs text-slate-500">sessions créées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentGenerations.length}</div>
            <p className="text-xs text-slate-500">générées récemment</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/studio">
          <Card className="h-full hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-violet-600" />
              </div>
              <CardTitle className="text-lg">Studio</CardTitle>
              <CardDescription>
                Générez des photos professionnelles de vos produits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-violet-600 font-medium">
                Commencer
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shoots">
          <Card className="h-full hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Historique</CardTitle>
              <CardDescription>
                Consultez vos sessions photo et générations précédentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-purple-600 font-medium">
                Voir l'historique
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="h-full hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Produits</CardTitle>
              <CardDescription>
                Ajoutez et organisez vos photos de produits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-blue-600 font-medium">
                Voir les produits
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Generations */}
      {recentGenerations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Générations récentes</CardTitle>
              <CardDescription>Vos dernières images générées</CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/shoots">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden group relative"
                >
                  <img
                    src={gen.outputUrl}
                    alt="Generated image"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recentGenerations.length === 0 && productsCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Commencez votre aventure
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-sm mb-6">
              Ajoutez votre premier produit et générez des photos professionnelles en quelques clics.
            </p>
            <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600">
              <Link href="/products">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter mon premier produit
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
