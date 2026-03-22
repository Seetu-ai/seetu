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
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Monitor,
  Eye,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Content {
  id: string;
  mediaType: string;
  originalUrl: string;
  processedUrls: Record<string, string>;
  durationSeconds: number | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  payment: {
    id: string;
    amountCfa: number;
    status: string;
    paidAt: string | null;
  } | null;
  queueItems: Array<{
    id: string;
    billboardId: string;
    billboardName: string;
    position: number;
    status: string;
    proofUrl: string | null;
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_validation: {
    label: 'Validation en cours',
    color: 'bg-blue-100 text-blue-700',
    icon: <Clock className="h-3 w-3" />,
  },
  pending_moderation: {
    label: 'En modération',
    color: 'bg-amber-100 text-amber-700',
    icon: <Clock className="h-3 w-3" />,
  },
  pending_payment: {
    label: 'Paiement requis',
    color: 'bg-purple-100 text-purple-700',
    icon: <CreditCard className="h-3 w-3" />,
  },
  processing: {
    label: 'En traitement',
    color: 'bg-cyan-100 text-cyan-700',
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
  },
  ready: {
    label: 'Prêt',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: 'Rejeté',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-3 w-3" />,
  },
};

export default function MyBillboardContentPage() {
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<{
    contents: Content[];
    pagination: { total: number };
  }>('/api/v1/billboard-content/my', fetcher);

  const deleteContent = async (id: string) => {
    if (!confirm('Supprimer ce contenu ?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/v1/billboard-content/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      toast.success('Contenu supprimé');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(null);
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
            Mes publicités
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Suivez le statut de vos diffusions
          </p>
        </div>
        <Link href="/billboards/upload">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Upload className="h-4 w-4 mr-2" />
            Nouvelle publicité
          </Button>
        </Link>
      </div>

      {/* Content List */}
      {data?.contents.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucune publicité</h3>
          <p className="text-slate-500 mb-4">
            Commencez par télécharger votre première publicité
          </p>
          <Link href="/billboards/upload">
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Upload className="h-4 w-4 mr-2" />
              Publier une annonce
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.contents.map((content) => {
            const status = statusConfig[content.status] || statusConfig.pending_validation;
            return (
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
                  <Badge className={`absolute top-2 left-2 ${status.color}`}>
                    {status.icon}
                    <span className="ml-1">{status.label}</span>
                  </Badge>
                  <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                    {content.mediaType === 'video' ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  {/* Rejection reason */}
                  {content.rejectionReason && (
                    <p className="text-sm text-red-600 mb-2">
                      {content.rejectionReason}
                    </p>
                  )}

                  {/* Queue positions */}
                  {content.queueItems.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {content.queueItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-600">{item.billboardName}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.status === 'completed'
                              ? 'Diffusé'
                              : item.status === 'playing'
                              ? 'En cours'
                              : `#${item.position}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payment status */}
                  {content.payment && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-slate-500">
                        {content.payment.amountCfa.toLocaleString()} FCFA
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          content.payment.status === 'completed'
                            ? 'text-green-600 border-green-200'
                            : 'text-amber-600 border-amber-200'
                        }
                      >
                        {content.payment.status === 'completed' ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                  )}

                  {/* Date & Actions */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t">
                    <span className="text-xs text-slate-400">
                      {new Date(content.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {['pending_validation', 'pending_moderation', 'pending_payment'].includes(
                      content.status
                    ) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteContent(content.id)}
                        disabled={deleting === content.id}
                      >
                        {deleting === content.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Aperçu</DialogTitle>
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

              {/* Proofs */}
              {previewContent.queueItems.some((q) => q.proofUrl) && (
                <div>
                  <h4 className="font-medium mb-2">Preuves de diffusion</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {previewContent.queueItems
                      .filter((q) => q.proofUrl)
                      .map((item) => (
                        <div key={item.id} className="space-y-1">
                          <p className="text-sm text-slate-600">{item.billboardName}</p>
                          <img
                            src={item.proofUrl!}
                            alt={`Preuve - ${item.billboardName}`}
                            className="w-full rounded-lg"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
