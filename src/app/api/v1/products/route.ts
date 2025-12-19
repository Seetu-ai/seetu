import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getDefaultBrand } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { uploadBuffer, BUCKETS } from '@/lib/storage';
import type { Prisma } from '@prisma/client';

const createProductSchema = z.object({
  name: z.string().optional(),
  brandId: z.string().optional(), // If not provided, uses default brand
  imageUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/v1/products - List products for a brand
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    // If no brandId, get default brand
    let targetBrandId = brandId;
    if (!targetBrandId) {
      const defaultBrand = await getDefaultBrand(user.id);
      if (!defaultBrand) {
        return NextResponse.json({ products: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
      }
      targetBrandId = defaultBrand.id;
    }

    // Verify brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: targetBrandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const where = {
      brandId: brand.id,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      brandId: brand.id,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/products - Create a new product
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, brandId, imageUrl, metadata } = validation.data;

    // Get brand (provided or default)
    let targetBrandId = brandId;
    if (!targetBrandId) {
      const defaultBrand = await getDefaultBrand(user.id);
      if (!defaultBrand) {
        return NextResponse.json(
          { error: 'No brand found. Please create a brand first.' },
          { status: 400 }
        );
      }
      targetBrandId = defaultBrand.id;
    }

    // Verify brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: targetBrandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Handle image URL - upload to Supabase Storage if external URL
    let originalUrl = imageUrl || '';
    let thumbnailUrl = imageUrl || '';

    if (imageUrl && imageUrl.startsWith('http')) {
      try {
        // Fetch the image and upload to Supabase
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { url } = await uploadBuffer(BUCKETS.UPLOADS, buffer, filename, contentType);
        originalUrl = url;
        thumbnailUrl = url;
      } catch (uploadError) {
        console.warn('Failed to upload to Supabase, using original URL:', uploadError);
        // Keep original URL as fallback
      }
    }

    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name,
        originalUrl,
        thumbnailUrl,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/products - Upload endpoint info
 * Note: Direct uploads should use POST /api/v1/upload instead
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect to use the upload endpoint instead
    return NextResponse.json({
      message: 'Use POST /api/v1/upload for file uploads',
      uploadEndpoint: '/api/v1/upload',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
