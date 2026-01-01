'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CampaignTemplatePicker } from '@/components/campaign/campaign-template-picker';
import { toast } from 'sonner';

interface CampaignTemplate {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  thumbnailUrl?: string;
  occasion?: string;
  isPremium: boolean;
  styleLock: {
    lighting: string;
    colorGrading: { warmth: number; saturation: number };
    mood: string;
    visualTokens?: string[];
  };
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [targetCount, setTargetCount] = useState(10);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Veuillez donner un nom à votre campagne');
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetCount,
          templateId: selectedTemplate?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de création');
      }

      toast.success('Campagne créée avec succès!');
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux campagnes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle campagne</h1>
        <p className="text-slate-500 mt-1">
          Configurez les paramètres de votre campagne marketing
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-8">
        {/* Campaign Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Nom de la campagne
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Collection Tabaski 2024"
            className="mt-2"
          />
        </div>

        {/* Target Count */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-slate-700">
              Nombre d&apos;images
            </Label>
            <span className="text-sm font-semibold text-violet-600">
              {targetCount} images
            </span>
          </div>
          <Slider
            value={[targetCount]}
            onValueChange={(value) => setTargetCount(value[0])}
            min={5}
            max={20}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-2">
            Générez entre 5 et 20 images avec un style cohérent
          </p>
        </div>

        {/* Template Picker */}
        <div className="border-t border-slate-100 pt-6">
          <CampaignTemplatePicker
            selectedTemplateId={selectedTemplate?.id}
            onSelect={setSelectedTemplate}
          />
        </div>

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-violet-900">
                  {selectedTemplate.nameFr || selectedTemplate.name}
                </h4>
                <p className="text-sm text-violet-700 mt-0.5">
                  Style: {selectedTemplate.styleLock.lighting.replace(/_/g, ' ')} |{' '}
                  {selectedTemplate.styleLock.mood}
                </p>
                {selectedTemplate.occasion && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-violet-200 text-violet-800 rounded text-xs">
                    {selectedTemplate.occasion}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la campagne'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
