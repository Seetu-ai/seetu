'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  User,
  Camera,
  MapPin,
  Edit,
  Trash2,
  Send,
  Eye,
  TrendingUp,
} from 'lucide-react';

interface Asset {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceUnits: number;
  tags: string[];
  modelGender: string | null;
  modelAgeRange: string | null;
  modelStyles: string[];
  locationName: string | null;
  locationCity: string | null;
  locationType: string | null;
  usageCount: number;
  viewCount: number;
  rejectionReason: string | null;
  hasConsentForm: boolean;
  hasIdDoc: boolean;
  hasSelfieVerify: boolean;
  consentVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Clock },
  PENDING_REVIEW: { label: 'En attente de review', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  MODEL_PROFILE: { label: 'Profil Mannequin', icon: User, color: 'bg-pink-100 text-pink-600' },
  PHOTO_STYLE: { label: 'Style Photo', icon: Camera, color: 'bg-violet-100 text-violet-600' },
  LOCATION: { label: 'Lieu', icon: MapPin, color: 'bg-amber-100 text-amber-600' },
};

export default function CreatorAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const response = await fetch(`/api/v1/assets/${assetId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Asset non trouvé');
          }
          throw new Error('Erreur lors du chargement');
        }
        const data = await response.json();
        setAsset(data.asset);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assets/${assetId}/submit`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission');
      }
      toast.success('Asset soumis pour review!');
      setAsset(prev => prev ? { ...prev, status: 'PENDING_REVIEW' } : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet asset ?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/v1/assets/${assetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      toast.success('Asset supprimé');
      router.push('/creator');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {error || 'Asset non trouvé'}
        </h2>
        <Button onClick={() => router.push('/creator')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  const status = statusConfig[asset.status] || statusConfig.DRAFT;
  const type = typeConfig[asset.type] || typeConfig.MODEL_PROFILE;
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  const canEdit = ['DRAFT', 'REJECTED'].includes(asset.status);
  const canSubmit = asset.status === 'DRAFT' && asset.thumbnailUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {asset.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {type.label}
              </p>
            </div>
          </div>
        </div>

        <Badge className={status.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Rejection Reason Alert */}
      {asset.status === 'REJECTED' && asset.rejectionReason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Raison du rejet</h3>
              <p className="text-red-700 mt-1">{asset.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Thumbnail */}
          <Card>
            <CardContent className="p-0">
              {asset.thumbnailUrl ? (
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <p className="text-slate-400">Aucune image de couverture</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-slate-900 dark:text-white">{asset.description}</p>
                </div>
              )}

              {/* Location-specific fields */}
              {asset.type === 'LOCATION' && (
                <div className="grid grid-cols-2 gap-4">
                  {asset.locationName && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Nom du lieu</p>
                      <p className="text-slate-900 dark:text-white">{asset.locationName}</p>
                    </div>
                  )}
                  {asset.locationCity && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Ville</p>
                      <p className="text-slate-900 dark:text-white">{asset.locationCity}</p>
                    </div>
                  )}
                  {asset.locationType && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Type de lieu</p>
                      <p className="text-slate-900 dark:text-white">{asset.locationType}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Model-specific fields */}
              {asset.type === 'MODEL_PROFILE' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {asset.modelGender && (
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Genre</p>
                        <p className="text-slate-900 dark:text-white">{asset.modelGender}</p>
                      </div>
                    )}
                    {asset.modelAgeRange && (
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Tranche d&apos;âge</p>
                        <p className="text-slate-900 dark:text-white">{asset.modelAgeRange}</p>
                      </div>
                    )}
                  </div>
                  {asset.modelStyles && asset.modelStyles.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Styles</p>
                      <div className="flex flex-wrap gap-2">
                        {asset.modelStyles.map((style) => (
                          <Badge key={style} variant="outline">{style}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tags */}
              {asset.tags && asset.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Eye className="h-4 w-4" />
                  <span>Vues</span>
                </div>
                <span className="font-semibold">{asset.viewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Utilisations</span>
                </div>
                <span className="font-semibold">{asset.usageCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span>Prix</span>
                </div>
                <span className="font-semibold">{asset.priceUnits / 100} crédits</span>
              </div>
            </CardContent>
          </Card>

          {/* Consent Status (for models) */}
          {asset.type === 'MODEL_PROFILE' && (
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Documents requis pour les profils mannequin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Consentement</span>
                  {asset.hasConsentForm ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploadé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pièce d&apos;identité</span>
                  {asset.hasIdDoc ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploadé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Selfie vérification</span>
                  {asset.hasSelfieVerify ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploadé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canSubmit && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Soumettre pour review
                </Button>
              )}

              {canEdit && (
                <Link href={`/creator/assets/${asset.id}/edit`} className="block">
                  <Button variant="outline" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </Link>
              )}

              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Supprimer
                </Button>
              )}

              {asset.status === 'PENDING_REVIEW' && (
                <p className="text-sm text-amber-600 text-center">
                  Votre asset est en cours de review par notre équipe.
                </p>
              )}

              {asset.status === 'APPROVED' && (
                <p className="text-sm text-green-600 text-center">
                  Votre asset est actif et visible sur la marketplace.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
