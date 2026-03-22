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
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Loader2,
  Upload,
  Image as ImageIcon,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  Shield,
} from 'lucide-react';

interface Model {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  imageUrls: string[];
  modelGender: string | null;
  modelAgeRange: string | null;
  modelStyles: string[];
  priceUnits: number;
  tags: string[];
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  usageCount: number;
  consentVerified: boolean;
  deletedAt: string | null;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
    isVerified: boolean;
    user?: {
      email: string;
    };
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  SUSPENDED: 'Suspendu',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-purple-100 text-purple-700',
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Pencil className="h-3 w-3 mr-1" />,
  PENDING_REVIEW: <Clock className="h-3 w-3 mr-1" />,
  APPROVED: <CheckCircle className="h-3 w-3 mr-1" />,
  REJECTED: <XCircle className="h-3 w-3 mr-1" />,
  SUSPENDED: <Shield className="h-3 w-3 mr-1" />,
};

const genderOptions = [
  { value: 'female', label: 'Femme' },
  { value: 'male', label: 'Homme' },
  { value: 'non_binary', label: 'Non-binaire' },
];

const ageRangeOptions = [
  { value: '18-25', label: '18-25 ans' },
  { value: '25-35', label: '25-35 ans' },
  { value: '35-45', label: '35-45 ans' },
  { value: '45+', label: '45+ ans' },
];

const styleOptions = [
  'casual',
  'professional',
  'traditional',
  'elegant',
  'urban',
  'fashion',
  'streetwear',
  'sporty',
];

