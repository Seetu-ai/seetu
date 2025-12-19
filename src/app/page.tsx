import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    // Get user from our database, or create if doesn't exist
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: { brands: true },
    });

    // Create user if doesn't exist (fallback for direct Supabase signups)
    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          avatarUrl: authUser.user_metadata?.avatar_url,
          creditUnits: 300, // Give new users 3 free credits
        },
        include: { brands: true },
      });
    }

    // If user has brands, go to dashboard
    if (user.brands.length > 0) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              Cabine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600">
              <Link href="/signup">Commencer</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Studio Photo IA pour l&apos;Afrique
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            Créez des photos produits{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              professionnelles
            </span>{' '}
            en quelques clics
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            Transformez vos photos de produits en images de qualité studio grâce à l&apos;intelligence artificielle.
            Parfait pour les boutiques en ligne, les réseaux sociaux et les catalogues.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 text-lg px-8">
              <Link href="/signup">
                Essayer gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <p className="text-sm text-slate-500">
              3 crédits gratuits inclus
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Rapide et simple
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Uploadez votre photo, choisissez un style, et obtenez votre image en quelques secondes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Styles africains
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Des templates conçus pour les marchés africains: mode modest, food local, décors authentiques.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Paiement local
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Payez avec Wave, Orange Money ou carte bancaire. En francs CFA, sans complications.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; 2024 Cabine.ai - Tous droits réservés</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">
              Conditions
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
