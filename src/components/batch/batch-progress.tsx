'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BatchGenerationStatus {
  id: string;
  productId: string;
  productName?: string;
  productThumbnail?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string | null;
  errorMessage?: string | null;
}

interface BatchJobProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalProducts: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  estimatedCredits: number;
  usedCredits: number;
  generations: BatchGenerationStatus[];
}

interface BatchProgressProps {
  batchJobId: string;
  onComplete?: () => void;
}

export function BatchProgress({ batchJobId, onComplete }: BatchProgressProps) {
  const [progress, setProgress] = useState<BatchJobProgress | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/batch/${batchJobId}`);
        const data = await res.json();

        if (data.progress) {
          setProgress(data.progress);

          // Stop polling if completed or failed
          if (['completed', 'failed', 'partial'].includes(data.progress.status)) {
            setIsPolling(false);
            onComplete?.();
          }
        }
      } catch (err) {
        console.error('Error polling batch progress:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    return () => clearInterval(interval);
  }, [batchJobId, isPolling, onComplete]);

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const progressPercent = Math.round(
    (progress.processedCount / progress.totalProducts) * 100
  );

  const STATUS_CONFIG = {
    pending: { label: 'En attente', color: 'text-slate-500' },
    processing: { label: 'En cours', color: 'text-blue-600' },
    completed: { label: 'Terminé', color: 'text-green-600' },
    failed: { label: 'Échoué', color: 'text-red-600' },
    partial: { label: 'Partiel', color: 'text-amber-600' },
  };

  const statusConfig = STATUS_CONFIG[progress.status];

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Génération en lot
            </h3>
            <p className={cn('text-sm font-medium', statusConfig.color)}>
              {statusConfig.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              {progress.processedCount} / {progress.totalProducts}
            </p>
            <p className="text-sm text-slate-500">
              {progress.successCount} réussis, {progress.failedCount} échoués
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all"
              style={{
                width: `${(progress.successCount / progress.totalProducts) * 100}%`,
              }}
            />
            <div
              className="bg-red-400 transition-all"
              style={{
                width: `${(progress.failedCount / progress.totalProducts) * 100}%`,
              }}
            />
            {progress.status === 'processing' && (
              <div
                className="bg-blue-400 animate-pulse transition-all"
                style={{ width: '5%' }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>Crédits utilisés: {Math.floor(progress.usedCredits / 100)}</span>
          <span>Estimé: {Math.floor(progress.estimatedCredits / 100)} crédits</span>
        </div>
      </div>

      {/* Individual generations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {progress.generations.map((gen) => (
          <div
            key={gen.id}
            className={cn(
              'relative rounded-xl border overflow-hidden',
              gen.status === 'completed'
                ? 'border-green-200'
                : gen.status === 'failed'
                ? 'border-red-200'
                : gen.status === 'processing'
                ? 'border-blue-200'
                : 'border-slate-200'
            )}
          >
            {/* Image */}
            <div className="aspect-square bg-slate-100">
              {gen.outputUrl ? (
                <img
                  src={gen.outputUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : gen.productThumbnail ? (
                <img
                  src={gen.productThumbnail}
                  alt=""
                  className="w-full h-full object-cover opacity-50"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-slate-300" />
                </div>
              )}

              {/* Status overlay */}
              {gen.status === 'processing' && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="absolute top-2 right-2">
              {gen.status === 'completed' && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
              {gen.status === 'failed' && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
              )}
              {gen.status === 'processing' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Product name */}
            <div className="p-2 bg-white">
              <p className="text-xs text-slate-600 truncate">
                {gen.productName || 'Produit'}
              </p>
              {gen.errorMessage && (
                <p className="text-xs text-red-500 truncate mt-0.5">
                  {gen.errorMessage}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Download all button */}
      {progress.status === 'completed' && progress.successCount > 0 && (
        <div className="text-center">
          <Button
            onClick={() => {
              progress.generations
                .filter((g) => g.outputUrl)
                .forEach((g, i) => {
                  const link = document.createElement('a');
                  link.href = g.outputUrl!;
                  link.download = `batch-${i + 1}.png`;
                  link.click();
                });
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger tous ({progress.successCount} images)
          </Button>
        </div>
      )}
    </div>
  );
}
