'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Video,
  Phone,
  User,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface Content {
  id: string;
  mediaType: string;
  originalUrl: string;
  processedUrls: Record<string, string>;
  durationSeconds: number | null;
  status: string;
  rejectionReason: string | null;
  moderationResult: {
    overallRisk?: string;
    reviewRequired?: boolean;
    categories?: Array<{
      category: string;
      confidence: number;
      detected: boolean;
    }>;
  } | null;
  whatsappPhone: string | null;
  whatsappName: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  billboards: Array<{
    id: string;
    name: string;
    queueStatus: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_validation: { label: 'Validation', color: 'bg-blue-100 text-blue-700' },
  pending_moderation: { label: 'Modération', color: 'bg-amber-100 text-amber-700' },
  pending_payment: { label: 'Paiement', color: 'bg-purple-100 text-purple-700' },
  processing: { label: 'Traitement', color: 'bg-cyan-100 text-cyan-700' },
  ready: { label: 'Prêt', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
};

export default function AdminBillboardContentPage() {
  const [activeTab, setActiveTab] = useState<string>('pending_moderation');
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{
    contents: Content[];
    pagination: { total: number };
  }>(
    `/api/v1/admin/billboards/content?status=${activeTab === 'all' ? '' : activeTab}`,
    fetcher
  );

  const approveContent = async (id: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/v1/admin/billboards/content/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      toast.success('Contenu approuvé');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const rejectContent = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      toast.error('Veuillez fournir une raison');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/v1/admin/billboards/content/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      toast.success('Contenu rejeté');
      setRejectingId(null);
      setRejectionReason('');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setProcessing(false);
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
            Modération du Contenu
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Approuvez ou rejetez le contenu pour les panneaux
          </p>
        </div>
        <Link href="/admin/billboards">
          <Button variant="outline">Retour aux panneaux</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-4">
        {[
          { id: 'pending_moderation', label: 'À modérer' },
          { id: 'pending_validation', label: 'Validation' },
          { id: 'pending_payment', label: 'Paiement' },
          { id: 'ready', label: 'Prêts' },
          { id: 'rejected', label: 'Rejetés' },
          { id: 'all', label: 'Tous' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.contents.map((content) => (
          <Card key={content.id} className="overflow-hidden">
            {/* Preview */}
            <div
              className="relative aspect-video bg-slate-100 cursor-pointer group"
              onClick={() => setPreviewContent(content)}
            >
              {content.mediaType === 'video' ? (
                <video
                  src={content.originalUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={content.originalUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <Badge className={`absolute top-2 left-2 ${statusConfig[content.status]?.color || 'bg-slate-100'}`}>
                {statusConfig[content.status]?.label || content.status}
              </Badge>
              {content.mediaType === 'video' && (
                <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                  <Video className="h-3 w-3 mr-1" />
                  {content.durationSeconds}s
                </Badge>
              )}
              {content.moderationResult?.reviewRequired && (
                <Badge className="absolute bottom-2 left-2 bg-amber-500 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Review
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              {/* Source */}
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                {content.whatsappPhone ? (
                  <>
                    <Phone className="h-3 w-3" />
                    <span>{content.whatsappName || content.whatsappPhone}</span>
                  </>
                ) : content.user ? (
                  <>
                    <User className="h-3 w-3" />
                    <span>{content.user.name || content.user.email}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Anonyme</span>
                )}
              </div>

              {/* Moderation flags */}
              {content.moderationResult?.categories && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {content.moderationResult.categories
                    .filter((c) => c.detected)
                    .slice(0, 3)
                    .map((cat) => (
                      <Badge
                        key={cat.category}
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-200"
                      >
                        {cat.category}
                      </Badge>
                    ))}
                </div>
              )}

              {/* Rejection reason */}
              {content.rejectionReason && (
                <p className="text-xs text-red-600 mb-2">{content.rejectionReason}</p>
              )}

              {/* Date */}
              <p className="text-xs text-slate-400 mb-3">
                {new Date(content.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>

              {/* Actions */}
              {content.status === 'pending_moderation' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => approveContent(content.id)}
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setRejectingId(content.id);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {data?.contents.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">Aucun contenu</h3>
          <p className="text-slate-500">
            {activeTab === 'pending_moderation'
              ? 'Aucun contenu en attente de modération'
              : 'Aucun contenu dans cette catégorie'}
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Aperçu du contenu</DialogTitle>
          </DialogHeader>
          {previewContent && (
            <div className="space-y-4">
              {previewContent.mediaType === 'video' ? (
                <video
                  src={previewContent.originalUrl}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <img
                  src={previewContent.originalUrl}
                  alt=""
                  className="w-full rounded-lg"
                />
              )}
              {previewContent.moderationResult && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-2">Résultat de modération</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Risque: <Badge>{previewContent.moderationResult.overallRisk || 'N/A'}</Badge>
                    </div>
                    <div>
                      Review: {previewContent.moderationResult.reviewRequired ? 'Oui' : 'Non'}
                    </div>
                  </div>
                  {previewContent.moderationResult.categories && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Catégories détectées:</p>
                      <div className="flex flex-wrap gap-1">
                        {previewContent.moderationResult.categories
                          .filter((c) => c.detected)
                          .map((cat) => (
                            <Badge key={cat.category} variant="outline">
                              {cat.category} ({Math.round(cat.confidence * 100)}%)
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le contenu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Raison du rejet *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contenu inapproprié, qualité insuffisante, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectingId(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={rejectContent}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Rejeter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
