'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  User,
  Camera,
  MapPin,
  FileText,
  IdCard,
  Image,
  ExternalLink,
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
  consentVerified: boolean;
  locationName: string | null;
  locationCity: string | null;
  locationType: string | null;
  usageCount: number;
  viewCount: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    displayName: string;
    type: string;
    user: {
      email: string;
      name: string | null;
    };
  };
}

interface SignedUrls {
  consentForm?: string;
  idDoc?: string;
  selfieVerify?: string;
  images?: string[];
}

const typeLabels: Record<string, string> = {
  MODEL_PROFILE: 'Mannequin',
  PHOTO_STYLE: 'Style photo',
  LOCATION: 'Lieu',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
  PENDING_REVIEW: { label: 'En attente de review', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700' },
};

export default function AdminAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const response = await fetch(`/api/v1/admin/assets/${assetId}`);
        if (!response.ok) throw new Error('Failed to fetch asset');
        const data = await response.json();
        setAsset(data.asset);
        setSignedUrls(data.signedUrls || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAsset();
  }, [assetId]);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/v1/admin/assets/${assetId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to approve asset');
      router.push('/admin/assets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Veuillez indiquer une raison de rejet');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/v1/admin/assets/${assetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!response.ok) throw new Error('Failed to reject asset');
      router.push('/admin/assets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error && !asset) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    );
  }

  if (!asset) return null;

  const status = statusConfig[asset.status] || statusConfig.DRAFT;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {asset.title}
            </h1>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          <p className="text-slate-600">
            {typeLabels[asset.type]} par {asset.creator.displayName}
          </p>
        </div>

        {/* Actions */}
        {asset.status === 'PENDING_REVIEW' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approuver
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Rejection Form */}
      {showRejectForm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 space-y-4">
            <Textarea
              placeholder="Raison du rejet (sera visible par le créateur)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(false)}
                disabled={isProcessing}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirmer le rejet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Asset Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {asset.thumbnailUrl && (
              <img
                src={asset.thumbnailUrl}
                alt={asset.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            {asset.description && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                <p className="text-slate-900 dark:text-white">{asset.description}</p>
              </div>
            )}

            {asset.type === 'MODEL_PROFILE' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Genre</p>
                    <p className="text-slate-900 dark:text-white">{asset.modelGender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Tranche d&apos;âge</p>
                    <p className="text-slate-900 dark:text-white">{asset.modelAgeRange || '-'}</p>
                  </div>
                </div>
                {asset.modelStyles.length > 0 && (
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

            {asset.type === 'LOCATION' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Nom du lieu</p>
                  <p className="text-slate-900 dark:text-white">{asset.locationName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Ville</p>
                  <p className="text-slate-900 dark:text-white">{asset.locationCity || '-'}</p>
                </div>
              </div>
            )}

            {asset.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Prix</p>
                <p className="text-slate-900 dark:text-white">{asset.priceUnits / 100} crédits</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Créé le</p>
                <p className="text-slate-900 dark:text-white">
                  {new Date(asset.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Creator & Consent Info */}
        <div className="space-y-6">
          {/* Creator Info */}
          <Card>
            <CardHeader>
              <CardTitle>Créateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Nom</p>
                <p className="text-slate-900 dark:text-white">{asset.creator.displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Email</p>
                <p className="text-slate-900 dark:text-white">{asset.creator.user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Consent Documents (for models) */}
          {asset.type === 'MODEL_PROFILE' && (
            <Card>
              <CardHeader>
                <CardTitle>Documents de consentement</CardTitle>
                <CardDescription>
                  Vérifiez l&apos;identité et le consentement du mannequin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Consent Form */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <span>Formulaire de consentement</span>
                  </div>
                  {signedUrls.consentForm ? (
                    <a
                      href={signedUrls.consentForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-600 hover:underline"
                    >
                      Voir
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>

                {/* ID Document */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <IdCard className="h-5 w-5 text-slate-500" />
                    <span>Pièce d&apos;identité</span>
                  </div>
                  {signedUrls.idDoc ? (
                    <a
                      href={signedUrls.idDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-600 hover:underline"
                    >
                      Voir
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>

                {/* Selfie Verification */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-500" />
                    <span>Selfie de vérification</span>
                  </div>
                  {signedUrls.selfieVerify ? (
                    <a
                      href={signedUrls.selfieVerify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-600 hover:underline"
                    >
                      Voir
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Manquant</Badge>
                  )}
                </div>

                {/* Consent Status */}
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    {asset.consentVerified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-700">Consentement vérifié</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <span className="text-amber-700">Consentement non vérifié</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset Images */}
          {signedUrls.images && signedUrls.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos du mannequin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {signedUrls.images.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
