'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useWizardStore, SceneType, SelectedLocationAsset } from '@/lib/stores/wizard-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Check,
  CloudMoon,
  Search,
  MapPin,
  Loader2,
  RotateCw,
  ArrowRight,
  Sparkles,
  Building2,
  Wand2,
  Camera,
  X,
  Expand,
} from 'lucide-react';
import { toast } from 'sonner';

interface Background {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  type: string;
  category: string;
  thumbnailUrl: string;
  location?: string;
  // Marketplace location fields
  isMarketplace?: boolean;
  assetId?: string;
  creator?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  priceUnits?: number;
}

interface LocationResult {
  name: string;
  placeId: string;
  lat: number;
  lng: number;
  types: string[];
}

interface StreetViewPreview {
  heading: number;
  url: string;
}

interface PlacePrediction {
  placeId: string;
  name: string;
  description: string;
  fullText: string;
  types: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SCENE_TYPES: { type: SceneType; label: string; description: string; icon: typeof Building2 }[] = [
  { type: 'real_place', label: 'Lieu Réel', description: 'Un vrai lieu au Sénégal', icon: Building2 },
  { type: 'studio', label: 'Studio', description: 'Fond neutre professionnel', icon: Camera },
  { type: 'ai_generated', label: 'IA Créative', description: "L'IA imagine le décor", icon: Wand2 },
];

export function StepScene() {
  const {
    scene,
    setSceneType,
    setBackground,
    setSceneNote,
    nextStep,
    prevStep,
  } = useWizardStore();

  // Location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    location: LocationResult;
    streetView: {
      available: boolean;
      previews: StreetViewPreview[];
    };
  } | null>(null);
  const [selectedHeading, setSelectedHeading] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Autocomplete state
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Preview modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const { data, error, isLoading } = useSWR(
    scene.type === 'real_place' && !searchResult
      ? `/api/v1/studio/backgrounds?type=${scene.type}`
      : scene.type === 'studio'
      ? `/api/v1/studio/backgrounds?type=studio`
      : null,
    fetcher
  );

  const backgrounds: Background[] = data?.backgrounds || [];

