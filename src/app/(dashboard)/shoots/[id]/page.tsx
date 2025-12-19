'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Expand,
} from 'lucide-react';
import Link from 'next/link';
import { ImagePreview, useImagePreview } from '@/components/ui/image-preview';

interface GenerationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  outputText: string | null;
  creditsCost: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  template: {
    name: string;
    type: string;
  };
  product: {
    name: string | null;
    thumbnailUrl: string;
  } | null;
}

interface Shoot {
  id: string;
  name: string;
  status: string;
  isQuickGenerate: boolean;
  createdAt: string;
  jobs: GenerationJob[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig = {
  queued: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'En cours', icon: Loader2, color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Terminé', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  failed: { label: 'Échoué', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export default function ShootDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shootId = params.id as string;
  const { previewState, openPreview, setPreviewOpen } = useImagePreview();

  const { data, error, isLoading, mutate } = useSWR<{ shoot: Shoot }>(
    `/api/v1/shoots/${shootId}`,
    fetcher,
    { refreshInterval: 5000 } // Poll for updates
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.shoot) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Shoot non trouvé
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Ce shoot n'existe pas ou a été supprimé.
        </p>
        <Button asChild>
          <Link href="/shoots">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux shoots
          </Link>
        </Button>
      </div>
    );
  }

  const { shoot } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shoots">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {shoot.isQuickGenerate ? 'Quick Generate' : shoot.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {new Date(shoot.createdAt).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shoot.jobs.map((job) => {
          const status = statusConfig[job.status];
          const StatusIcon = status.icon;

          return (
            <Card key={job.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Image */}
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 group">
                  {job.status === 'completed' && job.outputUrl ? (
                    <>
                      <img
                        src={job.outputUrl}
                        alt="Generated"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          const completedJobs = shoot.jobs.filter(j => j.status === 'completed' && j.outputUrl);
                          const images = completedJobs.map(j => ({
                            url: j.outputUrl!,
                            alt: j.template.name,
                            id: j.id,
                          }));
                          const index = completedJobs.findIndex(j => j.id === job.id);
                          openPreview(images, index);
                        }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const completedJobs = shoot.jobs.filter(j => j.status === 'completed' && j.outputUrl);
                            const images = completedJobs.map(j => ({
                              url: j.outputUrl!,
                              alt: j.template.name,
                              id: j.id,
                            }));
                            const index = completedJobs.findIndex(j => j.id === job.id);
                            openPreview(images, index);
                          }}
                        >
                          <Expand className="h-4 w-4 mr-1" />
                          Agrandir
                        </Button>
                      </div>
                    </>
                  ) : job.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-violet-500 animate-spin" />
                    </div>
                  ) : job.status === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <XCircle className="h-12 w-12 text-red-500 mb-2" />
                      <p className="text-sm text-red-600 text-center">
                        {job.errorMessage || 'Échec de la génération'}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Clock className="h-12 w-12 text-slate-400" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={status.color}>
                      <StatusIcon className={`h-3 w-3 mr-1 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {job.template.name}
                  </p>
                  {job.product && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {job.product.name || 'Produit'}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      {job.creditsCost / 100} crédit(s)
                    </span>
                    {job.status === 'completed' && job.outputUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.outputUrl} download target="_blank">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {shoot.jobs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600 dark:text-slate-400">
              Aucune génération dans ce shoot.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      <ImagePreview
        images={previewState.images}
        initialIndex={previewState.index}
        open={previewState.open}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
