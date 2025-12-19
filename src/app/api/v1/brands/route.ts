import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const createBrandSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  instagramHandle: z.string().optional(),
  visualDNA: z.record(z.string(), z.any()).optional(),
  verbalDNA: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/v1/brands - List all brands for current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brands = await prisma.brand.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/brands - Create a new brand
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createBrandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, instagramHandle, visualDNA, verbalDNA } = validation.data;

    // Check if this is the first brand - make it default
    const existingBrandsCount = await prisma.brand.count({
      where: { userId: user.id },
    });

    const isFirstBrand = existingBrandsCount === 0;

    const brand = await prisma.brand.create({
      data: {
        userId: user.id,
        name,
        instagramHandle,
        isDefault: isFirstBrand,
        visualDNA: (visualDNA || {}) as Prisma.InputJsonValue,
        verbalDNA: (verbalDNA || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
