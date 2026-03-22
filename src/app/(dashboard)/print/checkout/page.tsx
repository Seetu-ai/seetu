'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Info, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ProgressStepper } from '@/components/print/checkout/progress-stepper';
import { PaymentMethods, PaymentMethod } from '@/components/print/checkout/payment-methods';
import { OrderRecap } from '@/components/print/checkout/order-recap';
import { ChatPanel } from '@/components/print/chat/chat-panel';
import { ordersAPI, Order } from '@/lib/print/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PaymentType = 'full' | 'split';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentType, setPaymentType] = useState<PaymentType>('split');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Dakar');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Form validation
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Aucune commande sp\u00e9cifi\u00e9e');
      setIsLoadingOrder(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const orderData = await ordersAPI.get(orderId);
        setOrder(orderData);
        // Pre-fill delivery info if exists
        if (orderData.delivery_address) setDeliveryAddress(orderData.delivery_address);
        if (orderData.delivery_city) setDeliveryCity(orderData.delivery_city);
        if (orderData.delivery_phone) setPhoneNumber(orderData.delivery_phone.replace('+221', ''));
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Impossible de charger la commande');
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate phone for mobile money
    if (paymentMethod === 'wave' || paymentMethod === 'orange_money') {
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      if (!/^(77|78|76|70|75)\d{7}$/.test(cleanPhone)) {
        setPhoneError('Num\u00e9ro invalide. Format: 77 XXX XX XX');
        isValid = false;
      } else {
        setPhoneError(null);
      }
    }

    // Validate delivery address
    if (deliveryAddress.length < 10) {
      setAddressError('Adresse trop courte (min 10 caract\u00e8res)');
      isValid = false;
    } else {
      setAddressError(null);
    }

    return isValid;
  };

  const handleConfirm = async () => {
    if (!orderId || !order) return;

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setIsConfirming(true);
    try {
      await ordersAPI.confirm(orderId, {
        payment_type: paymentType,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_phone: `+221${phoneNumber.replace(/\s/g, '')}`,
      });

      toast.success('Commande confirm\u00e9e avec succ\u00e8s!');
      router.push(`/print/orders/success?orderId=${orderId}`);
    } catch (err) {
      console.error('Failed to confirm order:', err);
      toast.error('\u00c9chec de la confirmation. R\u00e9essayez.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Calculate totals from order items
  const orderItems = order?.items?.map(item => ({
    id: item.id,
    name: item.product_name,
    description: `${item.quantity} ex`,
    price: item.client_price || 0,
  })) || [];

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const total = subtotal;
  const depositAmount = Math.ceil(total / 2);

  const messages = order ? [
    {
      id: '1',
      role: 'assistant' as const,
      content: `Votre commande de ${orderItems.length} article${orderItems.length > 1 ? 's' : ''} est pr\u00eate !\nTotal: ${total.toLocaleString('fr-FR')} FCFA`,
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: `Compl\u00e9tez vos informations de livraison et choisissez votre mode de paiement.`,
      timestamp: new Date().toISOString(),
    },
  ] : [];

  if (isLoadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-slate-500">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <h2 className="text-xl font-semibold text-slate-900">{error || 'Commande introuvable'}</h2>
          <p className="text-slate-500">Veuillez retourner au constructeur de devis.</p>
          <Button onClick={() => router.push('/print/builder')}>
            Retour au constructeur
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-6 -mt-6">
      <ChatPanel messages={messages} onSendMessage={() => {}} isLoading={false} className="w-[320px] shrink-0" />
      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8"><ProgressStepper currentStep={1} /></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Finaliser la commande</h1>
                  <p className="text-sm text-slate-500">Commande #{order.order_number}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><Lock className="h-4 w-4" />Paiement s\u00e9curis\u00e9</div>
              </div>

              {/* Delivery Address Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900">Adresse de livraison</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Adresse compl\u00e8te *</label>
                    <Textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Num\u00e9ro, rue, quartier..."
                      className={cn('mt-1', addressError && 'border-red-500')}
                    />
                    {addressError && <p className="text-xs text-red-500 mt-1">{addressError}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Ville</label>
                      <Input
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        placeholder="Dakar"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Instructions (optionnel)</label>
                      <Input
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="Code porte, \u00e9tage..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Mode de paiement</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={cn(
                      'relative p-5 rounded-xl border-2 text-left transition-all',
                      paymentType === 'full' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                    onClick={() => setPaymentType('full')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5', paymentType === 'full' ? 'border-emerald-500' : 'border-slate-300')}>
                        {paymentType === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Paiement int\u00e9gral</h3>
                        <p className="text-sm text-slate-500 mt-1">R\u00e9glez la totalit\u00e9 maintenant.</p>
                        <p className="text-2xl font-bold text-slate-900 mt-3">{total.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                  </button>

                  <button
                    className={cn(
                      'relative p-5 rounded-xl border-2 text-left transition-all',
                      paymentType === 'split' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                    onClick={() => setPaymentType('split')}
                  >
                    <Badge className="absolute top-3 right-3 bg-emerald-100 text-emerald-700">FLEXIBLE</Badge>
                    <div className="flex items-start gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5', paymentType === 'split' ? 'border-emerald-500' : 'border-slate-300')}>
                        {paymentType === 'split' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Paiement en 2 fois</h3>
                        <p className="text-sm text-slate-500 mt-1">50% maintenant, 50% avant livraison.</p>
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-slate-600">Aujourd'hui</span><span className="font-semibold">{depositAmount.toLocaleString('fr-FR')} FCFA</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-600">Avant livraison</span><span className="font-semibold">{(total - depositAmount).toLocaleString('fr-FR')} FCFA</span></div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <PaymentMethods selected={paymentMethod} onSelect={setPaymentMethod} />
                {(paymentMethod === 'wave' || paymentMethod === 'orange_money') && (
                  <div className="mt-6 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Num\u00e9ro {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} *</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm"><span>🇸🇳</span><span>+221</span></div>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="77 123 45 67"
                        className={cn('flex-1', phoneError && 'border-red-500')}
                      />
                    </div>
                    {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Info className="h-3 w-3" />Vous recevrez une demande de paiement sur ce num\u00e9ro</p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1">
              <OrderRecap
                items={orderItems}
                subtotal={subtotal}
                deliveryFee={0}
                total={total}
                estimatedDelivery={(() => {
                  const date = new Date();
                  date.setDate(date.getDate() + 7);
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                })()}
                paymentAmount={paymentType === 'split' ? depositAmount : total}
                isDeposit={paymentType === 'split'}
                onPay={handleConfirm}
                isLoading={isConfirming}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
