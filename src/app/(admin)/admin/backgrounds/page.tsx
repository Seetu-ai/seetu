'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Sun,
  Sparkles,
} from 'lucide-react';

interface Background {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  type: 'real_place' | 'studio' | 'lifestyle' | 'custom';
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  lighting: string;
  mood: string;
  colors: string[];
  location: string | null;
  landmark: string | null;
  promptHints: string | null;
  negativeHints: string | null;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const typeLabels: Record<string, string> = {
  real_place: 'Lieu Réel',
  studio: 'Studio',
  lifestyle: 'Lifestyle',
  custom: 'Personnalisé',
};

const typeColors: Record<string, string> = {
  real_place: 'bg-emerald-100 text-emerald-700',
  studio: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-amber-100 text-amber-700',
  custom: 'bg-purple-100 text-purple-700',
};

const categoryOptions: Record<string, string[]> = {
  real_place: ['beach', 'urban', 'market', 'nature', 'interior'],
  studio: ['white', 'gradient', 'colored', 'textured'],
  lifestyle: ['table', 'fabric', 'nature', 'interior'],
  custom: ['other'],
};

const lightingOptions = [
  'natural_daylight',
  'golden_hour',
  'studio_soft',
  'studio_warm',
  'natural_window',
  'overcast',
  'sunset',
];

const moodOptions = [
  'warm',
  'professional',
  'vibrant',
  'luxe',
  'minimal',
  'cozy',
  'energetic',
  'calm',
];

export default function AdminBackgroundsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [editingBackground, setEditingBackground] = useState<Background | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ backgrounds: Background[] }>(
    '/api/v1/admin/backgrounds?includeInactive=true',
    fetcher
  );

  const filteredBackgrounds = data?.backgrounds.filter((bg) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'inactive') return !bg.isActive;
    return bg.type === activeTab;
  });

  const saveBackground = async (formData: FormData, isNew: boolean) => {
    setSaving(true);
    try {
      const url = isNew
        ? '/api/v1/admin/backgrounds'
        : `/api/v1/admin/backgrounds/${formData.get('id')}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast.success(isNew ? 'Fond créé avec succès' : 'Fond mis à jour');
      mutate();
      setEditingBackground(null);
      setIsCreating(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (bg: Background) => {
    try {
      const formData = new FormData();
      formData.append('isActive', (!bg.isActive).toString());

      const response = await fetch(`/api/v1/admin/backgrounds/${bg.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to toggle');

      toast.success(bg.isActive ? 'Fond désactivé' : 'Fond activé');
      mutate();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteBackground = async (bgId: string) => {
    if (!confirm('Supprimer ce fond ? (Il sera désactivé, pas supprimé définitivement)')) return;

    try {
      const response = await fetch(`/api/v1/admin/backgrounds/${bgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Fond supprimé');
      mutate();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Fonds & Lieux
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez les arrière-plans disponibles dans le studio
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Fond
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un Fond</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau fond ou lieu pour le studio
              </DialogDescription>
            </DialogHeader>
            <BackgroundForm onSave={saveBackground} saving={saving} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'real_place', label: 'Lieux Réels' },
          { id: 'studio', label: 'Studio' },
          { id: 'lifestyle', label: 'Lifestyle' },
          { id: 'inactive', label: 'Inactifs' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? '' : 'text-slate-600'}
          >
            {tab.label}
            {tab.id !== 'all' && tab.id !== 'inactive' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {data?.backgrounds.filter((bg) => bg.type === tab.id).length || 0}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBackgrounds?.map((bg) => (
          <Card
            key={bg.id}
            className={`overflow-hidden transition-all hover:shadow-lg ${
              !bg.isActive ? 'opacity-60' : ''
            }`}
          >
            {/* Thumbnail */}
            <div
              className="relative aspect-video bg-slate-100 cursor-pointer group"
              onClick={() => setPreviewImage(bg.imageUrl)}
            >
              <img
                src={bg.thumbnailUrl}
                alt={bg.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {bg.isPremium && (
                <Badge className="absolute top-2 right-2 bg-amber-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
              {!bg.isActive && (
                <Badge variant="secondary" className="absolute top-2 left-2">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              {/* Name & Type */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {bg.name}
                  </h3>
                  <p className="text-sm text-slate-500">{bg.nameFr}</p>
                </div>
                <Badge className={typeColors[bg.type]}>
                  {typeLabels[bg.type]}
                </Badge>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="outline" className="text-xs">
                  {bg.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Sun className="h-3 w-3 mr-1" />
                  {bg.lighting.replace('_', ' ')}
                </Badge>
                {bg.location && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {bg.location}
                  </Badge>
                )}
              </div>

              {/* Colors */}
              <div className="flex gap-1 mb-3">
                {bg.colors.slice(0, 5).map((color, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600"
                  >
                    {color}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingBackground(bg)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(bg)}
                    title={bg.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {bg.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteBackground(bg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-slate-400">#{bg.sortOrder}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredBackgrounds?.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">Aucun fond</h3>
          <p className="text-slate-500">
            {activeTab === 'inactive'
              ? 'Aucun fond désactivé'
              : 'Créez votre premier fond pour commencer'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingBackground} onOpenChange={() => setEditingBackground(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le Fond</DialogTitle>
          </DialogHeader>
          {editingBackground && (
            <BackgroundForm
              background={editingBackground}
              onSave={saveBackground}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Background Form Component
function BackgroundForm({
  background,
  onSave,
  saving,
}: {
  background?: Background;
  onSave: (formData: FormData, isNew: boolean) => void;
  saving: boolean;
}) {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    background?.thumbnailUrl || null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    background?.imageUrl || null
  );

  const [formData, setFormData] = useState({
    id: background?.id || '',
    name: background?.name || '',
    nameFr: background?.nameFr || '',
    type: background?.type || 'real_place',
    category: background?.category || 'urban',
    lighting: background?.lighting || 'natural_daylight',
    mood: background?.mood || 'warm',
    colors: background?.colors.join(', ') || '',
    location: background?.location || '',
    landmark: background?.landmark || '',
    promptHints: background?.promptHints || '',
    negativeHints: background?.negativeHints || '',
    isPremium: background?.isPremium || false,
    isActive: background?.isActive ?? true,
    sortOrder: background?.sortOrder || 0,
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    const data = new FormData();
    if (background?.id) {
      data.append('id', background.id);
    }
    data.append('name', formData.name);
    data.append('nameFr', formData.nameFr);
    data.append('type', formData.type);
    data.append('category', formData.category);
    data.append('lighting', formData.lighting);
    data.append('mood', formData.mood);
    data.append('colors', formData.colors);
    data.append('location', formData.location);
    data.append('landmark', formData.landmark);
    data.append('promptHints', formData.promptHints);
    data.append('negativeHints', formData.negativeHints);
    data.append('isPremium', formData.isPremium.toString());
    data.append('isActive', formData.isActive.toString());
    data.append('sortOrder', formData.sortOrder.toString());

    // Add files if selected
    if (thumbnailRef.current?.files?.[0]) {
      data.append('thumbnail', thumbnailRef.current.files[0]);
    }
    if (imageRef.current?.files?.[0]) {
      data.append('image', imageRef.current.files[0]);
    }

    onSave(data, !background?.id);
  };

  return (
    <div className="space-y-6">
      {/* Image Uploads */}
      <div className="grid grid-cols-2 gap-4">
        {/* Thumbnail */}
        <div>
          <Label className="mb-2 block">Miniature</Label>
          <input
            ref={thumbnailRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailChange}
          />
          <div
            onClick={() => thumbnailRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors overflow-hidden"
          >
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-400">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm">Cliquez pour uploader</span>
              </div>
            )}
          </div>
        </div>

        {/* Full Image */}
        <div>
          <Label className="mb-2 block">Image Complète</Label>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <div
            onClick={() => imageRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors overflow-hidden"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Full"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm">Image HD</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom (EN)</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sea Plaza Terrace"
          />
        </div>
        <div>
          <Label>Nom (FR)</Label>
          <Input
            value={formData.nameFr}
            onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
            placeholder="Terrasse Sea Plaza"
          />
        </div>
      </div>

      {/* Type & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                type: value as Background['type'],
                category: categoryOptions[value]?.[0] || 'other',
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_place">Lieu Réel</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Catégorie</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions[formData.type]?.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lighting & Mood */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Éclairage</Label>
          <Select
            value={formData.lighting}
            onValueChange={(value) => setFormData({ ...formData, lighting: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lightingOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ambiance</Label>
          <Select
            value={formData.mood}
            onValueChange={(value) => setFormData({ ...formData, mood: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {moodOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div>
        <Label>Couleurs (séparées par des virgules)</Label>
        <Input
          value={formData.colors}
          onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
          placeholder="beige, blue, white, sand"
        />
      </div>

      {/* Location fields (for real_place) */}
      {formData.type === 'real_place' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Ville/Région</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Dakar"
            />
          </div>
          <div>
            <Label>Lieu précis</Label>
            <Input
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              placeholder="Sea Plaza Mall"
            />
          </div>
        </div>
      )}

      {/* AI Hints */}
      <div>
        <Label>Indications pour l'IA (prompt hints)</Label>
        <Textarea
          value={formData.promptHints}
          onChange={(e) => setFormData({ ...formData, promptHints: e.target.value })}
          placeholder="upscale shopping mall terrace, ocean view, modern architecture..."
          rows={3}
        />
      </div>

      <div>
        <Label>Éléments à éviter (negative hints)</Label>
        <Textarea
          value={formData.negativeHints}
          onChange={(e) => setFormData({ ...formData, negativeHints: e.target.value })}
          placeholder="crowded, messy, low quality..."
          rows={2}
        />
      </div>

      {/* Settings */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label>Actif</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isPremium}
            onCheckedChange={(checked) => setFormData({ ...formData, isPremium: checked })}
          />
          <Label>Premium</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label>Ordre:</Label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) =>
              setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
            }
            className="w-20"
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={saving || !formData.name || !formData.nameFr}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {background ? 'Mettre à jour' : 'Créer le fond'}
      </Button>
    </div>
  );
}
