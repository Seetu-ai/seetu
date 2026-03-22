'use client';

import { ChevronDown, ChevronUp, Trash2, Check, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  specifications: string;
  specificationsObject?: Record<string, unknown>;
  price: number;
  status: 'ready' | 'in_progress' | 'needs_design';
  designUrl?: string;
  designBrief?: string; // User's design request from conversation
}

interface OrderItemCardProps {
  item: OrderItem;
  isExpanded?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onModify?: () => void;
  children?: React.ReactNode;
}

const statusConfig = {
  ready: { label: 'Fichier prêt', icon: Check, className: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'EN COURS', icon: Clock, className: 'bg-amber-100 text-amber-700' },
  needs_design: { label: 'Design à faire', icon: AlertTriangle, className: 'bg-red-100 text-red-600' },
};

const productIcons: Record<string, string> = {
  'cartes de visite': '🪪', 'flyers': '📄', 't-shirts': '👕', 'roll-ups': '🎞️', 'casquettes': '🧢', 'default': '📦',
};

function getProductIcon(productName: string): string {
  const name = productName.toLowerCase();
  for (const [key, icon] of Object.entries(productIcons)) {
    if (name.includes(key)) return icon;
  }
  return productIcons.default;
}

export function OrderItemCard({ item, isExpanded, onToggle, onDelete, onModify, children }: OrderItemCardProps) {
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  return (
    <div className={cn('border rounded-xl overflow-hidden transition-all', isExpanded ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white')}>
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
            {getProductIcon(item.productName)}
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{item.productName}</h4>
            <p className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />{item.quantity} ex</span>
              <span className="mx-1.5">•</span>{item.specifications}
              {onModify && (<><span className="mx-1.5">•</span><button className="text-emerald-600 hover:underline" onClick={(e) => { e.stopPropagation(); onModify(); }}>Modifier</button></>)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn('gap-1', status.className)}><StatusIcon className="h-3 w-3" />{status.label}</Badge>
          <span className="font-semibold text-slate-900">{(item.price || 0).toLocaleString('fr-FR')} FCFA</span>
          <div className="flex items-center gap-1">
            {onDelete && (<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="h-4 w-4" /></Button>)}
            {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </div>
        </div>
      </div>
      {isExpanded && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
