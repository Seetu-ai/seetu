import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/studio/backgrounds
 * Get all available backgrounds, optionally filtered by type
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

    const backgrounds = await prisma.background.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    console.log('Found backgrounds:', backgrounds.length);

    // Group by type for easier frontend consumption
    const grouped = {
      real_place: backgrounds.filter(b => b.type === 'real_place'),
      studio: backgrounds.filter(b => b.type === 'studio'),
      lifestyle: backgrounds.filter(b => b.type === 'lifestyle'),
      custom: backgrounds.filter(b => b.type === 'custom'),
    };

    return NextResponse.json({ backgrounds, grouped });
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
