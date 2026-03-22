import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/print/products/categories - List all product categories
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all categories with parent relationship
    const { data: categories, error } = await supabase
      .from('print_product_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[CATEGORIES] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Organize into tree structure (parent categories with children)
    const parentCategories = (categories || []).filter(c => !c.parent_id);
    const childCategories = (categories || []).filter(c => c.parent_id);

    const categoriesTree = parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parent_id === parent.id),
    }));

    return NextResponse.json({
      categories: categoriesTree,
      flat: categories || [],
    });
  } catch (error) {
    console.error('[CATEGORIES] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
