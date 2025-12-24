'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Package,
  User,
  Camera,
  MapPin,
} from 'lucide-react';

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

const statusTabs = [
  { id: 'all', label: 'Tous' },
  { id: 'DRAFT', label: 'Brouillons', icon: Clock },
  { id: 'PENDING_REVIEW', label: 'En attente', icon: Clock },
  { id: 'APPROVED', label: 'Approuvés', icon: CheckCircle },
  { id: 'REJECTED', label: 'Rejetés', icon: XCircle },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Clock },
  PENDING_REVIEW: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  MODEL_PROFILE: User,
  PHOTO_STYLE: Camera,
  LOCATION: MapPin,
};

export default function CreatorAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchAssets() {
      setIsLoading(true);
      setError(null);
      try {
        const url = activeTab === 'all'
          ? '/api/v1/assets'
          : `/api/v1/assets?status=${activeTab}`;
        const response = await fetch(url);
        if (response.status === 404) {
          // Not a creator yet
          router.push('/creator/register');
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        setAssets(data.assets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssets();
  }, [activeTab, router]);

  const filteredAssets = activeTab === 'all'
    ? assets
    : assets.filter(a => a.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/creator')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Mes assets
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Gérez tous vos assets
            </p>
          </div>
        </div>
        <Link href="/creator/assets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel asset
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4 overflow-x-auto">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id === 'all'
            ? assets.length
            : assets.filter(a => a.status === tab.id).length;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? '' : 'text-slate-600'}
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {tab.label}
              <Badge variant="secondary" className="ml-2 text-xs">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Aucun asset
            </h3>
            <p className="text-slate-500 mb-4">
              {activeTab === 'all'
                ? 'Créez votre premier asset pour commencer'
                : `Aucun asset avec le statut "${statusTabs.find(t => t.id === activeTab)?.label}"`}
            </p>
            {activeTab === 'all' && (
              <Link href="/creator/assets/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un asset
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => {
            const status = statusConfig[asset.status] || statusConfig.DRAFT;
            const StatusIcon = status.icon;
            const TypeIcon = typeIcons[asset.type] || Package;
            return (
              <Link
                key={asset.id}
                href={`/creator/assets/${asset.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <TypeIcon className="h-8 w-8 text-slate-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {asset.title}
                        </h3>
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

                      {/* Arrow */}
                      <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
