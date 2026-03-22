'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Clock, Check, Truck, ChevronRight, Filter, Search, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ordersAPI, Order } from '@/lib/print/api-client';
import { cn } from '@/lib/utils';

type OrderStatus = 'draft' | 'confirmed' | 'paid' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: 'Brouillon', icon: Clock, className: 'bg-slate-100 text-slate-600' },
  confirmed: { label: 'Confirm\u00e9e', icon: Check, className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Pay\u00e9e', icon: Check, className: 'bg-emerald-100 text-emerald-700' },
  processing: { label: 'En production', icon: Package, className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Pr\u00eate', icon: Check, className: 'bg-purple-100 text-purple-700' },
  shipped: { label: 'Exp\u00e9di\u00e9e', icon: Truck, className: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Livr\u00e9e', icon: Truck, className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Annul\u00e9e', icon: XCircle, className: 'bg-red-100 text-red-600' },
};

export default function PrintOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersAPI.list({ status: statusFilter || undefined });
        setOrders(response.orders || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError('Impossible de charger les commandes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter]);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(query) ||
      order.items?.some((item) => item.product_name.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-slate-500">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <h2 className="text-xl font-semibold text-slate-900">{error}</h2>
          <Button onClick={() => window.location.reload()}>R\u00e9essayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/print"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mes Commandes</h1>
            <p className="text-sm text-slate-500">Suivez vos commandes et consultez l'historique</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" asChild><Link href="/print/builder">Nouvelle commande</Link></Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher par num\u00e9ro ou produit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            Toutes
          </Button>
          <Button
            variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('confirmed')}
          >
            En cours
          </Button>
          <Button
            variant={statusFilter === 'delivered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('delivered')}
          >
            Livr\u00e9es
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status as OrderStatus] || statusConfig.draft;
          const StatusIcon = status.icon;
          const total = order.items?.reduce((sum, item) => sum + (item.client_price || 0), 0) || order.total_amount || 0;

          return (
            <Link key={order.id} href={`/print/orders/${order.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-slate-900">{order.order_number}</span>
                      <Badge className={cn('gap-1', status.className)}><StatusIcon className="h-3 w-3" />{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {item.product_name} ({item.quantity})
                        </div>
                      ))}
                      {(order.items?.length || 0) > 3 && <span className="text-sm text-slate-400">+{(order.items?.length || 0) - 3} autres</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{total.toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-slate-500">FCFA</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">
              {orders.length === 0 ? 'Aucune commande pour le moment' : 'Aucune commande trouv\u00e9e'}
            </p>
            {orders.length === 0 && (
              <Button asChild>
                <Link href="/print/builder">Cr\u00e9er une commande</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
