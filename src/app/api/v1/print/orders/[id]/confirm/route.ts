import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/print/orders/[id]/confirm - Confirm order
 * Body: { payment_type: 'full' | 'split', delivery_address?, delivery_phone? }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      payment_type,
      delivery_address,
      delivery_city,
      delivery_phone,
    } = body;

    // Validate payment_type
    if (!payment_type || !['full', 'split'].includes(payment_type)) {
      return NextResponse.json(
        { error: 'Invalid payment_type. Must be "full" or "split"' },
        { status: 400 }
      );
    }

    // Verify ownership and current status
    const { data: existingOrder } = await supabase
      .from('print_orders')
      .select('*, print_order_items(*)')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow confirmation on draft orders
    if (existingOrder.status !== 'draft') {
      return NextResponse.json(
        { error: 'Order already confirmed or in invalid status' },
        { status: 400 }
      );
    }

    // Validate order has items
    if (!existingOrder.print_order_items || existingOrder.print_order_items.length === 0) {
      return NextResponse.json(
        { error: 'Cannot confirm order without items' },
        { status: 400 }
      );
    }

    // Calculate total from items
    const total = existingOrder.print_order_items.reduce(
      (sum: number, item: { client_price: number }) => sum + (item.client_price || 0),
      0
    );

    // Calculate amounts based on payment type
    const first_payment_amount = payment_type === 'split' ? Math.ceil(total / 2) : total;
    const remaining_amount = payment_type === 'split' ? total - first_payment_amount : 0;

    // Update order to confirmed
    const updateData: Record<string, unknown> = {
      status: 'confirmed',
      payment_type,
      total_amount: total,
      updated_at: new Date().toISOString(),
    };

    // Update delivery info if provided
    if (delivery_address) updateData.delivery_address = delivery_address;
    if (delivery_city) updateData.delivery_city = delivery_city;
    if (delivery_phone) updateData.delivery_phone = delivery_phone;

    const { data: order, error } = await supabase
      .from('print_orders')
      .update(updateData)
      .eq('id', id)
      .select('*, print_order_items(*)')
      .single();

    if (error) {
      console.error('[ORDERS] Confirm Error:', error);
      return NextResponse.json(
        { error: 'Failed to confirm order' },
        { status: 500 }
      );
    }

    // Transform to match Order interface
    const { print_order_items, ...rest } = order;
    const transformedOrder = {
      ...rest,
      items: print_order_items || [],
    };

    return NextResponse.json({
      order: transformedOrder,
      payment_type,
      total_amount: total,
      first_payment_amount,
      remaining_amount,
      message: 'Order confirmed successfully',
    });
  } catch (error) {
    console.error('[ORDERS] Confirm Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
