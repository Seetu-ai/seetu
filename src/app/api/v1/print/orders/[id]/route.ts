import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/print/orders/[id] - Fetch single order with items
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

    // Fetch order with items
    const { data: order, error } = await supabase
      .from('print_orders')
      .select('*, print_order_items(*)')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Transform to match Order interface (rename print_order_items to items)
    const { print_order_items, ...rest } = order;
    return NextResponse.json({
      ...rest,
      items: print_order_items || [],
    });
  } catch (error) {
    console.error('[ORDERS] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/print/orders/[id] - Update order details
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
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
      delivery_address,
      delivery_city,
      delivery_phone,
      delivery_notes,
    } = body;

    // Verify ownership
    const { data: existingOrder } = await supabase
      .from('print_orders')
      .select('id, status')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow updates on draft or confirmed orders
    if (!['draft', 'confirmed'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Cannot update order in current status' },
        { status: 400 }
      );
    }

    // Update order
    const { data: order, error } = await supabase
      .from('print_orders')
      .update({
        delivery_address,
        delivery_city,
        delivery_phone,
        delivery_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, print_order_items(*)')
      .single();

    if (error) {
      console.error('[ORDERS] PUT Error:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Transform to match Order interface
    const { print_order_items, ...rest } = order;
    return NextResponse.json({
      ...rest,
      items: print_order_items || [],
    });
  } catch (error) {
    console.error('[ORDERS] PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/print/orders/[id] - Cancel order
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and status
    const { data: existingOrder } = await supabase
      .from('print_orders')
      .select('id, status')
      .eq('id', id)
      .eq('client_id', user.id)
      .single();

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation on draft or confirmed orders
    if (!['draft', 'confirmed'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel order in current status' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { error } = await supabase
      .from('print_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[ORDERS] DELETE Error:', error);
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('[ORDERS] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
