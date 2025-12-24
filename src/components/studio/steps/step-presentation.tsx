'use client';

import { useState } from 'react';
import { useWizardStore, PresentationType } from '@/lib/stores/wizard-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Box, User, Shirt, Pen, ArrowRight, Sparkles, Users, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ModelBrowser } from '../model-browser';

const PRESENTATION_OPTIONS: {
  type: PresentationType;
  label: string;
  labelFr: string;
  description: string;
  icon: typeof Box;
}[] = [
  {
    type: 'product_only',
    label: 'Produit Seul',
    labelFr: 'Le produit seul',
    description: 'Photo packshot classique, le produit est mis en avant sans distraction',
    icon: Box,
  },
  {
    type: 'on_model',
    label: 'Sur Modèle',
    labelFr: 'Porté par un modèle',
    description: 'Le produit est porté ou tenu par un mannequin pour montrer son utilisation',
    icon: User,
  },
  {
    type: 'ghost',
    label: 'Ghost / Flat Lay',
    labelFr: 'Style fantôme',
    description: 'Vêtement présenté à plat ou en forme sans mannequin visible',
    icon: Shirt,
  },
];

export function StepPresentation() {
  const { presentation, setPresentation, setPresentationNote, setModelAsset, nextStep, prevStep, products, activeProductIndex } =
    useWizardStore();
  const [showNote, setShowNote] = useState(!!presentation.note);
  const [showModelBrowser, setShowModelBrowser] = useState(false);

  const activeProduct = products[activeProductIndex];
  const selectedOption = PRESENTATION_OPTIONS.find(o => o.type === presentation.type);
  const selectedModel = presentation.modelAsset;

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-violet-800 font-medium">
              Comment souhaitez-vous présenter{' '}
              {activeProduct?.name ? `"${activeProduct.name}"` : 'votre produit'} ?
            </p>
            <p className="text-xs text-violet-600 mt-1">
              Choisissez le style de mise en scène
            </p>
          </div>
        </div>
      </div>

      {/* Presentation Options - Vertical cards */}
      <div className="space-y-2">
        {PRESENTATION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = presentation.type === option.type;

          return (
            <button
              key={option.type}
              onClick={() => setPresentation(option.type)}
              className={cn(
                'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4',
                'bg-white hover:bg-slate-50',
                isActive
                  ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  isActive ? 'bg-violet-100' : 'bg-slate-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6',
                    isActive ? 'text-violet-600' : 'text-slate-500'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    isActive ? 'text-violet-900' : 'text-slate-800'
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
              </div>
              {isActive && (
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Model Selection (only for on_model) */}
      {presentation.type === 'on_model' && (
        <div className="space-y-3">
          {/* Model selection header */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-medium">
                  Choisissez un mannequin (optionnel)
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Utilisez un modèle de notre marketplace pour un rendu plus réaliste
                </p>
              </div>
            </div>
          </div>

          {/* Selected model preview OR select button */}
          {selectedModel ? (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="flex items-center gap-3">
                {selectedModel.thumbnailUrl ? (
                  <img
                    src={selectedModel.thumbnailUrl}
                    alt={selectedModel.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-violet-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-violet-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-violet-900 text-sm truncate">
                    {selectedModel.title}
                  </p>
                  <p className="text-xs text-violet-600">
                    par {selectedModel.creatorName}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-xs bg-violet-100 text-violet-700">
                    +{selectedModel.priceUnits / 100} crédit
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowModelBrowser(!showModelBrowser)}
                    className="text-violet-600 hover:text-violet-800 hover:bg-violet-100"
                  >
                    Changer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModelAsset(undefined)}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowModelBrowser(!showModelBrowser)}
              className="w-full justify-between border-dashed border-slate-300 text-slate-600 hover:border-violet-300 hover:text-violet-600"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Parcourir les mannequins
              </span>
              {showModelBrowser ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Model browser */}
          {showModelBrowser && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <ModelBrowser onClose={() => setShowModelBrowser(false)} />
            </div>
          )}
        </div>
      )}

      {/* Selection summary + note */}
      {selectedOption && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-700">
            <span className="font-medium">Votre choix :</span> {selectedOption.labelFr}
            {selectedModel && (
              <span className="text-violet-600"> avec {selectedModel.title}</span>
            )}
          </p>

          {/* Note toggle */}
          {!showNote && (
            <button
              onClick={() => setShowNote(true)}
              className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              <Pen className="h-3 w-3" />
              Ajouter des précisions (optionnel)
            </button>
          )}

          {showNote && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1.5">Précisions sur la présentation :</p>
              <Input
                value={presentation.note || ''}
                onChange={(e) => setPresentationNote(e.target.value)}
                placeholder="ex: Modèle femme sénégalaise souriante, plan taille..."
                className="bg-white border-slate-200 text-sm h-9"
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          onClick={prevStep}
          variant="outline"
          className="flex-1 border-slate-300"
        >
          Retour
        </Button>
        <Button
          onClick={nextStep}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11"
        >
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
