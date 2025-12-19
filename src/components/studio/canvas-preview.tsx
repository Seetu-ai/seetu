'use client';

import { useState, useEffect } from 'react';
import { useWizardStore } from '@/lib/stores/wizard-store';
import {
  Wand2,
  Info,
  Download,
  Plus,
  ImageIcon,
  RefreshCw,
  Loader2,
  Send,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CanvasPreview() {
  const [feedbackInput, setFeedbackInput] = useState('');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  const {
    products,
    activeProductIndex,
    generatedImages,
    isGenerating,
    iterationFeedback,
    setIterationFeedback,
    setGenerating,
    addGeneratedImage,
    getBrief,
    reset,
    useBrandStyle,
  } = useWizardStore();

  const activeProduct = products[activeProductIndex];
  const latestGeneratedImage = generatedImages[generatedImages.length - 1];

  // Reset edited caption when new image is generated
  useEffect(() => {
    if (latestGeneratedImage?.caption) {
      setEditedCaption(latestGeneratedImage.caption);
      setIsEditingCaption(false);
    }
  }, [latestGeneratedImage?.caption]);

  const handleCopyCaption = () => {
    if (latestGeneratedImage?.caption) {
      navigator.clipboard.writeText(latestGeneratedImage.caption);
      setCopiedCaption(true);
      toast.success('Caption copiée!');
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (products.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }

    // Set the feedback before regenerating
    if (feedbackInput.trim()) {
      setIterationFeedback(feedbackInput.trim());
    }

    setGenerating(true);

    try {
      const brief = getBrief();
      // Override with current feedback input
      if (feedbackInput.trim()) {
        brief.iterationFeedback = feedbackInput.trim();
      }

      const res = await fetch('/api/v1/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...brief,
          useBrandStyle, // Pass the toggle state for caption generation
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      if (result.outputUrl) {
        addGeneratedImage(result.outputUrl, result.caption);
        setFeedbackInput(''); // Clear feedback after successful generation
        setIterationFeedback(''); // Clear stored feedback
        toast.success('Nouvelle version générée!');
      } else {
        throw new Error('No output URL in response');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!latestGeneratedImage?.url) return;
    const link = document.createElement('a');
    link.href = latestGeneratedImage.url;
    link.download = `cabine-${Date.now()}.png`;
    link.click();
  };

  const handleNewSession = () => {
    reset();
  };

  return (
    <main className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Instagram-style Post Card */}
      <div className="relative z-10 w-[500px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Image Area */}
        <div className="relative aspect-square">
          {/* Empty State - Before Generation */}
          {!latestGeneratedImage?.url && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ImageIcon className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-slate-800 text-lg font-medium mb-2">
                Votre création apparaîtra ici
              </h3>
              <p className="text-slate-500 text-sm max-w-[300px]">
                Configurez vos options dans le panneau de gauche, puis cliquez sur Générer
              </p>
              {activeProduct && (
                <div className="mt-6 px-4 py-2 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Produit sélectionné:</p>
                  <p className="text-slate-800 text-sm font-medium">
                    {activeProduct.name || 'Produit'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
                <Wand2 className="absolute inset-0 m-auto h-8 w-8 text-violet-600" />
              </div>
              <p className="text-slate-800 text-lg font-medium mt-6">Génération en cours...</p>
              <p className="text-slate-500 text-sm mt-2">Cela peut prendre quelques secondes</p>
            </div>
          )}

          {/* Generated Image - After Generation */}
          {latestGeneratedImage?.url && !isGenerating && (
            <>
              <img
                src={latestGeneratedImage.url}
                alt="Generated"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Version indicator */}
              {generatedImages.length > 1 && (
                <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  Version {generatedImages.length}
                </div>
              )}
            </>
          )}
        </div>

        {/* Caption Area - IG Style */}
        {latestGeneratedImage?.caption && !isGenerating && (
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-start justify-between gap-2">
              {isEditingCaption ? (
                <Textarea
                  value={editedCaption}
                  onChange={(e) => setEditedCaption(e.target.value)}
                  className="flex-1 text-sm text-slate-800 leading-relaxed resize-none min-h-[60px] max-h-[120px]"
                  autoFocus
                  onBlur={() => setIsEditingCaption(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditingCaption(false);
                      setEditedCaption(latestGeneratedImage.caption || '');
                    }
                  }}
                />
              ) : (
                <p
                  className="text-sm text-slate-800 leading-relaxed flex-1 whitespace-pre-wrap max-h-[100px] overflow-y-auto cursor-pointer hover:bg-slate-50 rounded p-1 -m-1"
                  onClick={() => {
                    setEditedCaption(latestGeneratedImage.caption || '');
                    setIsEditingCaption(true);
                  }}
                  title="Cliquez pour modifier"
                >
                  {editedCaption || latestGeneratedImage.caption}
                </p>
              )}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditedCaption(latestGeneratedImage.caption || '');
                    setIsEditingCaption(true);
                  }}
                  className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  title="Modifier la caption"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const textToCopy = editedCaption || latestGeneratedImage.caption;
                    if (textToCopy) {
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedCaption(true);
                      toast.success('Caption copiée!');
                      setTimeout(() => setCopiedCaption(false), 2000);
                    }
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    copiedCaption
                      ? 'bg-green-100 text-green-600'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                  title="Copier la caption"
                >
                  {copiedCaption ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Cliquez sur le texte pour modifier • Copier avec le bouton
            </p>
          </div>
        )}
      </div>

      {/* Feedback Input - Show after generation */}
      {latestGeneratedImage?.url && !isGenerating && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[500px] z-20">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3">
            <div className="flex gap-2">
              <Input
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && feedbackInput.trim()) {
                    handleRegenerate();
                  }
                }}
                placeholder="Décrivez les modifications souhaitées... (ex: plus lumineux, angle différent)"
                className="flex-1 border-slate-200 text-sm"
              />
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Améliorer
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Appuyez sur Entrée ou cliquez sur Améliorer pour générer une nouvelle version
            </p>
          </div>
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-between px-10 z-20">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Info className="h-4 w-4" />
          <span>
            {latestGeneratedImage?.url
              ? 'Image générée avec succès!'
              : "L'IA respectera vos notes textuelles en priorité."
            }
          </span>
        </div>

        <div className="flex items-center gap-3">
          {latestGeneratedImage?.url && (
            <>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="border-slate-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button
                onClick={handleNewSession}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle création
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
