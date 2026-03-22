'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ordersAPI, Order } from '@/lib/print/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Clock },
  confirmed: { label: 'Confirm\u00e9e', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  paid: { label: 'Pay\u00e9e', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  processing: { label: 'En production', color: 'bg-amber-100 text-amber-700', icon: Package },
  ready: { label: 'Pr\u00eate', color: 'bg-purple-100 text-purple-700', icon: Package },
  shipped: { label: 'Exp\u00e9di\u00e9e', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: 'Livr\u00e9e', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Annul\u00e9e', color: 'bg-red-100 text-red-700', icon: XCircle },
};

interface TimelineEvent {
  status: string;
  label: string;
  timestamp: string | null;
  completed: boolean;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const [orderData, trackData] = await Promise.all([
          ordersAPI.get(id),
          ordersAPI.track(id),
        ]);
        setOrder(orderData);
        setTimeline(trackData.timeline || []);
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Impossible de charger la commande');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;

    if (!confirm('\u00cates-vous s\u00fbr de vouloir annuler cette commande ?')) return;

    setIsCancelling(true);
    try {
      await ordersAPI.cancel(id);
      toast.success('Commande annul\u00e9e');
      router.push('/print/orders');
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast.error('\u00c9chec de l\'annulation');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
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
          <Button onClick={() => router.push('/print/orders')}>
            Retour aux commandes
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const canCancel = ['draft', 'confirmed'].includes(order.status);
  const total = order.items?.reduce((sum, item) => sum + (item.client_price || 0), 0) || order.total_amount || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/print/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Commande #{order.order_number}</h1>
            <p className="text-sm text-slate-500">
              Cr\u00e9\u00e9e le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <Badge className={cn('gap-1.5 px-3 py-1.5', statusConfig.color)}>
          <StatusIcon className="h-4 w-4" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Articles ({order.items?.length || 0})</h3>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{item.product_name}</h4>
                      <p className="text-sm text-slate-500">{item.quantity} exemplaires</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{(item.client_price || 0).toLocaleString('fr-FR')} FCFA</p>
                    <Badge variant="outline" className="text-xs">
                      {item.design_status === 'ready' ? 'Design pr\u00eat' : 'En attente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-2xl font-bold text-slate-900">{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* Delivery Info */}
          {order.delivery_address && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Livraison</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-slate-900">{order.delivery_address}</p>
                    <p className="text-sm text-slate-500">{order.delivery_city || 'Dakar'}</p>
                  </div>
                </div>
                {order.delivery_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <p className="text-slate-900">{order.delivery_phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {canCancel && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Annuler la commande
              </Button>
            </div>
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-4">Suivi de commande</h3>
            <div className="space-y-4">
              {timeline.map((event, index) => {
                const isLast = index === timeline.length - 1;
                const eventStatus = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft;
                const EventIcon = eventStatus.icon;

                return (
                  <div key={event.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          event.completed ? 'bg-emerald-100' : 'bg-slate-100'
                        )}
                      >
                        <EventIcon
                          className={cn(
                            'h-4 w-4',
                            event.completed ? 'text-emerald-600' : 'text-slate-400'
                          )}
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            'w-0.5 h-8 mt-1',
                            event.completed ? 'bg-emerald-200' : 'bg-slate-200'
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p
                        className={cn(
                          'font-medium',
                          event.completed ? 'text-slate-900' : 'text-slate-400'
                        )}
                      >
                        {event.label}
                      </p>
                      {event.timestamp && event.completed && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