export default function AdminModelsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ models: Model[] }>(
    '/api/v1/admin/models?includeDeleted=false',
    fetcher
  );

  const filteredModels = data?.models.filter((model) => {
    if (activeTab === 'all') return true;
    return model.status === activeTab;
  });

  const saveModel = async (formData: FormData, isNew: boolean) => {
    setSaving(true);
    try {
      const url = isNew
        ? '/api/v1/admin/models'
        : `/api/v1/admin/models/${formData.get('id')}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast.success(isNew ? 'Mannequin créé avec succès' : 'Mannequin mis à jour');
      mutate();
      setEditingModel(null);
      setIsCreating(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (modelId: string, status: string) => {
    try {
      const formData = new FormData();
      formData.append('status', status);

      const response = await fetch(`/api/v1/admin/models/${modelId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(`Statut mis à jour: ${statusLabels[status]}`);
      mutate();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteModel = async (modelId: string) => {
    if (!confirm('Supprimer ce mannequin ?')) return;

    try {
      const response = await fetch(`/api/v1/admin/models/${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Mannequin supprimé');
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
            Mannequins
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez les modèles disponibles dans le studio
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Mannequin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un Mannequin</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau mannequin curé par la plateforme
              </DialogDescription>
            </DialogHeader>
            <ModelForm onSave={saveModel} saving={saving} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'APPROVED', label: 'Approuvés' },
          { id: 'PENDING_REVIEW', label: 'En attente' },
          { id: 'REJECTED', label: 'Rejetés' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? '' : 'text-slate-600'}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {data?.models.filter((m) => m.status === tab.id).length || 0}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredModels?.map((model) => (
          <Card
            key={model.id}
            className={`overflow-hidden transition-all hover:shadow-lg ${
              model.deletedAt ? 'opacity-60' : ''
            }`}
          >
            {/* Thumbnail - 3:4 ratio for portrait */}
            <div
              className="relative aspect-[3/4] bg-slate-100 cursor-pointer group"
              onClick={() => model.thumbnailUrl && setPreviewImage(model.thumbnailUrl)}
            >
              {model.thumbnailUrl ? (
                <img
                  src={model.thumbnailUrl}
                  alt={model.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-16 w-16 text-slate-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Status badge */}
              <Badge className={`absolute top-2 left-2 ${statusColors[model.status]}`}>
                {statusIcons[model.status]}
                {statusLabels[model.status]}
              </Badge>
              {/* Verified badge */}
              {model.creator.isVerified && (
                <Badge className="absolute top-2 right-2 bg-blue-500">
                  <CheckCircle className="h-3 w-3" />
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              {/* Name & Creator */}
              <div className="mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {model.title}
                </h3>
                <p className="text-sm text-slate-500">
                  Par {model.creator.displayName}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {model.modelGender && (
                  <Badge variant="outline" className="text-xs">
                    {model.modelGender === 'female' ? 'Femme' : model.modelGender === 'male' ? 'Homme' : model.modelGender}
                  </Badge>
                )}
                {model.modelAgeRange && (
                  <Badge variant="outline" className="text-xs">
                    {model.modelAgeRange}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Coins className="h-3 w-3 mr-1" />
                  {model.priceUnits / 100} cr
                </Badge>
              </div>

              {/* Styles */}
              <div className="flex flex-wrap gap-1 mb-3">
                {model.modelStyles.slice(0, 3).map((style, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600"
                  >
                    {style}
                  </span>
                ))}
                {model.modelStyles.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-400">
                    +{model.modelStyles.length - 3}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="text-xs text-slate-400 mb-3">
                {model.usageCount} utilisation{model.usageCount !== 1 ? 's' : ''}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingModel(model)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {model.status === 'PENDING_REVIEW' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600"
                        onClick={() => updateStatus(model.id, 'APPROVED')}
                        title="Approuver"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => updateStatus(model.id, 'REJECTED')}
                        title="Rejeter"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredModels?.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">Aucun mannequin</h3>
          <p className="text-slate-500">
            {activeTab === 'PENDING_REVIEW'
              ? 'Aucun mannequin en attente de validation'
              : 'Créez votre premier mannequin pour commencer'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le Mannequin</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <ModelForm
              model={editingModel}
              onSave={saveModel}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
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

// Model Form Component
function ModelForm({
  model,
  onSave,
  saving,
}: {
  model?: Model;
  onSave: (formData: FormData, isNew: boolean) => void;
  saving: boolean;
}) {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    model?.thumbnailUrl || null
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    model?.modelStyles || []
  );

  const [formData, setFormData] = useState({
    id: model?.id || '',
    title: model?.title || '',
    description: model?.description || '',
    modelGender: model?.modelGender || 'female',
    modelAgeRange: model?.modelAgeRange || '25-35',
    priceUnits: model?.priceUnits || 50,
    tags: model?.tags.join(', ') || '',
    status: model?.status || 'APPROVED',
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  const handleSubmit = () => {
    const data = new FormData();
    if (model?.id) {
      data.append('id', model.id);
    }
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('modelGender', formData.modelGender);
    data.append('modelAgeRange', formData.modelAgeRange);
    data.append('modelStyles', selectedStyles.join(','));
    data.append('priceUnits', formData.priceUnits.toString());
    data.append('tags', formData.tags);
    if (model) {
      data.append('status', formData.status);
    }

    // Add thumbnail if selected
    if (thumbnailRef.current?.files?.[0]) {
      data.append('thumbnail', thumbnailRef.current.files[0]);
    }

    // Add additional images if selected
    if (imagesRef.current?.files) {
      for (const file of imagesRef.current.files) {
        data.append('images', file);
      }
    }

    onSave(data, !model?.id);
  };

  return (
    <div className="space-y-6">
      {/* Image Uploads */}
      <div className="grid grid-cols-2 gap-4">
        {/* Thumbnail */}
        <div>
          <Label className="mb-2 block">Photo principale</Label>
          <input
            ref={thumbnailRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailChange}
          />
          <div
            onClick={() => thumbnailRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg aspect-[3/4] flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors overflow-hidden"
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
                <span className="text-sm">Photo portrait</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Images */}
        <div>
          <Label className="mb-2 block">Photos additionnelles</Label>
          <input
            ref={imagesRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
          />
          <div
            onClick={() => imagesRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg aspect-[3/4] flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors"
          >
            <div className="text-center text-slate-400">
              <ImageIcon className="h-8 w-8 mx-auto mb-2" />
              <span className="text-sm">+ Photos</span>
              <p className="text-xs mt-1">Optionnel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <Label>Nom du mannequin</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Aminata"
        />
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Mannequin professionnelle, spécialisée en mode traditionnelle..."
          rows={3}
        />
      </div>

      {/* Gender & Age */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Genre</Label>
          <Select
            value={formData.modelGender}
            onValueChange={(value) => setFormData({ ...formData, modelGender: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tranche d'âge</Label>
          <Select
            value={formData.modelAgeRange}
            onValueChange={(value) => setFormData({ ...formData, modelAgeRange: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ageRangeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Styles */}
      <div>
        <Label className="mb-2 block">Styles</Label>
        <div className="flex flex-wrap gap-2">
          {styleOptions.map((style) => (
            <Button
              key={style}
              type="button"
              variant={selectedStyles.includes(style) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStyle(style)}
            >
              {style}
            </Button>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prix (en unités, 100 = 1 crédit)</Label>
          <Input
            type="number"
            value={formData.priceUnits}
            onChange={(e) =>
              setFormData({ ...formData, priceUnits: parseInt(e.target.value) || 0 })
            }
            min={0}
            step={25}
          />
          <p className="text-xs text-slate-500 mt-1">
            = {formData.priceUnits / 100} crédit{formData.priceUnits !== 100 ? 's' : ''}
          </p>
        </div>
        {model && (
          <div>
            <Label>Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Model['status'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approuvé</SelectItem>
                <SelectItem value="PENDING_REVIEW">En attente</SelectItem>
                <SelectItem value="REJECTED">Rejeté</SelectItem>
                <SelectItem value="SUSPENDED">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <Label>Tags (séparés par des virgules)</Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="mode, traditionnel, africain"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={saving || !formData.title || !formData.modelGender}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {model ? 'Mettre à jour' : 'Créer le mannequin'}
      </Button>
    </div>
  );
}
