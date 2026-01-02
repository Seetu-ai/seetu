import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  createBatchJob,
  checkBatchCredits,
  getBatchJobProgress,
} from '@/lib/batch-processor';
import { enqueueBatchJob, getBatchQueue } from '@/lib/queues/batch-queue';
import { processBatchJob } from '@/lib/workers/batch-worker';
import { getPresetById } from '@/lib/batch-presets';
import type { BatchStyleSettings } from '@/lib/batch-processor';

// ═══════════════════════════════════════════════════════════════
// POST - Start a batch generation job
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productIds, styleSettings, presetId } = body as {
      productIds: string[];
      styleSettings?: BatchStyleSettings;
      presetId?: string;
    };

    // Get preset settings if presetId provided
    const preset = presetId ? getPresetById(presetId) : undefined;
    const finalStyleSettings = preset?.settings || styleSettings;

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

    if (!finalStyleSettings) {
      return NextResponse.json(
        { error: 'styleSettings or presetId is required' },
        { status: 400 }
      );
    }

    // Verify all products exist and belong to user's brands
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        brand: { userId: user.id },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products not found or unauthorized' },
        { status: 400 }
      );
    }

    // Check credits
    const creditCheck = await checkBatchCredits(user.id, productIds.length);
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
    const batchJob = await createBatchJob(user.id, productIds, finalStyleSettings);

    const jobData = {
      batchJobId: batchJob.id,
      userId: user.id,
      presetId,
    };

    // Check if Redis queue is available
    const queue = getBatchQueue();

    if (queue) {
      // Enqueue for background processing with Redis
      const jobId = await enqueueBatchJob(jobData);
      console.log(`[BATCH] Job ${batchJob.id} enqueued to Redis as ${jobId}`);
    } else {
      // No Redis - process in background (non-blocking)
      console.log(`[BATCH] No Redis queue, processing ${batchJob.id} inline`);

      // Start processing in background (don't await)
      processBatchJob(jobData).catch((err) => {
        console.error(`[BATCH] Inline processing failed for ${batchJob.id}:`, err);
      });
    }

    // Return job info
    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      totalProducts: batchJob.totalProducts,
      estimatedCredits: batchJob.estimatedCredits,
      presetId: presetId,
      presetName: preset?.nameFr,
      message: 'Batch job started. Poll /api/v1/batch/{id} for progress.',
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      where: { userId: user.id },
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
