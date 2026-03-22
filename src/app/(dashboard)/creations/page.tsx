'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Camera,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Calendar,
  ChevronRight,
  Sparkles,
  Printer,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shoot {
  id: string;
  name: string | null;
  status: string;
  totalJobs: number;
  completedJobs: number;
  createdAt: string;
  templatePack: { name: string } | null;
  jobs: { id: string; outputUrl: string | null; status: string }[];
  isStudioSession?: boolean;
  backgroundName?: string;
}

interface PrintDesign {
  id: string;
  product_name: string;
  quantity: number;
  status: string;
  design_url?: string;
  created_at: string;
  order_number?: string;
}

type TabType = 'all' | 'studio' | 'print';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const { data: shootsData, isLoading: shootsLoading } = useSWR<{ shoots: Shoot[] }>(
    '/api/v1/shoots',
    fetcher
  );

  const { data: ordersData, isLoading: ordersLoading } = useSWR<{ orders: any[] }>(
    '/api/v1/print/orders',
    fetcher
  );

  const isLoading = shootsLoading || ordersLoading;
  const shoots = shootsData?.shoots || [];
  const orders = ordersData?.orders || [];

  // Extract print designs from orders
  const printDesigns: PrintDesign[] = orders.flatMap((order: any) =>
    (order.items || []).map((item: any) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      status: order.status,
      design_url: item.design_url,
      created_at: order.created_at,
      order_number: order.order_number,
    }))
  );

  const tabs = [
    { id: 'all' as const, label: 'Tout', count: shoots.length + printDesigns.length },
    { id: 'studio' as const, label: 'Studio', icon: Layers, count: shoots.length },
    { id: 'print' as const, label: 'Imprimerie', icon: Printer, count: printDesigns.length },
  ];

  const getStatusBadge = (status: string, type: 'studio' | 'print') => {
    const studioConfig: Record<string, any> = {
      pending: { label: 'En attente', icon: Clock, className: 'bg-slate-100 text-slate-700' },
      processing: { label: 'En cours', icon: Loader2, className: 'bg-blue-100 text-blue-700' },
      completed: { label: 'Terminé', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      failed: { label: 'Échoué', icon: AlertCircle, className: 'bg-red-100 text-red-700' },
    };

    const printConfig: Record<string, any> = {
      draft: { label: 'Brouillon', icon: Clock, className: 'bg-slate-100 text-slate-700' },
      confirmed: { label: 'Confirmé', icon: CheckCircle, className: 'bg-blue-100 text-blue-700' },
      processing: { label: 'Production', icon: Loader2, className: 'bg-amber-100 text-amber-700' },
      delivered: { label: 'Livré', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    };

    const config = (type === 'studio' ? studioConfig : printConfig)[status] ||
      { label: status, icon: Clock, className: 'bg-slate-100 text-slate-700' };

    const Icon = config.icon;
    return (
      <Badge className={cn(config.className, 'gap-1')}>
        <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Combine and sort all creations by date
  const allCreations = [
    ...shoots.map((s) => ({ ...s, type: 'studio' as const, sortDate: new Date(s.createdAt) })),
    ...printDesigns.map((p) => ({ ...p, type: 'print' as const, sortDate: new Date(p.created_at) })),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const filteredCreations = activeTab === 'all'
    ? allCreations
    : allCreations.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Mes Créations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Tous vos designs et photos générés
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/studio">
            <Button variant="outline" className="gap-2">
              <Layers className="h-4 w-4" />
              Studio
            </Button>
          </Link>
          <Link href="/print/builder">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Printer className="h-4 w-4" />
              Imprimerie
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-xs',
              activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCreations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Aucune création
            </h3>
            <p className="text-slate-500 text-center mb-6 max-w-sm">
              Commencez à créer des photos produits ou des designs pour l'impression.
            </p>
            <div className="flex gap-3">
              <Link href="/studio">
                <Button variant="outline" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Ouvrir le Studio
                </Button>
              </Link>
              <Link href="/print/builder">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Printer className="h-4 w-4" />
                  Commander des impressions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creations List */}
      {!isLoading && filteredCreations.length > 0 && (
        <div className="grid gap-4">
          {filteredCreations.map((creation) => {
            if (creation.type === 'studio') {
              const shoot = creation as Shoot & { type: 'studio' };
              return (
                <Link key={`studio-${shoot.id}`} href={`/shoots/${shoot.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded-lg overflow-hidden relative">
                          {shoot.jobs?.[0]?.outputUrl ? (
                            <Image
                              src={shoot.jobs[0].outputUrl}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {shoot.name || shoot.templatePack?.name || 'Shoot sans nom'}
                            </h3>
                            <Badge className="bg-violet-100 text-violet-700 gap-1">
                              <Sparkles className="h-3 w-3" />
                              Studio
                            </Badge>
                            {getStatusBadge(shoot.status, 'studio')}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-4 w-4" />
                              {shoot.completedJobs}/{shoot.totalJobs} images
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(shoot.createdAt)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            } else {
              const design = creation as PrintDesign & { type: 'print' };
              return (
                <Link key={`print-${design.id}`} href={`/print/orders`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-20 h-20 bg-emerald-50 rounded-lg overflow-hidden relative flex items-center justify-center">
                          {design.design_url ? (
                            <Image
                              src={design.design_url}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Printer className="h-8 w-8 text-emerald-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {design.product_name}
                            </h3>
                            <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                              <Printer className="h-3 w-3" />
                              Imprimerie
                            </Badge>
                            {getStatusBadge(design.status, 'print')}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>{design.quantity} exemplaires</span>
                            {design.order_number && (
                              <span className="font-mono text-xs">#{design.order_number}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(design.created_at)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
