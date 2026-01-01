'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Star,
  Crown,
  Gift,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface CampaignTemplatePickerProps {
  selectedTemplateId?: string | null;
  onSelect: (template: CampaignTemplate | null) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'tabaski-gold': Sun,
  'ramadan-elegance': Moon,
  'magal-touba': Star,
  'new-arrivals': Sparkles,
  'premium-luxe': Crown,
  'festive-season': Gift,
};

export function CampaignTemplatePicker({
  selectedTemplateId,
  onSelect,
}: CampaignTemplatePickerProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/campaigns/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Choisissez un style de campagne
        </h3>
        {selectedTemplateId && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-violet-600 hover:underline"
          >
            Effacer la sélection
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((template) => {
          const Icon = ICON_MAP[template.slug] || Sparkles;
          const isSelected = selectedTemplateId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-left',
                'hover:shadow-md hover:border-violet-300',
                isSelected
                  ? 'border-violet-600 bg-violet-50 shadow-md'
                  : 'border-slate-200 bg-white'
              )}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Premium badge */}
              {template.isPremium && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                  <span className="text-[10px] font-medium text-white">PRO</span>
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                  isSelected
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Template name */}
              <h4 className="font-medium text-slate-900 text-sm mb-1">
                {template.nameFr || template.name}
              </h4>

              {/* Occasion tag */}
              {template.occasion && (
                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {template.occasion}
                </span>
              )}

              {/* Style preview */}
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs text-slate-500">
                  {template.styleLock.lighting.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500">
                  {template.styleLock.mood}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p>Aucun template disponible</p>
        </div>
      )}
    </div>
  );
}
