'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Billboard {
  id: string;
  name: string;
  address: string;
  pricing: {
    pricePerSlot: number;
    slotDurationMins: number;
  };
  queueLength: number;
  isAvailable: boolean;
}

interface BillboardSelectorProps {
  billboards: Billboard[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  maxSelection?: number;
  showPricing?: boolean;
}

export function BillboardSelector({
  billboards,
  selected,
  onSelectionChange,
  maxSelection,
  showPricing = true,
}: BillboardSelectorProps) {
  const [expanded, setExpanded] = useState(true);

  const toggleBillboard = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((b) => b !== id));
    } else if (!maxSelection || selected.length < maxSelection) {
      onSelectionChange([...selected, id]);
    }
  };

  const selectAll = () => {
    const available = billboards.filter((b) => b.isAvailable).map((b) => b.id);
    onSelectionChange(available);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const totalPrice = billboards
    .filter((b) => selected.includes(b.id))
    .reduce((sum, b) => sum + b.pricing.pricePerSlot, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sélectionnez vos panneaux</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Button variant="link" size="sm" className="h-auto p-0" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <span className="text-slate-300">|</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={clearAll}>
            Tout désélectionner
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {billboards
              .filter((b) => b.isAvailable)
              .map((billboard) => {
                const isSelected = selected.includes(billboard.id);
                return (
                  <div
                    key={billboard.id}
                    onClick={() => toggleBillboard(billboard.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{billboard.name}</h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {billboard.address}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-violet-600 border-violet-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {billboard.pricing.slotDurationMins} min
                      </span>
                      {showPricing && (
                        <span className="font-semibold text-violet-600">
                          {billboard.pricing.pricePerSlot.toLocaleString()} FCFA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Summary */}
          {selected.length > 0 && showPricing && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {selected.length} panneau{selected.length > 1 ? 'x' : ''} sélectionné
                {selected.length > 1 ? 's' : ''}
              </span>
              <span className="text-lg font-bold text-violet-600">
                {totalPrice.toLocaleString()} FCFA
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
