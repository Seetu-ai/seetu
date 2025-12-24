'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Phone,
  User,
} from 'lucide-react';

interface Payout {
  id: string;
  amountFcfa: number;
  payoutMethod: string;
  payoutPhone: string;
  status: string;
  transactionRef: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
  creator: {
    id: string;
    displayName: string;
    payoutMethod: string;
    payoutPhone: string;
    user: {
      email: string;
      name: string | null;
    };
  };
}

const statusTabs = [
  { id: 'pending', label: 'En attente', icon: Clock },
  { id: 'completed', label: 'Complétés', icon: CheckCircle },
  { id: 'failed', label: 'Échoués', icon: XCircle },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Complété', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, [activeTab]);

  const fetchPayouts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/payouts?status=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch payouts');
      const data = await response.json();
      setPayouts(data.payouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const response = await fetch(`/api/v1/admin/payouts/${payoutId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionRef: transactionRef || undefined }),
      });
      if (!response.ok) throw new Error('Failed to approve payout');
      setTransactionRef('');
      fetchPayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'approbation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (payoutId: string) => {
    if (!rejectReason.trim()) {
      setError('Veuillez indiquer une raison de rejet');
      return;
    }

    setProcessingId(payoutId);
    try {
      const response = await fetch(`/api/v1/admin/payouts/${payoutId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!response.ok) throw new Error('Failed to reject payout');
      setRejectReason('');
      setShowRejectForm(null);
      fetchPayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Paiements Créateurs
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gérez les demandes de paiement des créateurs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? '' : 'text-slate-600'}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : payouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Aucun paiement
            </h3>
            <p className="text-slate-500">
              Aucun paiement avec le statut &quot;{statusTabs.find(t => t.id === activeTab)?.label}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => {
            const status = statusConfig[payout.status] || statusConfig.PENDING;
            const isProcessing = processingId === payout.id;

            return (
              <Card key={payout.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Creator Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {payout.creator.displayName}
                          </h3>
                          <p className="text-sm text-slate-500">{payout.creator.user.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-slate-500">Montant</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {payout.amountFcfa.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Méthode</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase">
                              {payout.payoutMethod}
                            </Badge>
                            <span className="flex items-center gap-1 text-sm text-slate-600">
                              <Phone className="h-3 w-3" />
                              {payout.payoutPhone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>Demandé le {new Date(payout.createdAt).toLocaleDateString('fr-FR')}</span>
                        {payout.processedAt && (
                          <span>Traité le {new Date(payout.processedAt).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>

                      {payout.transactionRef && (
                        <p className="mt-2 text-sm text-slate-600">
                          Ref: <span className="font-mono">{payout.transactionRef}</span>
                        </p>
                      )}

                      {payout.failureReason && (
                        <p className="mt-2 text-sm text-red-600">
                          Raison: {payout.failureReason}
                        </p>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <Badge className={status.color}>{status.label}</Badge>

                      {payout.status === 'pending' && (
                        <div className="space-y-2">
                          {showRejectForm === payout.id ? (
                            <div className="space-y-2 w-64">
                              <Textarea
                                placeholder="Raison du rejet..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowRejectForm(null)}
                                  disabled={isProcessing}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(payout.id)}
                                  disabled={isProcessing || !rejectReason.trim()}
                                >
                                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rejeter'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Ref. transaction (optionnel)"
                                  value={transactionRef}
                                  onChange={(e) => setTransactionRef(e.target.value)}
                                  className="w-48 h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(payout.id)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approuver
                                    </>
                                  )}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRejectForm(payout.id)}
                                disabled={isProcessing}
                                className="w-full"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
