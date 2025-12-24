'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  TrendingUp,
  Eye,
  DollarSign,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  History,
  Users,
} from 'lucide-react';

interface CreatorProfile {
  id: string;
  type: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  totalAssets: number;
  totalUsages: number;
  rating: number | null;
  reviewCount: number;
  createdAt: string;
}

interface Asset {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceUnits: number;
  usageCount: number;
  viewCount: number;
  rejectionReason: string | null;
  createdAt: string;
}

interface Earnings {
  totalUsages: number;
  totalEarningsFcfa: number;
  pendingFcfa: number;
  settledFcfa: number;
  canRequestPayout: boolean;
  minPayoutFcfa: number;
}

interface Payout {
  id: string;
  amountFcfa: number;
  status: string;
  payoutMethod: string;
  createdAt: string;
  processedAt: string | null;
  failureReason: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Clock },
  PENDING_REVIEW: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function CreatorDashboardPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch profile and assets
      const profileRes = await fetch('/api/v1/creators/me');
      if (profileRes.status === 404) {
        // No creator profile - show registration prompt
        setNotRegistered(true);
        setIsLoading(false);
        return;
      }
      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setProfile(profileData.profile);
      setAssets(profileData.assets);

      // Fetch earnings
      const earningsRes = await fetch('/api/v1/creators/earnings');
      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setEarnings(earningsData.earnings);
      }

      // Fetch payouts
      const payoutsRes = await fetch('/api/v1/creators/payouts?limit=5');
      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayouts(payoutsData.payouts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async () => {
    setIsRequestingPayout(true);
    try {
      const res = await fetch('/api/v1/creators/payouts', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request payout');
      }
      toast.success('Demande de paiement envoyée!');
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la demande');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  if (notRegistered) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Devenez Créateur SEETU
            </h2>
            <p className="text-slate-600 max-w-md mb-6">
              Gagnez de l&apos;argent en partageant vos talents. Inscrivez-vous en tant que
              mannequin, photographe ou propriétaire de lieu et commencez à être rémunéré
              chaque fois qu&apos;un utilisateur utilise vos assets.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="p-4 bg-white rounded-xl border border-amber-100">
                <p className="text-2xl font-bold text-amber-600">50%</p>
                <p className="text-xs text-slate-500">Part des revenus</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-100">
                <p className="text-2xl font-bold text-amber-600">5000F</p>
                <p className="text-xs text-slate-500">Retrait minimum</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-100">
                <p className="text-2xl font-bold text-amber-600">Wave</p>
                <p className="text-xs text-slate-500">Paiement mobile</p>
              </div>
            </div>
            <Link href="/creator/register">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="h-5 w-5 mr-2" />
                S&apos;inscrire comme créateur
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    MODEL: 'Mannequin',
    PHOTOGRAPHER: 'Photographe',
    LOCATION_OWNER: 'Propriétaire de lieu',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {profile.displayName}
            </h1>
            {profile.isVerified && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {typeLabels[profile.type] || profile.type}
          </p>
        </div>
        <Link href="/creator/assets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel asset
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.totalAssets}
                </p>
                <p className="text-sm text-slate-500">Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.totalUsages}
                </p>
                <p className="text-sm text-slate-500">Utilisations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {earnings?.totalEarningsFcfa.toLocaleString() || 0} F
                </p>
                <p className="text-sm text-slate-500">Gains totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {earnings?.pendingFcfa.toLocaleString() || 0} F
                </p>
                <p className="text-sm text-slate-500">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Paiements
              </CardTitle>
              <CardDescription>
                Demandez un retrait de vos gains
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <div>
              <p className="text-sm text-slate-600">Solde disponible</p>
              <p className="text-3xl font-bold text-violet-600">
                {earnings?.pendingFcfa.toLocaleString() || 0} FCFA
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Minimum requis : {earnings?.minPayoutFcfa.toLocaleString() || 5000} FCFA
              </p>
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={!earnings?.canRequestPayout || isRequestingPayout}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isRequestingPayout ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Demander un paiement
            </Button>
          </div>

          {/* Recent Payouts */}
          {payouts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-slate-500" />
                <h4 className="font-medium text-slate-700">Historique récent</h4>
              </div>
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {payout.amountFcfa.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(payout.createdAt).toLocaleDateString('fr-FR')} • {payout.payoutMethod}
                      </p>
                    </div>
                    <Badge
                      className={
                        payout.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : payout.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {payout.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {payout.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {payout.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                      {payout.status === 'completed'
                        ? 'Payé'
                        : payout.status === 'pending'
                        ? 'En attente'
                        : 'Échoué'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes assets</CardTitle>
              <CardDescription>
                Gérez vos assets sur la marketplace
              </CardDescription>
            </div>
            <Link href="/creator/assets">
              <Button variant="outline" size="sm">
                Voir tout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Aucun asset
              </h3>
              <p className="text-slate-500 mb-4">
                Créez votre premier asset pour commencer à gagner
              </p>
              <Link href="/creator/assets/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un asset
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.slice(0, 5).map((asset) => {
                const status = statusConfig[asset.status] || statusConfig.DRAFT;
                const StatusIcon = status.icon;
                return (
                  <Link
                    key={asset.id}
                    href={`/creator/assets/${asset.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate">
                        {asset.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {asset.usageCount} utilisation{asset.usageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {asset.status === 'REJECTED' && asset.rejectionReason && (
                        <p className="text-sm text-red-500 mt-1 truncate">
                          {asset.rejectionReason}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
