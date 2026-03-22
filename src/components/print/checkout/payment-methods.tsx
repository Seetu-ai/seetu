'use client';

import { Check, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'orange_money' | 'wave' | 'card';

interface PaymentMethodsProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethods({ selected, onSelect }: PaymentMethodsProps) {
  const methods = [
    { id: 'orange_money' as const, name: 'Orange Money', icon: <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">OM</div> },
    { id: 'wave' as const, name: 'Wave Mobile', icon: <div className="w-12 h-12 rounded-lg bg-[#1DC7EA] flex items-center justify-center text-white font-bold text-sm">Wave</div> },
    { id: 'card' as const, name: 'Carte Bancaire', icon: <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-white"><CreditCard className="h-6 w-6" /></div> },
  ];

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-slate-700"><CreditCard className="h-4 w-4" />Méthode de paiement</h3>
      <div className="grid grid-cols-3 gap-3">
        {methods.map((method) => (
          <button key={method.id} className={cn('relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all', selected === method.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300')} onClick={() => onSelect(method.id)}>
            {selected === method.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
            {method.icon}
            <span className="text-xs font-medium text-slate-700">{method.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
