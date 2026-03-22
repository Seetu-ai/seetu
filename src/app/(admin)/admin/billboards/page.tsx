'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
  Monitor,
  Loader2,
  MapPin,
  Wifi,
  WifiOff,
  Wrench,
  Copy,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface Billboard {
  id: string;
  name: string;
  slug: string;
  address: string;
  latitude: number;
  longitude: number;
  resolutionWidth: number;
  resolutionHeight: number;
  pricePerSlot: number;
  slotDurationSecs: number;
  status: 'online' | 'offline' | 'maintenance';
  lastHeartbeat: string | null;
  previewImageUrl: string | null;
  apiKey: string | null;
  isActive: boolean;
  queueCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig = {
  online: { label: 'En ligne', color: 'bg-green-100 text-green-700', icon: Wifi },
  offline: { label: 'Hors ligne', color: 'bg-slate-100 text-slate-700', icon: WifiOff },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700', icon: Wrench },
};

export default function AdminBillboardsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);
  const [saving, setSaving] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ billboards: Billboard[] }>(
    '/api/v1/admin/billboards?include_inactive=true',
    fetcher
  );

  const saveBillboard = async (formData: Record<string, unknown>, isNew: boolean) => {
    setSaving(true);
    try {
      const url = isNew
        ? '/api/v1/admin/billboards'
        : `/api/v1/admin/billboards/${formData.id}`;

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      if (result.apiKey || result.newApiKey) {
        setNewApiKey(result.apiKey || result.newApiKey);
      }

      toast.success(isNew ? 'Panneau créé avec succès' : 'Panneau mis à jour');
      mutate();

      if (!result.apiKey && !result.newApiKey) {
        setEditingBillboard(null);
        setIsCreating(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteBillboard = async (id: string) => {
    if (!confirm('Supprimer ce panneau ?')) return;

    try {
      const response = await fetch(`/api/v1/admin/billboards/${id}?force=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      toast.success('Panneau supprimé');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Clé API copiée');
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
            Panneaux Numériques
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez le réseau de panneaux publicitaires
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/billboards/content">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Modération
            </Button>
          </Link>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Panneau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un Panneau</DialogTitle>
              </DialogHeader>
              <BillboardForm onSave={saveBillboard} saving={saving} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data?.billboards.length || 0}</div>
            <p className="text-sm text-slate-500">Total panneaux</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {data?.billboards.filter((b) => b.status === 'online').length || 0}
            </div>
            <p className="text-sm text-slate-500">En ligne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {data?.billboards.reduce((sum, b) => sum + b.queueCount, 0) || 0}
            </div>
            <p className="text-sm text-slate-500">En file d'attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data?.billboards.filter((b) => !b.isActive).length || 0}
            </div>
            <p className="text-sm text-slate-500">Désactivés</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.billboards.map((billboard) => {
          const StatusIcon = statusConfig[billboard.status].icon;
          return (
            <Card
              key={billboard.id}
              className={`${!billboard.isActive ? 'opacity-60' : ''}`}
            >
              {/* Preview */}
              <div className="relative aspect-video bg-slate-100">
                {billboard.previewImageUrl ? (
                  <img
                    src={billboard.previewImageUrl}
                    alt={billboard.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Monitor className="h-12 w-12 text-slate-300" />
                  </div>
                )}
                <Badge className={`absolute top-2 left-2 ${statusConfig[billboard.status].color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[billboard.status].label}
                </Badge>
                {!billboard.isActive && (
                  <Badge className="absolute top-2 right-2 bg-red-100 text-red-700">
                    Désactivé
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg">{billboard.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {billboard.address}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">
                    {billboard.resolutionWidth}x{billboard.resolutionHeight}
                  </Badge>
                  <Badge variant="outline">
                    {billboard.pricePerSlot.toLocaleString()} FCFA
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(billboard.slotDurationSecs / 60)} min
                  </Badge>
                </div>

                <div className="text-sm text-slate-500 mb-3">
                  {billboard.queueCount} contenu{billboard.queueCount !== 1 ? 's' : ''} en file
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingBillboard(billboard)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => deleteBillboard(billboard.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {billboard.apiKey && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyApiKey(billboard.apiKey!)}
                      title="Copier la clé API"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBillboard} onOpenChange={() => setEditingBillboard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Panneau</DialogTitle>
          </DialogHeader>
          {editingBillboard && (
            <BillboardForm
              billboard={editingBillboard}
              onSave={saveBillboard}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clé API du Panneau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Conservez cette clé précieusement. Elle ne sera plus affichée.
            </p>
            <div className="flex items-center gap-2">
              <Input value={newApiKey || ''} readOnly className="font-mono text-sm" />
              <Button onClick={() => copyApiKey(newApiKey!)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setNewApiKey(null);
                setEditingBillboard(null);
                setIsCreating(false);
              }}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillboardForm({
  billboard,
  onSave,
  saving,
}: {
  billboard?: Billboard;
  onSave: (data: Record<string, unknown>, isNew: boolean) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    id: billboard?.id || '',
    name: billboard?.name || '',
    slug: billboard?.slug || '',
    address: billboard?.address || '',
    latitude: billboard?.latitude || 14.6937,
    longitude: billboard?.longitude || -17.4441,
    pricePerSlot: billboard?.pricePerSlot || 5000,
    slotDurationSecs: billboard?.slotDurationSecs || 300,
    resolutionWidth: billboard?.resolutionWidth || 1920,
    resolutionHeight: billboard?.resolutionHeight || 1080,
    previewImageUrl: billboard?.previewImageUrl || '',
    status: billboard?.status || 'offline',
    isActive: billboard?.isActive ?? true,
    regenerateApiKey: false,
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.slug || !formData.address) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    onSave(formData, !billboard?.id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sea Plaza"
          />
        </div>
        <div>
          <Label>Slug *</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="sea-plaza"
          />
        </div>
      </div>

      <div>
        <Label>Adresse *</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Corniche Ouest, Dakar"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Latitude</Label>
          <Input
            type="number"
            step="0.0001"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input
            type="number"
            step="0.0001"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prix par créneau (FCFA)</Label>
          <Input
            type="number"
            value={formData.pricePerSlot}
            onChange={(e) => setFormData({ ...formData, pricePerSlot: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Durée du créneau (secondes)</Label>
          <Input
            type="number"
            value={formData.slotDurationSecs}
            onChange={(e) => setFormData({ ...formData, slotDurationSecs: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Résolution Largeur</Label>
          <Input
            type="number"
            value={formData.resolutionWidth}
            onChange={(e) => setFormData({ ...formData, resolutionWidth: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Résolution Hauteur</Label>
          <Input
            type="number"
            value={formData.resolutionHeight}
            onChange={(e) => setFormData({ ...formData, resolutionHeight: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label>URL Image Preview</Label>
        <Input
          value={formData.previewImageUrl}
          onChange={(e) => setFormData({ ...formData, previewImageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      {billboard && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Billboard['status'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">En ligne</SelectItem>
                <SelectItem value="offline">Hors ligne</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <Label htmlFor="isActive">Panneau actif</Label>
          </div>
        </div>
      )}

      {billboard && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="checkbox"
            id="regenerateApiKey"
            checked={formData.regenerateApiKey}
            onChange={(e) => setFormData({ ...formData, regenerateApiKey: e.target.checked })}
          />
          <Label htmlFor="regenerateApiKey">Régénérer la clé API</Label>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {billboard ? 'Mettre à jour' : 'Créer le panneau'}
      </Button>
    </div>
  );
}
