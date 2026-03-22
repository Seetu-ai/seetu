import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/print/design/brief - Create design brief for order item
 * Body: { order_item_id, brief, reference_images? }
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
    const { order_item_id, brief, reference_images } = body;

    if (!order_item_id || !brief) {
      return NextResponse.json(
        { error: 'order_item_id and brief are required' },
        { status: 400 }
      );
    }

    // Verify the order item belongs to the user
    const { data: orderItem, error: itemError } = await supabase
      .from('print_order_items')
      .select('*, print_orders!inner(client_id)')
      .eq('id', order_item_id)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    if (orderItem.print_orders.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update order item with design brief
    const { data: updatedItem, error: updateError } = await supabase
      .from('print_order_items')
      .update({
        design_brief: brief,
        reference_images: reference_images || [],
        design_status: 'pending_generation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_item_id)
      .select()
      .single();

    if (updateError) {
      console.error('[DESIGN BRIEF] Update Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save design brief' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: updatedItem,
      message: 'Design brief saved successfully',
    });
  } catch (error) {
    console.error('[DESIGN BRIEF] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
