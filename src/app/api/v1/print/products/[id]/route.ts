import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/print/products/[id] - Get product by ID or slug
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Try to get by ID first, then by slug
    let query = supabase
      .from('print_products')
      .select(`
        *,
        print_product_categories (
          id,
          name,
          slug,
          icon
        )
      `)
      .eq('is_active', true);

    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: product, error } = await query.single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...product,
      category: product.print_product_categories,
      print_product_categories: undefined,
    });
  } catch (error) {
    console.error('[PRODUCTS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
