import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { listMarketplaceAssets } from '@/lib/creators';

/**
 * GET /api/v1/studio/backgrounds
 * Get all available backgrounds, optionally filtered by type
 * Includes both curated backgrounds AND approved marketplace locations
 */
export async function GET(req: NextRequest) {
  try {
    // Verify auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const where: any = { isActive: true };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    console.log('Querying backgrounds with where:', JSON.stringify(where));

    // Fetch curated backgrounds from Background table
    const curatedBackgrounds = await prisma.background.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    console.log('Found curated backgrounds:', curatedBackgrounds.length);

    // Also fetch approved LOCATION assets from marketplace if type is real_place or not specified
    let marketplaceLocations: any[] = [];
    if (!type || type === 'real_place') {
      const locationAssets = await listMarketplaceAssets({ type: 'LOCATION', limit: 50 });

      // Transform marketplace locations to match Background format
      marketplaceLocations = locationAssets.map(asset => ({
        id: `marketplace-${asset.id}`,
        slug: `marketplace-location-${asset.id}`,
        name: asset.title,
        nameFr: asset.title,
        type: 'real_place',
        category: asset.locationType || 'location',
        thumbnailUrl: asset.thumbnailUrl || '',
        location: asset.locationCity || asset.locationName || '',
        // Additional marketplace info
        isMarketplace: true,
        assetId: asset.id,
        creator: asset.creator,
        priceUnits: asset.priceUnits,
      }));

      console.log('Found marketplace locations:', marketplaceLocations.length);
    }

    // Combine curated and marketplace backgrounds
    const allBackgrounds = [...curatedBackgrounds, ...marketplaceLocations];

    // Group by type for easier frontend consumption
    const grouped = {
      real_place: [
        ...curatedBackgrounds.filter(b => b.type === 'real_place'),
        ...marketplaceLocations,
      ],
      studio: curatedBackgrounds.filter(b => b.type === 'studio'),
      lifestyle: curatedBackgrounds.filter(b => b.type === 'lifestyle'),
      custom: curatedBackgrounds.filter(b => b.type === 'custom'),
    };

    return NextResponse.json({ backgrounds: allBackgrounds, grouped });
  } catch (error: any) {
    console.error('Error fetching backgrounds:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({
      error: 'Failed to fetch backgrounds',
      details: error?.message || 'Unknown error',
      backgrounds: []
    }, { status: 500 });
  }
}
