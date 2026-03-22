import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/print/products - List products
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Build query
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
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by category
    if (category) {
      const { data: cat } = await supabase
        .from('print_product_categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    // Search
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_fr.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query;

    if (error) {
      console.error('[PRODUCTS] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Transform to include category info
    const transformedProducts = (products || []).map((p) => ({
      ...p,
      category: p.print_product_categories,
      print_product_categories: undefined,
    }));

    return NextResponse.json({
      products: transformedProducts,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[PRODUCTS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
