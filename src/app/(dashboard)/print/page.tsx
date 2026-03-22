'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Package,
  FileText,
  Truck,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { healthAPI } from '@/lib/print/api-client';

interface ServiceStatus {
  status: 'checking' | 'online' | 'offline';
}

export default function PrintPage() {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({ status: 'checking' });

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      await healthAPI.check();
      setServiceStatus({ status: 'online' });
    } catch {
      setServiceStatus({ status: 'offline' });
    }
  };

  const features = [
    {
      title: 'Constructeur de devis',
      description: 'Créez votre commande avec l\'assistant IA et visualisez en temps réel.',
      icon: MessageSquare,
      href: '/print/builder',
      badge: 'Populaire',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Catalogue Produits',
      description: 'T-shirts, casquettes, flyers, cartes de visite, packaging...',
      icon: Package,
      href: '/print/builder',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Mes Commandes',
      description: 'Suivez vos commandes en cours et consultez l\'historique.',
      icon: FileText,
      href: '/print/orders',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Suivi Livraison',
      description: 'Suivez vos colis en temps réel avec PAPS.',
      icon: Truck,
      href: '/print/orders',
      color: 'bg-amber-100 text-amber-700',
    },
  ];

  const highlights = [
    'Plus de 100 produits imprimables',
    'Réseau de prestataires locaux',
    'Devis instantanés ou sur mesure',
    'Livraison partout au Sénégal',
    'Design IA avec votre marque',
    'Paiement Wave / Orange Money',
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">Imprimerie</h1>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Nouveau
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Imprimez vos créations sur des produits physiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          {serviceStatus.status === 'checking' && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification du service...</span>
            </div>
          )}
          {serviceStatus.status === 'online' && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Service en ligne</span>
            </div>
          )}
          {serviceStatus.status === 'offline' && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <XCircle className="h-4 w-4" />
              <span>Service indisponible</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Start CTA */}
      <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 border-0 text-white">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                <h2 className="text-xl font-semibold">Commencer une commande</h2>
              </div>
              <p className="text-white/80 max-w-xl">
                Décrivez ce dont vous avez besoin en langage naturel. Notre assistant IA vous guidera
                pour créer votre commande parfaite.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-white text-violet-700 hover:bg-white/90 shrink-0"
            >
              <Link href="/print/builder">
                <MessageSquare className="h-5 w-5 mr-2" />
                Créer un devis
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${feature.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {feature.badge && (
                      <Badge variant="secondary" className="bg-violet-100 text-violet-700 text-xs">
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-1 group-hover:text-violet-700 transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                  <div className="mt-4 flex items-center text-sm text-violet-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Accéder</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pourquoi notre service d'impression ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {highlights.map((highlight, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Use Studio Images CTA */}
      <Card className="border-dashed border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900">Utilisez vos créations Seetu</h3>
              <p className="text-sm text-slate-500 mt-1">
                Les images générées dans le Studio peuvent être imprimées sur des produits
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/studio">
                Ouvrir le Studio
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
