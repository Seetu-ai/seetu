'use client';

import { useState } from 'react';
import { Upload, Sparkles, LayoutTemplate, Check, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type TabType = 'upload' | 'generate' | 'templates';

interface DesignOption {
  id: string;
  imageUrl: string;
  label: string;
}

interface DesignOptionsProps {
  options?: DesignOption[];
  selectedId?: string;
  designBrief?: string;
  onSelect?: (id: string) => void;
  onUpload?: () => void;
  onGenerate?: (brief: string) => void;
  onDesignBriefChange?: (brief: string) => void;
  isGenerating?: boolean;
}

// Check if design brief contains actual design elements (not just "user wants help")
function isValidDesignBrief(brief: string): boolean {
  if (!brief || brief.length < 10) return false;
  const invalidPhrases = ['souhaite que', 'veut de l\'aide', 's\'occupe de', 'pas encore', 'juste l\'idée'];
  if (invalidPhrases.some(phrase => brief.toLowerCase().includes(phrase))) return false;
  // Must contain concrete design elements
  return /\b(logo|texte|nom|couleur|drapeau|image|photo|lion|style|vert|jaune|rouge|bleu|noir|blanc)\b/i.test(brief);
}

export function DesignOptions({ options = [], selectedId, designBrief = '', onSelect, onUpload, onGenerate, onDesignBriefChange, isGenerating }: DesignOptionsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [localBrief, setLocalBrief] = useState(designBrief);
  // Only consider it submitted if it's a VALID design brief with concrete elements
  const hasValidBrief = isValidDesignBrief(designBrief);
  const [briefSubmitted, setBriefSubmitted] = useState(hasValidBrief);

  // Update local state when designBrief prop changes (from chat extraction)
  // Only if it's a valid brief with actual design elements
  if (hasValidBrief && designBrief !== localBrief && !localBrief) {
    setLocalBrief(designBrief);
    setBriefSubmitted(true);
  }

  const tabs = [
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'generate' as const, label: 'Générer IA', icon: Sparkles },
    { id: 'templates' as const, label: 'Templates', icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Option de Design</h4>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button key={tab.id} variant="ghost" size="sm" className={cn('text-xs gap-1.5 rounded-md', activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900')} onClick={() => setActiveTab(tab.id)}>
                <Icon className="h-3.5 w-3.5" />{tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors" onClick={onUpload}>
          <Upload className="h-8 w-8 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700">Glissez votre fichier ici</p>
          <p className="text-xs text-slate-500 mt-1">ou cliquez pour parcourir (PNG, JPG, PDF)</p>
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="space-y-4">
          {options.length === 0 ? (
            !briefSubmitted ? (
              // Step 1: Collect design requirements BEFORE generation
              <div className="space-y-4">
                <div className="text-center">
                  <Sparkles className="h-8 w-8 mx-auto text-emerald-500 mb-3" />
                  <h4 className="font-medium text-slate-900 mb-1">Que voulez-vous sur votre design ?</h4>
                  <p className="text-sm text-slate-500">Décrivez votre idée pour que l'IA puisse créer le design parfait</p>
                </div>
                <Textarea
                  value={localBrief}
                  onChange={(e) => setLocalBrief(e.target.value)}
                  placeholder="Ex: Mon logo 'DAKAR STYLE' en lettres bold, couleurs vert et jaune, style streetwear moderne..."
                  className="min-h-[100px] resize-none"
                />
                <div className="flex gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setLocalBrief(prev => prev + (prev ? ', ' : '') + 'logo texte bold')}>+ Logo texte</span>
                  <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setLocalBrief(prev => prev + (prev ? ', ' : '') + 'style minimaliste')}>+ Minimaliste</span>
                  <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setLocalBrief(prev => prev + (prev ? ', ' : '') + 'couleurs vives')}>+ Couleurs vives</span>
                  <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setLocalBrief(prev => prev + (prev ? ', ' : '') + 'style africain')}>+ Style africain</span>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    if (localBrief.trim()) {
                      setBriefSubmitted(true);
                      onDesignBriefChange?.(localBrief.trim());
                    }
                  }}
                  disabled={!localBrief.trim()}
                >
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              // Step 2: Show brief and generation state
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Brief du chat :</p>
                  <p className="text-sm text-slate-700">{localBrief}</p>
                  {!isGenerating && (
                    <button
                      className="text-xs text-emerald-600 hover:underline mt-2"
                      onClick={() => setBriefSubmitted(false)}
                    >
                      Modifier
                    </button>
                  )}
                </div>
                {isGenerating ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-10 w-10 mx-auto text-emerald-500 mb-4 animate-spin" />
                    <p className="text-sm font-medium text-slate-700">Génération en cours...</p>
                    <p className="text-xs text-slate-500 mt-1">L'IA crée vos designs personnalisés</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto text-emerald-500 mb-3" />
                    <p className="text-sm text-slate-600 mb-4">Prêt à générer vos designs</p>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onGenerate?.(localBrief)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer des propositions
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {localBrief && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs text-slate-500 mb-1">Brief utilisé :</p>
                  <p className="text-sm text-slate-700 line-clamp-2">{localBrief}</p>
                </div>
              )}
              {!selectedId && (
                <p className="text-sm text-center text-emerald-600 font-medium">
                  Clique sur le design que tu préfères
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {options.map((option) => (
                  <div key={option.id} className={cn('relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02]', selectedId === option.id ? 'border-emerald-500 ring-2 ring-emerald-200 scale-[1.02]' : 'border-slate-200 hover:border-emerald-300')} onClick={() => onSelect?.(option.id)}>
                    {selectedId === option.id && (<div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>)}
                    <div className="aspect-[3/4] bg-slate-100"><img src={option.imageUrl} alt={option.label} className="w-full h-full object-cover" /></div>
                    <div className="p-2 bg-white text-center"><p className="text-xs font-medium text-slate-700">{selectedId === option.id ? 'Template Choisi' : option.label}</p></div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onGenerate?.(localBrief)}
                disabled={isGenerating}
              >
                {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération...</> : 'Générer plus de designs'}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="aspect-[3/4] rounded-xl bg-slate-100 border-2 border-transparent hover:border-slate-200 cursor-pointer transition-colors" />))}
        </div>
      )}
    </div>
  );
}
