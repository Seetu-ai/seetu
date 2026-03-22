import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Platform margin (20%)
const PLATFORM_MARGIN = 0.20;

/**
 * POST /api/v1/print/products/calculate-price - Calculate price for a product
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { product_id, quantity, specifications } = body;

    if (!product_id || !quantity) {
      return NextResponse.json(
        { error: 'product_id and quantity are required' },
        { status: 400 }
      );
    }

    // Get product
    const { data: product, error } = await supabase
      .from('print_products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check quantity limits
    if (quantity < product.min_quantity) {
      return NextResponse.json(
        { error: `Minimum quantity is ${product.min_quantity}` },
        { status: 400 }
      );
    }

    if (product.max_quantity && quantity > product.max_quantity) {
      return NextResponse.json(
        { error: `Maximum quantity is ${product.max_quantity}` },
        { status: 400 }
      );
    }

    // Check if this is a core or extended product
    const isCore = product.catalog_type === 'core';

    // For core products, we can calculate instantly
    // For extended products, we need a quote
    if (!isCore) {
      return NextResponse.json({
        product_id,
        product_name: product.name,
        quantity,
        specifications,
        provider_cost: null,
        client_price: null,
        production_days: product.production_days || 7,
        is_instant: false,
        requires_quote: true,
        message: 'Ce produit nécessite un devis personnalisé',
      });
    }

    // Calculate price for core products
    let basePrice = product.base_price || 0;

    // Apply quantity tiers if available
    const priceTiers = product.available_options?.price_tiers as Array<{
      min_qty: number;
      max_qty: number;
      unit_price: number;
    }> | undefined;

    if (priceTiers?.length) {
      for (const tier of priceTiers) {
        if (quantity >= tier.min_qty && quantity <= tier.max_qty) {
          basePrice = tier.unit_price;
          break;
        }
      }
    }

    // Calculate costs
    const providerCost = basePrice * quantity;
    const clientPrice = Math.ceil(providerCost * (1 + PLATFORM_MARGIN));

    return NextResponse.json({
      product_id,
      product_name: product.name,
      quantity,
      specifications,
      unit_price: Math.ceil(basePrice * (1 + PLATFORM_MARGIN)),
      provider_cost: providerCost,
      client_price: clientPrice,
      production_days: product.production_days || 5,
      is_instant: true,
      requires_quote: false,
    });
  } catch (error) {
    console.error('[PRICE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}
