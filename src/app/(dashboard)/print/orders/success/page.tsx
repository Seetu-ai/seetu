'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Truck, ArrowRight, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressStepper } from '@/components/print/checkout/progress-stepper';
import { ordersAPI, Order } from '@/lib/print/api-client';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const orderData = await ordersAPI.get(orderId);
        setOrder(orderData);
        setTimeout(() => setShowContent(true), 300);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Commande introuvable</h1>
        <p className="text-slate-500 mb-6">Nous n'avons pas pu trouver les d\u00e9tails de votre commande.</p>
        <Button asChild>
          <Link href="/print/orders">Voir mes commandes</Link>
        </Button>
      </div>
    );
  }

  // Calculate totals
  const total = order.items?.reduce((sum, item) => sum + (item.client_price || 0), 0) || order.total_amount || 0;
  const isSplitPayment = order.payment_type === 'split';
  const amountPaid = isSplitPayment ? Math.ceil(total / 2) : total;
  const amountRemaining = isSplitPayment ? total - amountPaid : 0;

  // Calculate estimated delivery (7 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className={`w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        <Check className="h-12 w-12 text-emerald-600" />
      </div>

      <h1 className={`text-3xl font-bold text-slate-900 mb-2 transition-all duration-500 delay-100 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        Commande confirm\u00e9e !
      </h1>

      <p className={`text-slate-500 mb-8 max-w-md transition-all duration-500 delay-200 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        Votre commande a \u00e9t\u00e9 enregistr\u00e9e avec succ\u00e8s. Nous vous contacterons bient\u00f4t pour la suite.
      </p>

      <div className={`bg-white rounded-2xl border border-slate-200 p-6 mb-8 w-full max-w-md transition-all duration-500 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <span className="text-sm text-slate-500">Num\u00e9ro de commande</span>
            <span className="font-mono font-semibold text-slate-900">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total commande</span>
            <span className="font-semibold text-slate-900">{total.toLocaleString('fr-FR')} FCFA</span>
          </div>
          {isSplitPayment && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Acompte (50%)</span>
                <span className="font-semibold text-emerald-600">{amountPaid.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Reste \u00e0 payer</span>
                <span className="font-semibold text-slate-900">{amountRemaining.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-slate-500">Livraison estim\u00e9e</span>
            <div className="flex items-center gap-2 text-slate-900">
              <Truck className="h-4 w-4" />
              <span className="font-medium">{formattedDeliveryDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mb-8 transition-all duration-500 delay-400 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <ProgressStepper currentStep={2} />
      </div>

      <div className={`flex items-center gap-3 transition-all duration-500 delay-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          T\u00e9l\u00e9charger le re\u00e7u
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" asChild>
          <Link href="/print/orders">
            Voir mes commandes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <p className={`mt-8 text-sm text-slate-400 transition-all duration-500 delay-600 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        Des questions ? Contactez-nous sur WhatsApp au +221 77 123 45 67
      </p>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
