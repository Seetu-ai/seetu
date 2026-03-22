'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, Monitor, Upload, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Billboard {
  id: string;
  name: string;
  slug: string;
  address: string;
  location: { lat: number; lng: number };
  resolution: { width: number; height: number };
  pricing: {
    pricePerSlot: number;
    slotDurationMins: number;
  };
  status: string;
  previewImageUrl: string | null;
  queueLength: number;
  isAvailable: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BillboardsPage() {
  const { data, isLoading } = useSWR<{ billboards: Billboard[] }>(
    '/api/v1/billboards',
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Panneaux Publicitaires
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Diffusez votre publicité sur les panneaux numériques de Dakar
          </p>
        </div>
        <Link href="/billboards/upload">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Upload className="h-4 w-4 mr-2" />
            Publier une annonce
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium">Téléchargez</h3>
              <p className="text-sm text-white/80">Image ou vidéo (max 60s)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium">Choisissez</h3>
              <p className="text-sm text-white/80">Sélectionnez vos panneaux</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium">Diffusez</h3>
              <p className="text-sm text-white/80">Payez et c'est parti !</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billboard Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Panneaux disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.billboards.map((billboard) => (
            <Card
              key={billboard.id}
              className={`overflow-hidden hover:shadow-lg transition-shadow ${
                !billboard.isAvailable ? 'opacity-60' : ''
              }`}
            >
              {/* Preview */}
              <div className="relative aspect-video bg-slate-100">
                {billboard.previewImageUrl ? (
                  <img
                    src={billboard.previewImageUrl}
                    alt={billboard.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Monitor className="h-12 w-12 text-slate-300" />
                  </div>
                )}
                {!billboard.isAvailable && (
                  <Badge className="absolute top-2 left-2 bg-amber-500">
                    Maintenance
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1">{billboard.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                  <MapPin className="h-3 w-3" />
                  {billboard.address}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">
                    {billboard.resolution.width}x{billboard.resolution.height}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {billboard.pricing.slotDurationMins} min
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-lg font-bold text-violet-600">
                      {billboard.pricing.pricePerSlot.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-slate-500">par diffusion</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">
                      {billboard.queueLength} en file
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* My Content Link */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Mes publicités</h3>
            <p className="text-sm text-slate-500">
              Suivez le statut de vos diffusions
            </p>
          </div>
          <Link href="/billboards/my-content">
            <Button variant="outline">
              Voir mes contenus
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl">
            📱
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-green-800">
              Publiez par WhatsApp
            </h3>
            <p className="text-sm text-green-700 mb-3">
              Envoyez votre publicité directement via WhatsApp, sans créer de compte !
            </p>
            <Button className="bg-green-600 hover:bg-green-700">
              Ouvrir WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
