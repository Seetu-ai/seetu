'use client';

import { useState, useRef } from 'react';
import { useWizardStore } from '@/lib/stores/wizard-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Image,
  Palette,
  Loader2,
  X,
  Wand2,
  Sparkles,
  Upload,
  Check,
  Coins,
  User,
  MapPin,
} from 'lucide-react';

export function StepMoodboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    moodboard,
    setMoodboardUrl,
    setMoodboardNote,
    prevStep,
    isGenerating,
    setGenerating,
    addGeneratedImage,
    getBrief,
    products,
    presentation,
    scene,
    selectedBrandId,
  } = useWizardStore();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setMoodboardUrl(url);
      toast.success('Référence ajoutée');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (products.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }

    if (!selectedBrandId) {
      toast.error('Sélectionnez une marque');
      return;
    }

    setGenerating(true);

    try {
      const brief = getBrief();

      const res = await fetch('/api/v1/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...brief,
          useBrandStyle: true, // Always use brand style since brand is selected in step 1
        }),
      });

      const result = await res.json();
      console.log('[STUDIO] Generation result:', result);

      if (!res.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      if (result.outputUrl) {
        // Pass caption along with the image URL
        addGeneratedImage(result.outputUrl, result.caption);
        toast.success('Image générée!');
      } else {
        throw new Error('No output URL in response');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de génération');
    } finally {
      setGenerating(false);
    }
  };

  const removeMoodboard = () => {
    setMoodboardUrl('');
  };

  const canGenerate = products.length > 0 && selectedBrandId;
  const activeProduct = products[0];

  // Cost calculation
  const BASE_GENERATION_COST = 100; // 1 credit = 100 units
  const modelAsset = presentation.modelAsset;
  const locationAsset = scene.locationAsset;
  const modelFee = modelAsset?.priceUnits || 0;
  const locationFee = locationAsset?.priceUnits || 0;
  const totalCostUnits = BASE_GENERATION_COST + modelFee + locationFee;
  const totalCostCredits = totalCostUnits / 100;

  // Build summary of choices
  const getSummary = () => {
    const parts: string[] = [];

    if (activeProduct?.name) {
      parts.push(`"${activeProduct.name}"`);
    }

    const presentationLabels: Record<string, string> = {
      product_only: 'seul',
      on_model: 'sur modèle',
      ghost: 'en flat lay',
    };
    parts.push(presentationLabels[presentation.type] || '');

    // Add model name if selected
    if (presentation.type === 'on_model' && modelAsset) {
      parts.push(`(${modelAsset.title})`);
    }

    if (scene.backgroundName) {
      parts.push(`à ${scene.backgroundName.split(',')[0]}`);
    } else if (scene.type === 'ai_generated') {
      parts.push('avec décor IA');
    } else if (scene.type === 'studio') {
      parts.push('en studio');
    }

    return parts.filter(Boolean).join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Optional indicator */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-800 font-medium">
              Étape optionnelle
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ajoutez une référence de style ou passez directement à la génération
            </p>
          </div>
        </div>
      </div>

      {/* Summary of previous choices */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs text-slate-500 mb-1">Récapitulatif :</p>
        <p className="text-sm text-slate-700 font-medium">{getSummary()}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {activeProduct?.analysis?.colors?.slice(0, 2).map((color) => (
            <span key={color} className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
              {color}
            </span>
          ))}
          {presentation.note && (
            <span className="text-xs bg-violet-100 px-2 py-0.5 rounded-full text-violet-600">
              + note présentation
            </span>
          )}
          {scene.note && (
            <span className="text-xs bg-violet-100 px-2 py-0.5 rounded-full text-violet-600">
              + note scène
            </span>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {!moodboard.url ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5" />
            Référence visuelle (optionnel)
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed border-slate-200 rounded-xl h-[100px]',
              'flex flex-col items-center justify-center cursor-pointer',
              'text-slate-400 transition-all',
              'hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            ) : (
              <>
                <Upload className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium">Ajouter une image de référence</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Pour copier un style, une ambiance, une lumière...
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            Référence ajoutée
          </p>
          <div className="relative">
            <img
              src={moodboard.url}
              alt="Moodboard"
              className="w-full h-[100px] object-cover rounded-xl border border-slate-200"
            />
            <button
              onClick={removeMoodboard}
              className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Style Instruction */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <Palette className="h-3.5 w-3.5" />
          Instructions de style (optionnel) :
        </div>
        <Input
          value={moodboard.note || ''}
          onChange={(e) => setMoodboardNote(e.target.value)}
          placeholder="ex: Lumière dorée, style magazine Vogue, tons chauds..."
          className="bg-white border-slate-200 text-sm h-10"
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          onClick={prevStep}
          variant="outline"
          className="flex-1 border-slate-300"
        >
          Retour
        </Button>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Coins className="h-3.5 w-3.5" />
          Coût de la génération
        </div>
        <div className="space-y-1.5">
          {/* Base generation cost */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Génération d'image</span>
            <span className="font-medium text-slate-900">1 crédit</span>
          </div>

          {/* Model fee if selected */}
          {modelAsset && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-violet-500" />
                Mannequin: {modelAsset.title}
              </span>
              <span className="font-medium text-violet-600">
                +{modelFee / 100} crédit
              </span>
            </div>
          )}

          {/* Location fee if selected */}
          {locationAsset && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                Lieu: {locationAsset.title}
              </span>
              <span className="font-medium text-amber-600">
                +{locationFee / 100} crédit
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 mt-2">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="font-bold text-lg text-violet-600">
              {totalCostCredits} crédit{totalCostCredits !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Generate Button - Prominent */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={cn(
          'w-full h-14 text-base font-bold',
          'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700',
          'text-white shadow-lg shadow-violet-500/25',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5 mr-2" />
            GÉNÉRER L'IMAGE
          </>
        )}
      </Button>

      {!moodboard.url && !moodboard.note && !isGenerating && (
        <p className="text-xs text-slate-400 text-center">
          Vous pouvez générer directement ou ajouter une référence de style ci-dessus
        </p>
      )}
    </div>
  );
}
