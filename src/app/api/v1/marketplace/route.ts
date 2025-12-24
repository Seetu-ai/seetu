import { NextRequest, NextResponse } from 'next/server';
import { listMarketplaceAssets, MarketplaceFilters } from '@/lib/creators';
import { AssetType } from '@prisma/client';

/**
 * GET /api/v1/marketplace - List approved assets for marketplace
 *
 * Query params:
 * - type: 'MODEL_PROFILE' | 'PHOTO_STYLE' | 'LOCATION'
 * - gender: string (for models)
 * - ageRange: string (for models)
 * - styles: string (comma-separated, for models)
 * - city: string (for locations)
 * - tags: string (comma-separated)
 * - search: string
 * - limit: number (default: 20)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const typeParam = searchParams.get('type');
    const type = typeParam && ['MODEL_PROFILE', 'PHOTO_STYLE', 'LOCATION'].includes(typeParam)
      ? (typeParam as AssetType)
      : undefined;

    const filters: MarketplaceFilters = {
      type,
      modelGender: searchParams.get('gender') || undefined,
      modelAgeRange: searchParams.get('ageRange') || undefined,
      modelStyles: searchParams.get('styles')?.split(',').filter(Boolean) || undefined,
      locationCity: searchParams.get('city') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const assets = await listMarketplaceAssets(filters);

    return NextResponse.json({
      assets,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: assets.length === filters.limit,
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
