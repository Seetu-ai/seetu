import { NextRequest, NextResponse } from 'next/server';
import { listMarketplaceModels, MarketplaceFilters } from '@/lib/creators';

/**
 * GET /api/v1/marketplace/models - List approved models for marketplace
 *
 * Query params:
 * - gender: string (e.g., 'female', 'male')
 * - ageRange: string (e.g., '18-25', '25-35')
 * - styles: string (comma-separated, e.g., 'casual,professional')
 * - search: string
 * - limit: number (default: 20)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters: MarketplaceFilters = {
      modelGender: searchParams.get('gender') || undefined,
      modelAgeRange: searchParams.get('ageRange') || undefined,
      modelStyles: searchParams.get('styles')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const models = await listMarketplaceModels(filters);

    return NextResponse.json({
      models,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: models.length === filters.limit,
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
