import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/print/quotes/requests - List user's quote requests
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Fetch order items that require quotes (extended catalog items)
    let query = supabase
      .from('print_order_items')
      .select('*, print_orders!inner(client_id, order_number, status)', { count: 'exact' })
      .eq('print_orders.client_id', user.id)
      .eq('requires_quote', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: quoteItems, error, count } = await query;

    if (error) {
      console.error('[QUOTES] List Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quote requests' },
        { status: 500 }
      );
    }

    // Transform to quote request format
    const quotes = (quoteItems || []).map(item => ({
      id: item.id,
      order_id: item.order_id,
      order_number: item.print_orders.order_number,
      product_name: item.product_name,
      quantity: item.quantity,
      specifications: item.specifications,
      status: item.status,
      quoted_price: item.client_price > 0 ? item.client_price : null,
      created_at: item.created_at,
    }));

    return NextResponse.json({
      quotes,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[QUOTES] List Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/print/quotes/requests - Create quote request
 * Body: { product_name, quantity, specifications, description }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { product_name, quantity, specifications, description, order_id } = body;

    if (!product_name || !quantity) {
      return NextResponse.json(
        { error: 'product_name and quantity are required' },
        { status: 400 }
      );
    }

    // If order_id is provided, verify ownership
    if (order_id) {
      const { data: order } = await supabase
        .from('print_orders')
        .select('id')
        .eq('id', order_id)
        .eq('client_id', user.id)
        .single();

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
    }

    // Create a new order if not provided
    let targetOrderId = order_id;
    if (!targetOrderId) {
      const { data: newOrder, error: orderError } = await supabase
        .from('print_orders')
        .insert({
          client_id: user.id,
          status: 'draft',
          entry_point: 'quote_request',
        })
        .select()
        .single();

      if (orderError || !newOrder) {
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }
      targetOrderId = newOrder.id;
    }

    // Get item count for the order
    const { count: itemCount } = await supabase
      .from('print_order_items')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', targetOrderId);

    // Create quote request as order item
    const { data: quoteItem, error: itemError } = await supabase
      .from('print_order_items')
      .insert({
        order_id: targetOrderId,
        item_number: (itemCount || 0) + 1,
        product_name,
        quantity,
        specifications: specifications || {},
        notes: description,
        requires_quote: true,
        status: 'pending_quote',
        design_status: 'not_started',
      })
      .select()
      .single();

    if (itemError) {
      console.error('[QUOTES] Create Error:', itemError);
      return NextResponse.json(
        { error: 'Failed to create quote request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quote: {
        id: quoteItem.id,
        order_id: targetOrderId,
        product_name: quoteItem.product_name,
        quantity: quoteItem.quantity,
        status: quoteItem.status,
      },
      message: 'Quote request created. Our team will respond within 24 hours.',
    });
  } catch (error) {
    console.error('[QUOTES] Create Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
