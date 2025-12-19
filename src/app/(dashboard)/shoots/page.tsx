'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shoot {
  id: string;
  name: string | null;
  status: string;
  totalJobs: number;
  completedJobs: number;
  createdAt: string;
  templatePack: {
    name: string;
  } | null;
  _count: {
    jobs: number;
  };
  jobs: {
    id: string;
    outputUrl: string | null;
    status: string;
  }[];
  // Studio session fields
  isStudioSession?: boolean;
  presentation?: string;
  sceneType?: string;
  backgroundName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ShootsPage() {
  const { data, error, isLoading } = useSWR<{ shoots: Shoot[] }>(
    '/api/v1/shoots',
    fetcher
  );

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', icon: Clock, className: 'bg-slate-100 text-slate-700' },
      processing: { label: 'En cours', icon: Loader2, className: 'bg-blue-100 text-blue-700' },
      completed: { label: 'Terminé', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      failed: { label: 'Échoué', icon: AlertCircle, className: 'bg-red-100 text-red-700' },
    }[status] || { label: status, icon: Clock, className: 'bg-slate-100 text-slate-700' };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-500">Erreur lors du chargement des shoots</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Shoots
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Vos sessions de génération d'images
          </p>
        </div>
        <Link href="/studio">
          <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600">
            <Plus className="h-4 w-4" />
            Nouveau shoot
          </Button>
        </Link>
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
      {!isLoading && data?.shoots?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Aucun shoot
            </h3>
            <p className="text-slate-500 text-center mb-6 max-w-sm">
              Créez votre premier shoot pour générer des images professionnelles de vos produits.
            </p>
            <Link href="/studio">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un shoot
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Shoots List */}
      {!isLoading && data?.shoots && data.shoots.length > 0 && (
        <div className="grid gap-4">
          {data.shoots.map((shoot) => (
            <Link key={shoot.id} href={`/shoots/${shoot.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Preview thumbnails */}
                    <div className="flex-shrink-0 w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {shoot.name || shoot.templatePack?.name || 'Shoot sans nom'}
                        </h3>
                        {shoot.isStudioSession && (
                          <Badge className="bg-violet-100 text-violet-700 gap-1">
                            <Sparkles className="h-3 w-3" />
                            Studio
                          </Badge>
                        )}
                        {getStatusBadge(shoot.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" />
                          {shoot.completedJobs}/{shoot.totalJobs} images
                        </span>
                        {shoot.backgroundName && (
                          <span className="text-slate-400 truncate max-w-[150px]">
                            {shoot.backgroundName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(shoot.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
