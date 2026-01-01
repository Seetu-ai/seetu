'use client';

import { useState } from 'react';
import {
  Upload,
  Sparkles,
  Loader2,
  Package,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BatchUpload } from '@/components/batch/batch-upload';
import { BatchProgress } from '@/components/batch/batch-progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'configure' | 'processing' | 'complete';
type Presentation = 'product_only' | 'on_model' | 'ghost';
type SceneType = 'studio' | 'real_place' | 'ai_generated';

interface UploadedFile {
  url: string;
  name: string;
}

export default function BatchPage() {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);

  // Style settings
  const [presentation, setPresentation] = useState<Presentation>('product_only');
  const [sceneType, setSceneType] = useState<SceneType>('studio');

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleCreateProducts = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Veuillez uploader des images');
      return;
    }

    setIsCreatingProducts(true);

    try {
      // Create products from uploaded images
      const res = await fetch('/api/v1/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedFiles.map((f) => ({
            imageUrl: f.url,
            name: f.name.replace(/\.[^.]+$/, ''),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de création');
      }

      setProductIds(data.productIds);
      setStep('configure');
      toast.success(`${data.productIds.length} produits créés`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setIsCreatingProducts(false);
    }
  };

  const handleStartBatch = async () => {
    if (productIds.length === 0) {
      toast.error('Aucun produit à générer');
      return;
    }

    try {
      const res = await fetch('/api/v1/studio/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          styleSettings: {
            presentation,
            sceneType,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de génération');
      }

      setBatchJobId(data.batchJobId);
      setStep('processing');
      toast.success('Génération démarrée!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de génération');
    }
  };

  const handleBatchComplete = () => {
    setStep('complete');
  };

  const handleReset = () => {
    setStep('upload');
    setUploadedFiles([]);
    setProductIds([]);
    setBatchJobId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Génération en lot
        </h1>
        <p className="text-slate-500 mt-1">
          Uploadez plusieurs produits et générez des images avec un style cohérent
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { key: 'upload', label: 'Upload', icon: Upload },
          { key: 'configure', label: 'Configuration', icon: Sparkles },
          { key: 'processing', label: 'Génération', icon: Package },
        ].map((s, i) => {
          const StepIcon = s.icon;
          const isActive = step === s.key;
          const isComplete =
            (s.key === 'upload' && ['configure', 'processing', 'complete'].includes(step)) ||
            (s.key === 'configure' && ['processing', 'complete'].includes(step)) ||
            (s.key === 'processing' && step === 'complete');

          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-violet-600 text-white'
                      : isComplete
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  )}
                >
                  <StepIcon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    'text-xs mt-2 font-medium',
                    isActive
                      ? 'text-violet-600'
                      : isComplete
                      ? 'text-green-600'
                      : 'text-slate-500'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    'w-20 h-0.5 mx-2',
                    isComplete ? 'bg-green-500' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-6">
            <BatchUpload
              maxFiles={20}
              onFilesUploaded={handleFilesUploaded}
            />

            {uploadedFiles.length > 0 && (
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  onClick={handleCreateProducts}
                  disabled={isCreatingProducts}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isCreatingProducts ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création des produits...
                    </>
                  ) : (
                    <>
                      Continuer
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Configure Step */}
        {step === 'configure' && (
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-slate-100">
              <p className="text-lg font-medium text-slate-900">
                {productIds.length} produits prêts
              </p>
              <p className="text-sm text-slate-500">
                Configurez le style de génération
              </p>
            </div>

            {/* Presentation */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                Type de présentation
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'product_only', label: 'Produit seul' },
                  { value: 'on_model', label: 'Sur modèle' },
                  { value: 'ghost', label: 'Mannequin invisible' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPresentation(opt.value as Presentation)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-center transition-all',
                      presentation === opt.value
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Type */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                Type de scène
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'studio', label: 'Studio' },
                  { value: 'real_place', label: 'Lieu réel' },
                  { value: 'ai_generated', label: 'Généré par IA' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSceneType(opt.value as SceneType)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-center transition-all',
                      sceneType === opt.value
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Credit estimate */}
            <div className="bg-violet-50 rounded-lg p-4 text-center">
              <p className="text-sm text-violet-700">Coût estimé</p>
              <p className="text-2xl font-bold text-violet-600">
                {productIds.length} crédits
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={handleStartBatch}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Lancer la génération
              </Button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {(step === 'processing' || step === 'complete') && batchJobId && (
          <div className="space-y-6">
            <BatchProgress
              batchJobId={batchJobId}
              onComplete={handleBatchComplete}
            />

            {step === 'complete' && (
              <div className="text-center pt-4 border-t border-slate-100">
                <Button onClick={handleReset} variant="outline">
                  Nouveau lot
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
