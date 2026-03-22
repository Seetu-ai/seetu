'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  CheckCircle,
  PlayCircle,
  Loader2,
  AlertCircle,
  Monitor,
} from 'lucide-react';

interface QueueItem {
  id: string;
  billboardId: string;
  billboardName: string;
  position: number;
  status: 'queued' | 'playing' | 'completed' | 'skipped';
  scheduledFor?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  proofUrl?: string | null;
}

interface QueueStatusProps {
  items: QueueItem[];
  showProofs?: boolean;
  compact?: boolean;
}

const statusConfig = {
  queued: {
    label: 'En file',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  playing: {
    label: 'En cours',
    color: 'bg-green-100 text-green-700',
    icon: PlayCircle,
  },
  completed: {
    label: 'Diffusé',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle,
  },
  skipped: {
    label: 'Ignoré',
    color: 'bg-slate-100 text-slate-600',
    icon: AlertCircle,
  },
};

export function QueueStatus({ items, showProofs = false, compact = false }: QueueStatusProps) {
  if (items.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {items.map((item) => {
          const config = statusConfig[item.status];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600 flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                {item.billboardName}
              </span>
              <Badge className={config.color}>
                {item.status === 'queued' ? `#${item.position}` : config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Statut de diffusion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.status === 'playing'
                      ? 'bg-green-100'
                      : item.status === 'completed'
                      ? 'bg-emerald-100'
                      : 'bg-slate-100'
                  }`}
                >
                  {item.status === 'playing' ? (
                    <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                  ) : (
                    <StatusIcon
                      className={`h-4 w-4 ${
                        item.status === 'completed'
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <p className="font-medium">{item.billboardName}</p>
                  {item.status === 'queued' && (
                    <p className="text-sm text-slate-500">
                      Position #{item.position} dans la file
                    </p>
                  )}
                  {item.status === 'playing' && (
                    <p className="text-sm text-green-600">En cours de diffusion</p>
                  )}
                  {item.status === 'completed' && item.endedAt && (
                    <p className="text-sm text-slate-500">
                      Diffusé le{' '}
                      {new Date(item.endedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {item.scheduledFor && item.status === 'queued' && (
                    <p className="text-xs text-violet-600">
                      Prévu pour{' '}
                      {new Date(item.scheduledFor).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={config.color}>
                {item.status === 'queued' ? `#${item.position}` : config.label}
              </Badge>
            </div>
          );
        })}

        {/* Proofs section */}
        {showProofs && items.some((item) => item.proofUrl) && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Preuves de diffusion</h4>
            <div className="grid grid-cols-2 gap-3">
              {items
                .filter((item) => item.proofUrl)
                .map((item) => (
                  <div key={item.id} className="space-y-1">
                    <p className="text-sm text-slate-600">{item.billboardName}</p>
                    <img
                      src={item.proofUrl!}
                      alt={`Preuve - ${item.billboardName}`}
                      className="w-full rounded-lg border"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
