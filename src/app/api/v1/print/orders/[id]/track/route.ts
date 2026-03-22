import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TimelineEvent {
  status: string;
  label: string;
  timestamp: string | null;
  completed: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Commande cr\u00e9\u00e9e',
  confirmed: 'Commande confirm\u00e9e',
  pending_payment: 'En attente de paiement',
  paid: 'Paiement re\u00e7u',
  processing: 'En production',
  ready: 'Pr\u00eate pour livraison',
  shipped: 'Exp\u00e9di\u00e9e',
  delivered: 'Livr\u00e9e',
  cancelled: 'Annul\u00e9e',
};

const STATUS_ORDER = [
  'draft',
  'confirmed',
  'paid',
  'processing',
  'ready',
  'shipped',
  'delivered',
];

/**
 * GET /api/v1/print/orders/[id]/track - Get order timeline
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch order
    const { data: order, error } = await supabase
      .from('print_orders')
      .select('id, status, created_at, updated_at, order_number')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle cancelled orders
    if (order.status === 'cancelled') {
      return NextResponse.json({
        order_id: order.id,
        order_number: order.order_number,
        current_status: order.status,
        current_status_label: STATUS_LABELS[order.status],
        timeline: [
          {
            status: 'draft',
            label: STATUS_LABELS['draft'],
            timestamp: order.created_at,
            completed: true,
          },
          {
            status: 'cancelled',
            label: STATUS_LABELS['cancelled'],
            timestamp: order.updated_at,
            completed: true,
          },
        ],
      });
    }

    // Build timeline based on current status
    const currentStatusIndex = STATUS_ORDER.indexOf(order.status);
    const timeline: TimelineEvent[] = STATUS_ORDER.map((status, index) => ({
      status,
      label: STATUS_LABELS[status],
      timestamp: index === 0 ? order.created_at :
                index <= currentStatusIndex ? order.updated_at : null,
      completed: index <= currentStatusIndex,
    }));

    // Estimate delivery date (7 business days from confirmation)
    let estimated_delivery: string | null = null;
    if (currentStatusIndex >= STATUS_ORDER.indexOf('confirmed')) {
      const confirmDate = new Date(order.updated_at);
      confirmDate.setDate(confirmDate.getDate() + 7);
      estimated_delivery = confirmDate.toISOString();
    }

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      current_status: order.status,
      current_status_label: STATUS_LABELS[order.status],
      timeline,
      estimated_delivery,
    });
  } catch (error) {
    console.error('[ORDERS] Track Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
