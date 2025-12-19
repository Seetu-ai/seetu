'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useWizardStore } from '@/lib/stores/wizard-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Fingerprint,
  Check,
  Loader2,
  Plus,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  instagramHandle: string | null;
  isDefault: boolean;
  visualDNA: {
    palette?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    vibe_summary?: string;
    visual_tokens?: string[];
  } | null;
  verbalDNA: {
    primary_language?: string;
    tone?: string;
    emoji_palette?: string[];
  } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StepBrand() {
  const {
    selectedBrandId,
    setSelectedBrand,
    nextStep,
  } = useWizardStore();

  // Fetch brands
  const { data, isLoading } = useSWR<{ brands: Brand[] }>(
    '/api/v1/brands',
    fetcher
  );
  const brands = data?.brands || [];

  // Auto-select default brand if none selected
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      const defaultBrand = brands.find(b => b.isDefault) || brands[0];
      setSelectedBrand(defaultBrand.id);
    }
  }, [brands, selectedBrandId, setSelectedBrand]);

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const handleSelectBrand = (brandId: string) => {
    setSelectedBrand(brandId);
  };

  const handleContinue = () => {
    if (selectedBrandId) {
      nextStep();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
          <Fingerprint className="h-6 w-6 text-violet-600" />
        </div>
        <h3 className="text-sm font-medium text-slate-900 mb-1">
          Aucune marque configurée
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Créez une marque pour personnaliser vos générations
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/settings/branding', '_blank')}
        >
          <Plus className="h-4 w-4 mr-1" />
          Créer une marque
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Fingerprint className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-violet-800 font-medium">
              Sélectionnez votre marque
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              Les images et captions seront générées dans le style de cette marque
            </p>
          </div>
        </div>
      </div>

      {/* Brand Cards */}
      <div className="space-y-2">
        {brands.map((brand) => {
          const isSelected = brand.id === selectedBrandId;
          const hasVisualDNA = brand.visualDNA?.palette;
          const hasVerbalDNA = brand.verbalDNA?.tone;

          return (
            <div
              key={brand.id}
              onClick={() => handleSelectBrand(brand.id)}
              className={cn(
                'relative rounded-xl border-2 p-3 cursor-pointer transition-all',
                isSelected
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Color bar */}
              {hasVisualDNA && brand.visualDNA?.palette && (
                <div className="flex rounded overflow-hidden mb-2 h-2">
                  <div
                    className="flex-1"
                    style={{ backgroundColor: brand.visualDNA.palette.primary }}
                  />
                  <div
                    className="flex-1"
                    style={{ backgroundColor: brand.visualDNA.palette.secondary }}
                  />
                  <div
                    className="flex-1"
                    style={{ backgroundColor: brand.visualDNA.palette.accent }}
                  />
                </div>
              )}

              {/* Brand info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">{brand.name}</h4>
                  {brand.instagramHandle && (
                    <p className="text-xs text-slate-500">@{brand.instagramHandle}</p>
                  )}
                </div>
                {brand.isDefault && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                    défaut
                  </span>
                )}
              </div>

              {/* DNA Status */}
              <div className="flex items-center gap-2 mt-2">
                {hasVisualDNA && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    Visuel
                  </span>
                )}
                {hasVerbalDNA && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    Verbal
                  </span>
                )}
                {brand.verbalDNA?.primary_language && (
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                    {brand.verbalDNA.primary_language === 'english' ? 'EN' :
                     brand.verbalDNA.primary_language === 'french' ? 'FR' :
                     brand.verbalDNA.primary_language === 'french_wolof_mix' ? 'FR+WO' :
                     brand.verbalDNA.primary_language}
                  </span>
                )}
                {!hasVisualDNA && !hasVerbalDNA && (
                  <span className="text-[10px] text-amber-600">
                    Non analysé
                  </span>
                )}
              </div>

              {/* Emoji palette preview */}
              {brand.verbalDNA?.emoji_palette && brand.verbalDNA.emoji_palette.length > 0 && (
                <p className="text-xs mt-1.5">
                  {brand.verbalDNA.emoji_palette.slice(0, 5).join(' ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add brand link */}
      <button
        onClick={() => window.open('/settings/branding', '_blank')}
        className="w-full text-xs text-violet-600 hover:text-violet-700 flex items-center justify-center gap-1 py-2"
      >
        <Plus className="h-3 w-3" />
        Ajouter une marque
        <ExternalLink className="h-3 w-3" />
      </button>

      {/* Continue button */}
      <Button
        onClick={handleContinue}
        disabled={!selectedBrandId}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        Continuer
      </Button>
    </div>
  );
}
