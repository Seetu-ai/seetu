import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════
// GET - List campaign templates
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const occasion = searchParams.get('occasion');
    const includePremium = searchParams.get('premium') === 'true';

    const where: Record<string, unknown> = {};

    if (occasion) {
      where.occasion = occasion;
    }

    if (!includePremium) {
      where.isPremium = false;
    }

    const templates = await prisma.campaignTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        slug: true,
        name: true,
        nameFr: true,
        thumbnailUrl: true,
        occasion: true,
        isPremium: true,
        usageCount: true,
        styleLock: true,
      },
    });

    // Group by occasion for easier UI rendering
    const byOccasion: Record<string, typeof templates> = {
      seasonal: [],
      style: [],
      ecommerce: [],
    };

    for (const template of templates) {
      if (template.occasion) {
        byOccasion.seasonal.push(template);
      } else if (template.slug.includes('marketplace') || template.slug.includes('instagram')) {
        byOccasion.ecommerce.push(template);
      } else {
        byOccasion.style.push(template);
      }
    }

    return NextResponse.json({
      templates,
      byCategory: byOccasion,
      total: templates.length,
    });
  } catch (error) {
    console.error('[TEMPLATES] Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
