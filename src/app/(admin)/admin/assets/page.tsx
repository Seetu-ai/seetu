'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  Camera,
  MapPin,
  ArrowRight,
} from 'lucide-react';

interface Asset {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceUnits: number;
  modelGender: string | null;
  modelAgeRange: string | null;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
    type: string;
  };
}

const statusTabs = [
  { id: 'PENDING_REVIEW', label: 'En attente', icon: Clock },
  { id: 'APPROVED', label: 'Approuvés', icon: CheckCircle },
  { id: 'REJECTED', label: 'Rejetés', icon: XCircle },
  { id: 'SUSPENDED', label: 'Suspendus', icon: AlertCircle },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  MODEL_PROFILE: User,
  PHOTO_STYLE: Camera,
  LOCATION: MapPin,
};

const typeLabels: Record<string, string> = {
  MODEL_PROFILE: 'Mannequin',
  PHOTO_STYLE: 'Style photo',
  LOCATION: 'Lieu',
};

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('PENDING_REVIEW');

  useEffect(() => {
    async function fetchAssets() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/admin/assets?status=${activeTab}`);
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
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Creator Assets
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gérez les assets soumis par les créateurs
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
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Aucun asset
            </h3>
            <p className="text-slate-500">
              {activeTab === 'PENDING_REVIEW'
                ? 'Aucun asset en attente de review'
                : `Aucun asset avec le statut "${statusTabs.find(t => t.id === activeTab)?.label}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => {
            const TypeIcon = typeIcons[asset.type] || User;
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow">
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {asset.title}
                        </h3>
                        <Badge variant="outline" className="flex-shrink-0">
                          {typeLabels[asset.type] || asset.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 truncate mb-2">
                        Par {asset.creator.displayName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {asset.modelGender && (
                          <span>{asset.modelGender}</span>
                        )}
                        {asset.modelAgeRange && (
                          <span>{asset.modelAgeRange} ans</span>
                        )}
                        <span>{asset.priceUnits / 100} crédits</span>
                        <span>
                          {new Date(asset.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Link href={`/admin/assets/${asset.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
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
