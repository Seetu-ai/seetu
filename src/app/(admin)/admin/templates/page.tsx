'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronDown,
  ChevronRight,
  Palette,
  Loader2,
} from 'lucide-react';

interface Template {
  id: string;
  slug: string;
  name: string;
  type: string;
  prompt: string;
  negativePrompt: string | null;
  defaultParams: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
}

interface TemplatePack {
  id: string;
  slug: string;
  name: string;
  vertical: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  templates: Template[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const verticalLabels: Record<string, string> = {
  fashion: 'Mode',
  food: 'Alimentation',
  beauty: 'Beauté',
  realestate: 'Immobilier',
  other: 'Autre',
};

const typeLabels: Record<string, string> = {
  product_photo: 'Photo Produit',
  promo: 'Promo',
  model: 'Modèle',
  caption: 'Légende',
};

export default function AdminTemplatesPage() {
  const { data, error, isLoading, mutate } = useSWR<{ packs: TemplatePack[] }>(
    '/api/v1/admin/templates',
    fetcher
  );

  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [editingPack, setEditingPack] = useState<TemplatePack | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ template: Template; packId: string } | null>(null);
  const [isCreatingPack, setIsCreatingPack] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const togglePack = (packId: string) => {
    const newExpanded = new Set(expandedPacks);
    if (newExpanded.has(packId)) {
      newExpanded.delete(packId);
    } else {
      newExpanded.add(packId);
    }
    setExpandedPacks(newExpanded);
  };

  const savePack = async (pack: Partial<TemplatePack> & { id?: string }) => {
    setSaving(true);
    try {
      const method = pack.id ? 'PUT' : 'POST';
      const response = await fetch('/api/v1/admin/templates/packs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pack),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(pack.id ? 'Pack mis à jour' : 'Pack créé');
      mutate();
      setEditingPack(null);
      setIsCreatingPack(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async (template: Partial<Template> & { packId: string; id?: string }) => {
    setSaving(true);
    try {
      const method = template.id ? 'PUT' : 'POST';
      const response = await fetch('/api/v1/admin/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(template.id ? 'Template mis à jour' : 'Template créé');
      mutate();
      setEditingTemplate(null);
      setIsCreatingTemplate(null);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Supprimer ce template ?')) return;

    try {
      const response = await fetch(`/api/v1/admin/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Template supprimé');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Templates & Vibes
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez les packs de templates et les vibes disponibles
          </p>
        </div>
        <Dialog open={isCreatingPack} onOpenChange={setIsCreatingPack}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Pack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Template Pack</DialogTitle>
              <DialogDescription>
                Un pack regroupe plusieurs templates/vibes pour une industrie
              </DialogDescription>
            </DialogHeader>
            <PackForm onSave={savePack} saving={saving} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Packs */}
      <div className="space-y-4">
        {data?.packs.map((pack) => (
          <Card key={pack.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => togglePack(pack.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedPacks.has(pack.id) ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                  <Palette className="h-5 w-5 text-violet-600" />
                  <div>
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <p className="text-sm text-slate-500">{pack.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pack.isActive ? 'default' : 'secondary'}>
                    {pack.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Badge variant="outline">{verticalLabels[pack.vertical]}</Badge>
                  <Badge variant="outline">{pack.templates.length} templates</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPack(pack);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedPacks.has(pack.id) && (
              <CardContent className="border-t">
                <div className="pt-4 space-y-3">
                  {pack.templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[template.type]}
                          </Badge>
                          {!template.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {template.prompt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTemplate({ template, packId: pack.id })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsCreatingTemplate(pack.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un template
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Edit Pack Dialog */}
      <Dialog open={!!editingPack} onOpenChange={() => setEditingPack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Pack</DialogTitle>
          </DialogHeader>
          {editingPack && (
            <PackForm pack={editingPack} onSave={savePack} saving={saving} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              template={editingTemplate.template}
              packId={editingTemplate.packId}
              onSave={saveTemplate}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={!!isCreatingTemplate} onOpenChange={() => setIsCreatingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un Template</DialogTitle>
          </DialogHeader>
          {isCreatingTemplate && (
            <TemplateForm
              packId={isCreatingTemplate}
              onSave={saveTemplate}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Pack Form Component
function PackForm({
  pack,
  onSave,
  saving,
}: {
  pack?: TemplatePack;
  onSave: (pack: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    id: pack?.id,
    slug: pack?.slug || '',
    name: pack?.name || '',
    vertical: pack?.vertical || 'fashion',
    description: pack?.description || '',
    isActive: pack?.isActive ?? true,
    isDefault: pack?.isDefault ?? false,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Fashion Sénégal"
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="fashion-senegal-v2"
          />
        </div>
      </div>

      <div>
        <Label>Industrie</Label>
        <Select
          value={formData.vertical}
          onValueChange={(value) => setFormData({ ...formData, vertical: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fashion">Mode</SelectItem>
            <SelectItem value="food">Alimentation</SelectItem>
            <SelectItem value="beauty">Beauté</SelectItem>
            <SelectItem value="realestate">Immobilier</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description du pack..."
        />
      </div>

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
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
          />
          <Label>Par défaut</Label>
        </div>
      </div>

      <Button
        onClick={() => onSave(formData)}
        disabled={saving}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {pack ? 'Mettre à jour' : 'Créer'}
      </Button>
    </div>
  );
}

// Template Form Component
function TemplateForm({
  template,
  packId,
  onSave,
  saving,
}: {
  template?: Template;
  packId: string;
  onSave: (template: any) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    id: template?.id,
    packId,
    slug: template?.slug || '',
    name: template?.name || '',
    type: template?.type || 'product_photo',
    prompt: template?.prompt || '',
    negativePrompt: template?.negativePrompt || '',
    defaultParams: template?.defaultParams || {
      width: 1024,
      height: 1024,
      guidance_scale: 7.5,
      steps: 30,
      strength: 0.75,
    },
    isActive: template?.isActive ?? true,
    sortOrder: template?.sortOrder || 0,
  });

  const updateParam = (key: string, value: number) => {
    setFormData({
      ...formData,
      defaultParams: { ...formData.defaultParams, [key]: value },
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Studio Blanc"
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="studio-blanc"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_photo">Photo Produit</SelectItem>
              <SelectItem value="promo">Promo</SelectItem>
              <SelectItem value="model">Modèle</SelectItem>
              <SelectItem value="caption">Légende</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ordre</Label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label>Prompt</Label>
        <Textarea
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          placeholder="Professional product photography of {{product}}..."
          rows={4}
        />
        <p className="text-xs text-slate-500 mt-1">
          Utilisez {'{{product}}'} pour insérer le nom du produit
        </p>
      </div>

      <div>
        <Label>Negative Prompt</Label>
        <Textarea
          value={formData.negativePrompt}
          onChange={(e) => setFormData({ ...formData, negativePrompt: e.target.value })}
          placeholder="blurry, low quality, distorted..."
          rows={2}
        />
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <Label className="text-sm font-medium">Paramètres de génération</Label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={formData.defaultParams.width}
              onChange={(e) => updateParam('width', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={formData.defaultParams.height}
              onChange={(e) => updateParam('height', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Guidance Scale</Label>
            <Input
              type="number"
              step="0.5"
              value={formData.defaultParams.guidance_scale}
              onChange={(e) => updateParam('guidance_scale', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Steps</Label>
            <Input
              type="number"
              value={formData.defaultParams.steps}
              onChange={(e) => updateParam('steps', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Strength (0-1)</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={formData.defaultParams.strength}
              onChange={(e) => updateParam('strength', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label>Template actif</Label>
      </div>

      <Button
        onClick={() => onSave(formData)}
        disabled={saving}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {template ? 'Mettre à jour' : 'Créer'}
      </Button>
    </div>
  );
}
