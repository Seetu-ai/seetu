'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Image,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  targetCount: number;
  generatedCount: number;
  createdAt: string;
  brand?: { id: string; name: string };
  template?: { id: string; name: string; nameFr: string };
  images: { id: string; outputUrl: string }[];
}

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    className: 'bg-slate-100 text-slate-600',
  },
  active: {
    label: 'En cours',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-600',
  },
  completed: {
    label: 'Terminée',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-600',
  },
  archived: {
    label: 'Archivée',
    icon: XCircle,
    className: 'bg-slate-100 text-slate-400',
  },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/v1/campaigns');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campagnes</h1>
          <p className="text-slate-500 mt-1">
            Créez des ensembles d&apos;images cohérentes pour vos campagnes marketing
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
            <Image className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucune campagne
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Créez votre première campagne pour générer des ensembles d&apos;images
            avec un style cohérent pour vos réseaux sociaux.
          </p>
          <Link href="/campaigns/new">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Créer ma première campagne
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const statusConfig = STATUS_CONFIG[campaign.status];
            const StatusIcon = statusConfig.icon;
            const progress = Math.round(
              (campaign.generatedCount / campaign.targetCount) * 100
            );

            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block"
              >
                <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail grid */}
                    <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {campaign.images.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 h-full">
                          {campaign.images.slice(0, 4).map((img, i) => (
                            <div key={img.id} className="overflow-hidden">
                              <img
                                src={img.outputUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {[...Array(Math.max(0, 4 - campaign.images.length))].map(
                            (_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="bg-slate-50"
                              />
                            )
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {campaign.template && (
                              <span className="text-xs text-slate-500">
                                {campaign.template.nameFr || campaign.template.name}
                              </span>
                            )}
                            {campaign.brand && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-xs text-slate-500">
                                  {campaign.brand.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-600 transition-colors" />
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">
                            {campaign.generatedCount} / {campaign.targetCount} images
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                              statusConfig.className
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                'h-3 w-3',
                                campaign.status === 'active' && 'animate-spin'
                              )}
                            />
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
