'use client';

import { ChevronRight, Truck, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface OrderRecapProps {
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimatedDelivery?: string;
  paymentAmount: number;
  isDeposit?: boolean;
  onPay: () => void;
  isLoading?: boolean;
}

export function OrderRecap({ items, subtotal, deliveryFee, total, estimatedDelivery, paymentAmount, isDeposit, onPay, isLoading }: OrderRecapProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Récapitulatif ({items.length})</h3>
        <button className="text-sm text-emerald-600 hover:underline">Voir détails</button>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><span className="text-xl">📄</span></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-slate-500 truncate">{item.description}</p>
            </div>
            <span className="text-sm font-medium text-slate-900 shrink-0">{(item.price / 1000).toFixed(0)}k</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t space-y-2">
        <div className="flex justify-between text-sm"><span className="text-slate-600">Sous-total</span><span className="font-medium">{subtotal.toLocaleString('fr-FR')} FCFA</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-600">Livraison</span><span className="font-medium text-emerald-600">{deliveryFee === 0 ? 'Gratuite' : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}</span></div>
        <div className="flex justify-between text-base font-semibold pt-2 border-t"><span>Total</span><span>{total.toLocaleString('fr-FR')} FCFA</span></div>
      </div>

      {estimatedDelivery && (
        <div className="mx-4 mb-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
          <Truck className="h-5 w-5 text-slate-500" />
          <div><p className="text-xs text-slate-500">Livraison estimée :</p><p className="text-sm font-medium text-slate-900">{estimatedDelivery}</p></div>
        </div>
      )}

      <div className="p-4 border-t">
        <Button className="w-full bg-emerald-700 hover:bg-emerald-800 h-14 text-base" onClick={onPay} disabled={isLoading}>
          <div className="flex items-center justify-between w-full">
            <span>Payer {paymentAmount.toLocaleString('fr-FR')} FCFA</span>
            {isDeposit && <Badge className="bg-emerald-600 text-white text-xs">Acompte</Badge>}
            <ChevronRight className="h-5 w-5" />
          </div>
        </Button>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 text-xs text-slate-400"><Shield className="h-3 w-3" />Paiement sécurisé</div>
          <div className="flex items-center gap-1 text-xs text-slate-400"><CheckCircle className="h-3 w-3" />Satisfait ou refait</div>
        </div>
      </div>
    </div>
  );
}