  // Fetch autocomplete predictions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoadingPredictions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/studio/locations/autocomplete?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setPredictions(data.predictions || []);
        setShowPredictions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setPredictions([]);
      } finally {
        setIsLoadingPredictions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Close predictions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    setSelectedHeading(null);
    setShowPredictions(false);

    try {
      const res = await fetch(`/api/v1/studio/locations/search?q=${encodeURIComponent(searchTerm)}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Lieu non trouvé');
      }

      if (!result.streetView?.available) {
        toast.error('Pas de Street View disponible pour ce lieu');
        return;
      }

      setSearchResult(result);
      toast.success(`${result.location.name.split(',')[0]} trouvé!`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setSearchQuery(prediction.name);
    setShowPredictions(false);
    handleSearch(prediction.fullText);
  };

  const handleSelectAngle = async (heading: number) => {
    if (!searchResult) return;

    setSelectedHeading(heading);
    setIsSaving(true);

    try {
      const res = await fetch('/api/v1/studio/locations/streetview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: searchResult.location.lat,
          lng: searchResult.location.lng,
          heading,
          pitch: 10,
          size: '1200x800',
          name: searchResult.location.name,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur');
      }

      setBackground(
        `streetview-${searchResult.location.placeId}-${heading}`,
        result.url,
        searchResult.location.name
      );

      toast.success('Lieu sélectionné!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur');
      setSelectedHeading(null);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSearch = () => {
    setSearchResult(null);
    setSelectedHeading(null);
    setSearchQuery('');
    setPredictions([]);
  };

  const getAngleLabel = (heading: number) => {
    const labels: Record<number, string> = {
      0: 'Nord',
      36: 'Nord-Est',
      72: 'Est',
      108: 'Est-Sud',
      144: 'Sud-Est',
      180: 'Sud',
      216: 'Sud-Ouest',
      252: 'Ouest',
      288: 'Nord-Ouest',
      324: 'Nord-Nord-Ouest',
    };
    return labels[heading] || `${heading}°`;
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-violet-800 font-medium">
              Où souhaitez-vous placer votre produit ?
            </p>
            <p className="text-xs text-violet-600 mt-1">
              Choisissez le type de décor pour votre photo
            </p>
          </div>
        </div>
      </div>

      {/* Scene Type Selection */}
      <div className="grid grid-cols-3 gap-2">
        {SCENE_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = scene.type === type.type;

          return (
            <button
              key={type.type}
              onClick={() => {
                setSceneType(type.type);
                resetSearch();
              }}
              className={cn(
                'p-3 rounded-xl border text-center transition-all',
                isActive
                  ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 mx-auto mb-1.5',
                  isActive ? 'text-violet-600' : 'text-slate-500'
                )}
              />
              <p className={cn('text-xs font-medium', isActive ? 'text-violet-700' : 'text-slate-700')}>
                {type.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Real Place: Location Search */}
      {scene.type === 'real_place' && (
        <div className="space-y-3">
          {/* Location Search */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 font-medium">
              <MapPin className="h-3.5 w-3.5" />
              Rechercher un lieu au Sénégal
            </div>
            <div ref={searchContainerRef} className="relative">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowPredictions(false);
                      handleSearch();
                    }
                  }}
                  onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                  placeholder="ex: Monument de la Renaissance, Gorée..."
                  className="bg-white border-slate-200 text-sm h-10 flex-1"
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={isSearching || !searchQuery.trim()}
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 h-10 px-4"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Autocomplete Dropdown */}
              {showPredictions && (predictions.length > 0 || isLoadingPredictions) && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                  {isLoadingPredictions && predictions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Recherche...
                    </div>
                  ) : (
                    predictions.map((prediction) => (
                      <button
                        key={prediction.placeId}
                        onClick={() => handleSelectPrediction(prediction)}
                        className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {prediction.name}
                        </div>
                        {prediction.description && (
                          <div className="text-xs text-slate-500 truncate">
                            {prediction.description}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Results - Angle Selection */}
          {searchResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {searchResult.location.name.split(',')[0]}
                  </div>
                  <div className="text-xs text-slate-500">
                    Cliquez sur un angle pour l'agrandir, double-cliquez pour sélectionner
                  </div>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              {/* 10-angle grid */}
              <div className="grid grid-cols-5 gap-2">
                {searchResult.streetView.previews.map((preview) => {
                  const isSelected = selectedHeading === preview.heading;
                  const angleLabel = getAngleLabel(preview.heading);

                  return (
                    <button
                      key={preview.heading}
                      onClick={() => setPreviewImage({ url: preview.url, label: angleLabel })}
                      onDoubleClick={() => handleSelectAngle(preview.heading)}
                      disabled={isSaving}
                      className={cn(
                        'relative rounded-lg overflow-hidden border-2 transition-all group',
                        isSelected
                          ? 'border-violet-500 ring-2 ring-violet-200'
                          : 'border-slate-200 hover:border-violet-300'
                      )}
                    >
                      <img
                        src={preview.url}
                        alt={`Vue ${angleLabel}`}
                        className="w-full h-[55px] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Expand className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] py-0.5 text-center font-medium">
                        {preview.heading}°
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                          {isSaving ? (
                            <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                          ) : (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Astuce: Double-cliquez sur un angle pour le sélectionner directement
              </p>
            </div>
          )}

          {/* Curated Backgrounds */}
          {!searchResult && backgrounds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Ou choisissez un lieu populaire :</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {isLoading ? (
                  <>
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </>
                ) : (
                  backgrounds.map((bg) => {
                    const isSelected = scene.backgroundId === bg.id;
                    return (
                      <div
                        key={bg.id}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                          'bg-white border',
                          isSelected
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div
                          className="w-[70px] h-[45px] rounded overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewImage({ url: bg.thumbnailUrl, label: bg.nameFr })}
                        >
                          <img
                            src={bg.thumbnailUrl}
                            alt={bg.nameFr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => {
                            // Build location asset if marketplace location
                            const locationAsset: SelectedLocationAsset | undefined = bg.isMarketplace && bg.assetId
                              ? {
                                  id: bg.assetId,
                                  title: bg.nameFr,
                                  thumbnailUrl: bg.thumbnailUrl,
                                  priceUnits: bg.priceUnits || 0,
                                  locationCity: bg.location || null,
                                  locationType: bg.category || null,
                                  creatorName: bg.creator?.displayName || 'Créateur',
                                }
                              : undefined;
                            setBackground(bg.id, bg.thumbnailUrl, bg.nameFr, locationAsset);
                          }}
                        >
                          <div className="text-sm font-medium text-slate-800 truncate">
                            {bg.nameFr}
                          </div>
                          <div className="flex items-center gap-2">
                            {bg.location && (
                              <span className="text-xs text-slate-500">{bg.location}</span>
                            )}
                            {bg.isMarketplace && bg.priceUnits && (
                              <span className="text-xs font-medium text-amber-600">
                                +{bg.priceUnits / 100} crédit{bg.priceUnits > 100 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {bg.isMarketplace && bg.creator && (
                            <div className="text-xs text-violet-600">
                              par {bg.creator.displayName}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-violet-600 flex-shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Studio Backgrounds */}
      {scene.type === 'studio' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Choisissez un fond de studio :</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : backgrounds.length > 0 ? (
              backgrounds.map((bg) => {
                const isSelected = scene.backgroundId === bg.id;
                return (
                  <div
                    key={bg.id}
                    onClick={() => setBackground(bg.id, bg.thumbnailUrl, bg.nameFr)}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                      'bg-white border',
                      isSelected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className="w-[70px] h-[45px] rounded overflow-hidden flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage({ url: bg.thumbnailUrl, label: bg.nameFr });
                      }}
                    >
                      <img
                        src={bg.thumbnailUrl}
                        alt={bg.nameFr}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {bg.nameFr}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-violet-600 flex-shrink-0" />}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucun fond studio disponible
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI Generated Info */}
      {scene.type === 'ai_generated' && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 text-center">
          <Wand2 className="h-8 w-8 text-violet-500 mx-auto mb-2" />
          <p className="text-sm text-violet-800 font-medium">Mode créatif activé</p>
          <p className="text-xs text-violet-600 mt-1">
            L'IA générera un décor unique basé sur vos instructions ci-dessous
          </p>
        </div>
      )}

      {/* Scene Modifier */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <CloudMoon className="h-3.5 w-3.5" />
          Ambiance / Instructions supplémentaires :
        </div>
        <Input
          value={scene.note || ''}
          onChange={(e) => setSceneNote(e.target.value)}
          placeholder={
            scene.type === 'ai_generated'
              ? "ex: Plage tropicale au coucher du soleil, ambiance luxueuse..."
              : "ex: De nuit, temps pluvieux, lumière chaude..."
          }
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
        <Button
          onClick={nextStep}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold h-11"
        >
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.label}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={previewImage.url.replace('400x300', '800x600')}
                alt={previewImage.label}
                className="w-full rounded-lg"
              />
              {searchResult && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => {
                      const heading = searchResult.streetView.previews.find(
                        p => p.url === previewImage.url
                      )?.heading;
                      if (heading !== undefined) {
                        handleSelectAngle(heading);
                        setPreviewImage(null);
                      }
                    }}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Sélectionner cet angle
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
