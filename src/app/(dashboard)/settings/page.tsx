'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  Palette,
  CreditCard,
  Bell,
  Shield,
  ChevronRight
} from 'lucide-react';

const settingsItems = [
  {
    title: 'Informations',
    description: 'Nom, logo et informations de l\'entreprise',
    icon: Building2,
    href: '/settings/branding',
  },
  {
    title: 'Équipe',
    description: 'Gérer les membres et les permissions',
    icon: Users,
    href: '/settings/team',
  },
  {
    title: 'Apparence',
    description: 'Personnaliser les couleurs et le thème',
    icon: Palette,
    href: '/settings/branding',
  },
  {
    title: 'Facturation',
    description: 'Historique des paiements et factures',
    icon: CreditCard,
    href: '/credits',
  },
];

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Paramètres
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Configurez votre espace de travail
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsItems.map((item) => (
          <Link key={item.title} href={`/${slug}${item.href}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
