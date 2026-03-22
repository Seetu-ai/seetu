'use client';

import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderItemCard, OrderItem } from './order-item-card';
import { DesignOptions } from './design-options';

interface DesignOption {
  id: string;
  imageUrl: string;
  label: string;
}

interface OrderBuilderProps {
  items: OrderItem[];
  onItemDelete?: (id: string) => void;
  onItemModify?: (id: string) => void;
  onDesignSelect?: (itemId: string, designUrl: string) => void;
  onDesignGenerate?: (itemId: string, productName: string, brief: string) => Promise<DesignOption[]>;
  onDesignUpload?: (itemId: string) => void;
  onDesignBriefChange?: (itemId: string, brief: string) => void;
  onCheckout?: () => void;
  generatingDesigns?: Record<string, boolean>;
  designOptions?: Record<string, DesignOption[]>;
  isLoading?: boolean;
}

export function OrderBuilder({
  items,
  onItemDelete,
  onItemModify,
  onDesignSelect,
  onDesignGenerate,
  onDesignUpload,
  onDesignBriefChange,
  onCheckout,
  generatingDesigns = {},
  designOptions = {},
  isLoading = false,
}: OrderBuilderProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    items.find((i) => i.status === 'in_progress' || i.status === 'needs_design')?.id || null
  );
  const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const validatedCount = items.filter((i) => i.status === 'ready' || i.designUrl).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Ma Commande</h2>
            <Badge className="bg-emerald-100 text-emerald-700">{items.length} article{items.length > 1 ? 's' : ''}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">Ajoutez des produits via le chat</p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total estimé</p>
            <p className="text-3xl font-bold text-slate-900">
              {total.toLocaleString('fr-FR')} <span className="text-lg font-normal text-slate-500">FCFA</span>
            </p>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {items.map((item) => (
          <OrderItemCard
            key={item.id}
            item={item}
            isExpanded={expandedItemId === item.id}
            onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
            onDelete={() => onItemDelete?.(item.id)}
            onModify={() => onItemModify?.(item.id)}
          >
            {item.status === 'ready' && item.designUrl ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Design sélectionné</h4>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-emerald-500 ring-2 ring-emerald-200">
                    <img
                      src={(designOptions[item.id] || []).find(opt => opt.id === item.designUrl)?.imageUrl || item.designUrl}
                      alt="Design sélectionné"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-2">Design validé et prêt pour impression</p>
                    <button
                      className="text-sm text-emerald-600 hover:underline"
                      onClick={() => onDesignSelect?.(item.id, '')}
                    >
                      Changer de design
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <DesignOptions
                options={(designOptions[item.id] || []).map((opt) => ({
                  id: opt.id,
                  imageUrl: opt.imageUrl,
                  label: opt.label,
                }))}
                selectedId={item.designUrl}
                designBrief={item.designBrief}
                onSelect={(designUrl) => onDesignSelect?.(item.id, designUrl)}
                onGenerate={(brief) => onDesignGenerate?.(item.id, item.productName, brief)}
                onDesignBriefChange={(brief) => onDesignBriefChange?.(item.id, brief)}
                onUpload={() => onDesignUpload?.(item.id)}
                isGenerating={generatingDesigns[item.id] || false}
              />
            )}
          </OrderItemCard>
        ))}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="pt-4 mt-4 border-t">
          <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {validatedCount === items.length ? 'Prêt à commander' : 'Commande en cours'}
                </p>
                <p className="text-sm text-emerald-200">
                  {validatedCount} design{validatedCount > 1 ? 's' : ''} validé{validatedCount > 1 ? 's' : ''} sur {items.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {total > 0 && (
                <div className="text-right">
                  <p className="text-xs text-emerald-200 uppercase">Total à payer</p>
                  <p className="text-xl font-bold">{total.toLocaleString('fr-FR')} FCFA</p>
                </div>
              )}
              <Button
                className="bg-white text-emerald-700 hover:bg-emerald-50"
                onClick={onCheckout}
                disabled={items.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cr\u00e9ation...
                  </>
                ) : (
                  <>
                    Voir le devis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
