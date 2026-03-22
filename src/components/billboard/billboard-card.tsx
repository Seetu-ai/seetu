'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Monitor, Users } from 'lucide-react';

interface BillboardCardProps {
  billboard: {
    id: string;
    name: string;
    address: string;
    resolution: { width: number; height: number };
    pricing: {
      pricePerSlot: number;
      slotDurationMins: number;
    };
    status: string;
    previewImageUrl: string | null;
    queueLength: number;
    isAvailable: boolean;
  };
  selected?: boolean;
  onSelect?: (id: string) => void;
  showActions?: boolean;
}

export function BillboardCard({
  billboard,
  selected = false,
  onSelect,
  showActions = false,
}: BillboardCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all cursor-pointer ${
        !billboard.isAvailable ? 'opacity-60' : 'hover:shadow-lg'
      } ${selected ? 'ring-2 ring-violet-500' : ''}`}
      onClick={() => onSelect?.(billboard.id)}
    >
      {/* Preview */}
      <div className="relative aspect-video bg-slate-100">
        {billboard.previewImageUrl ? (
          <img
            src={billboard.previewImageUrl}
            alt={billboard.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Monitor className="h-12 w-12 text-slate-300" />
          </div>
        )}
        {!billboard.isAvailable && (
          <Badge className="absolute top-2 left-2 bg-amber-500">
            Maintenance
          </Badge>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{billboard.name}</h3>
        <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
          <MapPin className="h-3 w-3" />
          {billboard.address}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">
            {billboard.resolution.width}x{billboard.resolution.height}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {billboard.pricing.slotDurationMins} min
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {billboard.queueLength} en file
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <p className="text-lg font-bold text-violet-600">
              {billboard.pricing.pricePerSlot.toLocaleString()} FCFA
            </p>
            <p className="text-xs text-slate-500">par diffusion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
