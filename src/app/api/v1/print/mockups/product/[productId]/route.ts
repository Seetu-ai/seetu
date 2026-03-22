import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface MockupZone {
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface ProductMockup {
  id: string;
  product_id: string;
  name: string;
  name_fr: string | null;
  mockup_url: string;
  print_area: string;
  is_default: boolean;
  zones: MockupZone[];
  sort_order: number;
}

/**
 * GET /api/v1/print/mockups/product/[productId] - Get mockups for a product
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await createClient();
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch mockups for the product
    const { data: mockups, error } = await supabase
      .from('print_product_mockups')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[MOCKUPS] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mockups' },
        { status: 500 }
      );
    }

    // Transform data to match expected interface
    const formattedMockups: ProductMockup[] = (mockups || []).map((m) => ({
      id: m.id,
      product_id: m.product_id,
      name: m.name,
      name_fr: m.name_fr,
      mockup_url: m.mockup_url,
      print_area: m.print_area,
      is_default: m.is_default,
      zones: m.zones || [],
      sort_order: m.sort_order,
    }));

    return NextResponse.json({
      mockups: formattedMockups,
      product_id: productId,
    });
  } catch (error) {
    console.error('[MOCKUPS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mockups' },
      { status: 500 }
    );
  }
}
