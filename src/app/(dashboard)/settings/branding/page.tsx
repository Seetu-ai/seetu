'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Instagram,
  Trash2,
  Star,
  StarOff,
  Sparkles,
  Palette,
  MessageSquare,
  MoreVertical,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { VerbalDNA } from '@/types';

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
      primaryName?: string;
      secondaryName?: string;
      accentName?: string;
    };
    visual_tokens?: string[];
    vibe_summary?: string;
  } | null;
  verbalDNA: VerbalDNA | null;
  analyzedAt: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BrandingPage() {
  // State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandInstagram, setNewBrandInstagram] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);

  // Fetch brands
  const { data, mutate, isLoading } = useSWR<{ brands: Brand[] }>(
    '/api/v1/brands',
    fetcher
  );

  const brands = data?.brands || [];

  // Create new brand
  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error('Le nom de la marque est requis');
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch('/api/v1/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBrandName.trim(),
          instagramHandle: newBrandInstagram.trim() || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la création');
      }

      toast.success('Marque créée!');
      setShowAddDialog(false);
      setNewBrandName('');
      setNewBrandInstagram('');
      await mutate();

      // If Instagram handle provided, start analysis
      if (newBrandInstagram.trim()) {
        handleAnalyzeBrand(result.brand.id, newBrandInstagram.trim());
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  // Analyze brand from Instagram
  const handleAnalyzeBrand = async (brandId: string, handle?: string) => {
    const brand = brands.find(b => b.id === brandId);
    const instagramHandle = handle || brand?.instagramHandle;

    if (!instagramHandle) {
      toast.error('Handle Instagram requis pour analyser');
      return;
    }

    setIsAnalyzing(brandId);

    try {
      const res = await fetch(`/api/v1/brands/${brandId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramHandle }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de l\'analyse');
      }

      toast.success(`ADN de marque extrait! ${result.imagesAnalyzed} images analysées`);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(null);
    }
  };

  // Set brand as default
  const handleSetDefault = async (brandId: string) => {
    setIsSettingDefault(brandId);

    try {
      const res = await fetch(`/api/v1/brands/${brandId}/set-default`, {
        method: 'POST',
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Erreur');
      }

      toast.success('Marque définie par défaut');
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setIsSettingDefault(null);
    }
  };

  // Delete brand
  const handleDeleteBrand = async () => {
    if (!selectedBrand) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/brands/${selectedBrand.id}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      toast.success('Marque supprimée');
      setShowDeleteDialog(false);
      setSelectedBrand(null);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Mes Marques
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez vos identités de marque pour la génération d'images et captions
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle marque
        </Button>
      </div>

      {/* Brands Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : brands.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <Palette className="h-8 w-8 text-violet-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune marque
            </h3>
            <p className="text-slate-500 text-center max-w-sm mb-4">
              Créez votre première marque pour commencer à générer des images et captions personnalisées
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer ma première marque
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              isAnalyzing={isAnalyzing === brand.id}
              isSettingDefault={isSettingDefault === brand.id}
              canEdit={true}
              canDelete={brands.length > 1}
              onAnalyze={() => handleAnalyzeBrand(brand.id)}
              onSetDefault={() => handleSetDefault(brand.id)}
              onDelete={() => {
                setSelectedBrand(brand);
                setShowDeleteDialog(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Add Brand Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle marque</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle identité de marque. Vous pourrez analyser son style depuis Instagram.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Nom de la marque *</Label>
              <Input
                id="brandName"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Ma Marque"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandInstagram">
                <Instagram className="h-4 w-4 inline mr-1" />
                Handle Instagram (optionnel)
              </Label>
              <Input
                id="brandInstagram"
                value={newBrandInstagram}
                onChange={(e) => setNewBrandInstagram(e.target.value)}
                placeholder="@mamarque"
              />
              <p className="text-xs text-slate-500">
                Si fourni, on analysera automatiquement le style de la marque
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateBrand} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette marque ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de la marque "{selectedBrand?.name}" seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrand}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Brand Card Component
function BrandCard({
  brand,
  isAnalyzing,
  isSettingDefault,
  canEdit,
  canDelete,
  onAnalyze,
  onSetDefault,
  onDelete,
}: {
  brand: Brand;
  isAnalyzing: boolean;
  isSettingDefault: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAnalyze: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const hasVisualDNA = brand.visualDNA && brand.visualDNA.palette;
  const hasVerbalDNA = brand.verbalDNA && brand.verbalDNA.tone;

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      brand.isDefault && 'ring-2 ring-violet-500'
    )}>
      {/* Default Badge */}
      {brand.isDefault && (
        <div className="absolute top-0 right-0 bg-violet-600 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">
          Par défaut
        </div>
      )}

      {/* Color Preview */}
      {hasVisualDNA && brand.visualDNA?.palette && (
        <div className="h-3 flex">
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

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{brand.name}</CardTitle>
            {brand.instagramHandle && (
              <a
                href={`https://instagram.com/${brand.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1"
              >
                <Instagram className="h-3 w-3" />
                @{brand.instagramHandle}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {brand.instagramHandle && (
                  <DropdownMenuItem onClick={onAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {isAnalyzing ? 'Analyse en cours...' : 'Ré-analyser'}
                  </DropdownMenuItem>
                )}
                {!brand.isDefault && (
                  <DropdownMenuItem onClick={onSetDefault} disabled={isSettingDefault}>
                    {isSettingDefault ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4 mr-2" />
                    )}
                    Définir par défaut
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Visual DNA Summary */}
        {hasVisualDNA ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Palette className="h-3.5 w-3.5" />
              <span className="font-medium">ADN Visuel</span>
              <Check className="h-3 w-3 text-green-500" />
            </div>
            {brand.visualDNA?.vibe_summary && (
              <p className="text-sm text-slate-700 italic">
                "{brand.visualDNA.vibe_summary}"
              </p>
            )}
            {brand.visualDNA?.visual_tokens && brand.visualDNA.visual_tokens.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {brand.visualDNA.visual_tokens.slice(0, 4).map((token) => (
                  <span
                    key={token}
                    className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600"
                  >
                    {token}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Palette className="h-3.5 w-3.5" />
            <span>ADN Visuel non analysé</span>
          </div>
        )}

        {/* Verbal DNA Summary */}
        {hasVerbalDNA ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="font-medium">ADN Verbal</span>
              <Check className="h-3 w-3 text-green-500" />
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs bg-violet-100 px-2 py-0.5 rounded-full text-violet-700">
                {brand.verbalDNA?.primary_language === 'english' ? 'Anglais' :
                 brand.verbalDNA?.primary_language === 'french' ? 'Français' :
                 brand.verbalDNA?.primary_language === 'french_wolof_mix' ? 'Fr + Wolof' :
                 brand.verbalDNA?.primary_language}
              </span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                {brand.verbalDNA?.tone}
              </span>
            </div>
            {brand.verbalDNA?.emoji_palette && brand.verbalDNA.emoji_palette.length > 0 && (
              <p className="text-sm">
                {brand.verbalDNA.emoji_palette.slice(0, 6).join(' ')}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>ADN Verbal non analysé</span>
          </div>
        )}

        {/* Analyze CTA if not analyzed */}
        {!hasVisualDNA && brand.instagramHandle && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyser depuis Instagram
              </>
            )}
          </Button>
        )}

        {/* Last analyzed date */}
        {brand.analyzedAt && (
          <p className="text-[10px] text-slate-400">
            Analysé le {new Date(brand.analyzedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
