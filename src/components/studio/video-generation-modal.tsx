'use client';

import { useState, useEffect } from 'react';
import { Film, Loader2, X, Play, Download, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VideoGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceImageUrl: string;
}

type Duration = 5 | 10;
type Quality = 'standard' | 'pro';

const PRICING = {
  '5-standard': { credits: 3, label: '3 crédits' },
  '5-pro': { credits: 6, label: '6 crédits' },
  '10-standard': { credits: 5, label: '5 crédits' },
  '10-pro': { credits: 10, label: '10 crédits' },
};

export function VideoGenerationModal({
  open,
  onOpenChange,
  sourceImageUrl,
}: VideoGenerationModalProps) {
  const [duration, setDuration] = useState<Duration>(5);
  const [quality, setQuality] = useState<Quality>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const priceKey = `${duration}-${quality}` as keyof typeof PRICING;
  const price = PRICING[priceKey];

  // Poll for video status
  useEffect(() => {
    if (!videoId || status === 'completed' || status === 'failed') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/videos/${videoId}`);
        const data = await res.json();

        if (data.status === 'completed' && data.outputUrl) {
          setVideoUrl(data.outputUrl);
          setStatus('completed');
          toast.success('Vidéo générée avec succès!');
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.errorMessage || 'La génération a échoué');
          toast.error('Erreur de génération vidéo');
        }
      } catch (err) {
        console.error('Error polling video status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [videoId, status]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setStatus('processing');

    try {
      const res = await fetch('/api/v1/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImageUrl,
          duration,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de génération');
      }

      setVideoId(data.videoId);
      toast.success('Génération démarrée! Cela peut prendre 1-2 minutes.');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error(err instanceof Error ? err.message : 'Erreur de génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `seetu-video-${Date.now()}.mp4`;
    link.click();
  };

  const handleClose = () => {
    if (status === 'processing') {
      toast.info('La vidéo continue de se générer en arrière-plan');
    }
    onOpenChange(false);
    // Reset state after close
    setTimeout(() => {
      setVideoId(null);
      setVideoUrl(null);
      setStatus('idle');
      setError(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-violet-600" />
            Animer votre image
          </DialogTitle>
          <DialogDescription>
            Transformez votre image en une courte vidéo avec des mouvements subtils
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview Image */}
          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-slate-200">
            <img
              src={sourceImageUrl}
              alt="Source"
              className="w-full h-full object-cover"
            />
            {status === 'processing' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            {status === 'completed' && videoUrl && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Play className="h-12 w-12 text-white" />
              </div>
            )}
          </div>

          {/* Video Preview when complete */}
          {status === 'completed' && videoUrl && (
            <div className="rounded-lg overflow-hidden border border-slate-200">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                muted
                className="w-full"
              />
            </div>
          )}

          {/* Options - only show before generation */}
          {status === 'idle' && (
            <>
              {/* Duration Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Durée
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDuration(5)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      duration === 5
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Clock className="h-5 w-5 mx-auto mb-1" />
                    <span className="font-medium">5 secondes</span>
                  </button>
                  <button
                    onClick={() => setDuration(10)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      duration === 10
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Clock className="h-5 w-5 mx-auto mb-1" />
                    <span className="font-medium">10 secondes</span>
                  </button>
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Qualité
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuality('standard')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      quality === 'standard'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="font-medium">Standard</span>
                    <p className="text-xs text-slate-500 mt-1">Bonne qualité</p>
                  </button>
                  <button
                    onClick={() => setQuality('pro')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      quality === 'pro'
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium">Pro</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Haute qualité</p>
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">Coût de génération</p>
                <p className="text-2xl font-bold text-violet-600">{price.label}</p>
              </div>
            </>
          )}

          {/* Processing Status */}
          {status === 'processing' && (
            <div className="bg-violet-50 rounded-lg p-4 text-center">
              <Loader2 className="h-6 w-6 text-violet-600 animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium text-violet-700">
                Génération en cours...
              </p>
              <p className="text-xs text-violet-600 mt-1">
                Cela peut prendre 1-2 minutes
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {status === 'idle' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Film className="h-4 w-4 mr-2" />
                )}
                Générer la vidéo
              </Button>
            </>
          )}

          {status === 'completed' && videoUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Fermer
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </>
          )}

          {status === 'processing' && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Continuer en arrière-plan
            </Button>
          )}

          {status === 'failed' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setStatus('idle');
                  setError(null);
                }}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              >
                Réessayer
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
