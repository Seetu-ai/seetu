import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  createBatchJob,
  checkBatchCredits,
  getBatchJobProgress,
  startBatchProcessing,
  markGenerationProcessing,
  completeGeneration,
  failGeneration,
  debitBatchGenerationCredits,
} from '@/lib/batch-processor';
import type { BatchStyleSettings } from '@/lib/batch-processor';

// ═══════════════════════════════════════════════════════════════
// POST - Start a batch generation job
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { productIds, styleSettings } = body as {
      productIds: string[];
      styleSettings: BatchStyleSettings;
    };

    // Validation
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      );
    }

    if (productIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 products per batch' },
        { status: 400 }
      );
    }

    if (!styleSettings) {
      return NextResponse.json(
        { error: 'styleSettings is required' },
        { status: 400 }
      );
    }

    // Verify all products exist and belong to user's brands
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        brand: { userId: dbUser.id },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products not found or unauthorized' },
        { status: 400 }
      );
    }

    // Check credits
    const creditCheck = await checkBatchCredits(dbUser.id, productIds.length);
    if (!creditCheck.hasEnough) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          needed: creditCheck.needed,
          available: creditCheck.available,
        },
        { status: 402 }
      );
    }

    // Create batch job
    const batchJob = await createBatchJob(dbUser.id, productIds, styleSettings);

    // Return job info (processing will happen asynchronously or via webhook)
    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      totalProducts: batchJob.totalProducts,
      estimatedCredits: batchJob.estimatedCredits,
      message: 'Batch job created. Poll /api/v1/batch/{id} for status.',
    });
  } catch (error) {
    console.error('[BATCH] Error creating batch job:', error);
    return NextResponse.json(
      { error: 'Failed to create batch job' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET - Get batch job status
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchJobId = searchParams.get('id');

    if (batchJobId) {
      // Get specific batch job
      const progress = await getBatchJobProgress(batchJobId);

      if (!progress) {
        return NextResponse.json(
          { error: 'Batch job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(progress);
    }

    // List all batch jobs for user
    const batchJobs = await prisma.batchJob.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        totalProducts: true,
        processedCount: true,
        successCount: true,
        failedCount: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ batchJobs });
  } catch (error) {
    console.error('[BATCH] Error fetching batch jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch jobs' },
      { status: 500 }
    );
  }
}
