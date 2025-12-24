'use client';

import { useState, useEffect } from 'react';
import { useWizardStore, SelectedModelAsset } from '@/lib/stores/wizard-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  User,
  Loader2,
  Search,
  X,
  CheckCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface MarketplaceModel {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceUnits: number;
  modelGender: string | null;
  modelAgeRange: string | null;
  modelStyles: string[];
  usageCount: number;
  creator: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

const GENDER_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'female', label: 'Femme' },
  { value: 'male', label: 'Homme' },
];

const AGE_OPTIONS = [
  { value: '', label: 'Tous les âges' },
  { value: '18-25', label: '18-25 ans' },
  { value: '25-35', label: '25-35 ans' },
  { value: '35-45', label: '35-45 ans' },
  { value: '45+', label: '45+ ans' },
];

interface ModelBrowserProps {
  onClose?: () => void;
}

export function ModelBrowser({ onClose }: ModelBrowserProps) {
  const { presentation, setModelAsset } = useWizardStore();
  const [models, setModels] = useState<MarketplaceModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchModels();
  }, [gender, ageRange]);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (gender) params.set('gender', gender);
      if (ageRange) params.set('ageRange', ageRange);
      if (search) params.set('search', search);
      params.set('limit', '20');

      const response = await fetch(`/api/v1/marketplace/models?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des modèles');

      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchModels();
  };

  const handleSelectModel = (model: MarketplaceModel) => {
    const selectedAsset: SelectedModelAsset = {
      id: model.id,
      title: model.title,
      thumbnailUrl: model.thumbnailUrl,
      priceUnits: model.priceUnits,
      modelGender: model.modelGender,
      modelAgeRange: model.modelAgeRange,
      creatorName: model.creator.displayName,
    };
    setModelAsset(selectedAsset);
    onClose?.();
  };

  const handleClearSelection = () => {
    setModelAsset(undefined);
  };

  const selectedModel = presentation.modelAsset;

  return (
    <div className="space-y-4">
      {/* Selected Model Preview */}
      {selectedModel && (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-violet-600 hover:text-violet-800 hover:bg-violet-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Chercher
          </Button>
        </form>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Gender filter */}
          <div className="relative">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Age filter */}
          <div className="relative">
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchModels} className="mt-2">
              Réessayer
            </Button>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucun modèle disponible</p>
            <p className="text-xs text-slate-400 mt-1">
              Essayez de modifier vos filtres
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {models.map((model) => {
              const isSelected = selectedModel?.id === model.id;

              return (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className={cn(
                    'relative rounded-xl border overflow-hidden transition-all text-left',
                    isSelected
                      ? 'border-violet-400 ring-2 ring-violet-200'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[3/4] bg-slate-100">
                    {model.thumbnailUrl ? (
                      <img
                        src={model.thumbnailUrl}
                        alt={model.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                    <p className="text-white font-medium text-sm truncate">
                      {model.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-white/80 text-xs truncate">
                        {model.creator.displayName}
                      </p>
                      <Badge className="bg-white/20 text-white text-xs border-0">
                        +{model.priceUnits / 100}
                      </Badge>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  )}

                  {/* Verified badge */}
                  {model.creator.isVerified && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-green-500 text-white text-xs border-0 px-1.5">
                        <Sparkles className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
