'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Download,
  Trash2,
  Loader2,
  Image,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { use } from 'react';

interface CampaignImage {
  id: string;
  outputUrl?: string;
  approved?: boolean;
  sortOrder: number;
  caption?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  targetCount: number;
  generatedCount: number;
  styleLock: object;
  styleSeed?: number;
  template?: { id: string; name: string; nameFr: string };
  brand?: { id: string; name: string };
  images: CampaignImage[];
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/v1/campaigns/${id}`);
      const data = await res.json();
      if (data.campaign) {
        setCampaign(data.campaign);
      } else if (data.error) {
        toast.error(data.error);
        router.push('/campaigns');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      toast.error('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNext = async () => {
    if (!campaign) return;

    setIsGenerating(true);

    try {
      const res = await fetch(`/api/v1/campaigns/${id}/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de génération');
      }

      toast.success('Image générée avec succès!');
      fetchCampaign(); // Refresh to get new image
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    if (!campaign) return;

    campaign.images
      .filter((img) => img.outputUrl)
      .forEach((img, i) => {
        const link = document.createElement('a');
        link.href = img.outputUrl!;
        link.download = `${campaign.name}-${i + 1}.png`;
        link.click();
      });

    toast.success('Téléchargement lancé!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Campagne non trouvée</p>
      </div>
    );
  }

  const completedImages = campaign.images.filter((img) => img.outputUrl);
  const remainingCount = campaign.targetCount - campaign.generatedCount;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux campagnes
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {campaign.template && (
                <span className="text-sm text-slate-500">
                  Template: {campaign.template.nameFr || campaign.template.name}
                </span>
              )}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  campaign.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : campaign.status === 'active'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                {campaign.status === 'completed'
                  ? 'Terminée'
                  : campaign.status === 'active'
                  ? 'En cours'
                  : 'Brouillon'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {completedImages.length > 0 && (
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger tout
              </Button>
            )}
            {remainingCount > 0 && (
              <Button
                onClick={handleGenerateNext}
                disabled={isGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Générer ({remainingCount} restantes)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progression</span>
          <span className="text-sm text-slate-500">
            {campaign.generatedCount} / {campaign.targetCount} images
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all"
            style={{
              width: `${(campaign.generatedCount / campaign.targetCount) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Generated images */}
        {completedImages.map((img, i) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
          >
            <img
              src={img.outputUrl}
              alt={`Campaign image ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = img.outputUrl!;
                  link.download = `${campaign.name}-${i + 1}.png`;
                  link.click();
                }}
                className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-xs text-white">
              #{i + 1}
            </div>
            {img.approved && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
          </div>
        ))}

        {/* Placeholder slots for remaining */}
        {[...Array(remainingCount)].map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50"
          >
            <div className="text-center text-slate-400">
              <Image className="h-8 w-8 mx-auto mb-2" />
              <span className="text-xs">#{completedImages.length + i + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Generate All Button */}
      {remainingCount > 0 && remainingCount > 1 && (
        <div className="mt-8 text-center">
          <p className="text-slate-500 mb-4">
            Vous pouvez générer toutes les images restantes d&apos;un coup
          </p>
          <Button
            onClick={handleGenerateNext}
            disabled={isGenerating}
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Générer les {remainingCount} images restantes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
