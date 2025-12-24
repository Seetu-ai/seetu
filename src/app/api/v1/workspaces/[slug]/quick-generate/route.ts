import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { debitCredits, CREDIT_UNIT_PREVIEW, CREDIT_UNIT_FINAL } from '@/lib/credits';
import { queuePush, QUEUES, isRedisConfigured } from '@/lib/redis';
import { processGenerationSync, shouldRunSync } from '@/lib/generation';
import crypto from 'crypto';

// Generate idempotency key
function generateIdempotencyKey(params: {
  shootId: string;
  productId: string | null;
  templateId: string;
  mode: string;
  seedOverride?: number;
}): string {
  const parts = [
    params.shootId,
    params.productId || 'no-product',
    params.templateId,
    params.mode,
    params.seedOverride?.toString() || 'auto',
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'member');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace, userId } = context;

  try {
    const body = await req.json();
    const {
      productId,
      templateId,
      aspectRatio = '1:1',
      mode = 'preview',
    } = body;

    if (!productId || !templateId) {
      return NextResponse.json(
        { error: 'productId and templateId are required' },
        { status: 400 }
      );
    }

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id: productId, workspaceId: workspace.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { pack: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Calculate cost
    const unitsCost = mode === 'preview' ? CREDIT_UNIT_PREVIEW : CREDIT_UNIT_FINAL;

    // Check credits
    if (workspace.creditUnits < unitsCost) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Create ephemeral shoot for tracking
    const shoot = await prisma.shoot.create({
      data: {
        workspaceId: workspace.id,
        createdById: userId,
        templatePackId: template.packId,
        name: `Quick - ${new Date().toISOString()}`,
        status: 'in_progress',
        isQuickGenerate: true,
        defaultAspectRatio: aspectRatio,
      },
    });

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey({
      shootId: shoot.id,
      productId,
      templateId,
      mode,
    });

    // Check for existing job with same key
    const existingJob = await prisma.generationJob.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        shootId: shoot.id,
        message: 'Job already exists',
      });
    }

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        idempotencyKey,
        shootId: shoot.id,
        productId,
        templateId,
        type: template.type,
        mode: mode as any,
        status: 'queued',
        creditsCost: unitsCost,
        inputParams: {
          aspectRatio,
        },
      },
    });

    // Debit credits
    const debitResult = await debitCredits({
      workspaceId: workspace.id,
      units: unitsCost,
      reason: 'quick_generate',
      refType: 'generation_job',
      refId: job.id,
      description: `Quick Generate - ${template.name}`,
      userId,
    });

    if (!debitResult.success) {
      // Rollback: delete job and shoot
      await prisma.generationJob.delete({ where: { id: job.id } });
      await prisma.shoot.delete({ where: { id: shoot.id } });

      return NextResponse.json(
        { error: debitResult.error || 'Failed to debit credits' },
        { status: 402 }
      );
    }

    // Process generation
    const jobData = {
      jobId: job.id,
      shootId: shoot.id,
      productId,
      templateId,
      workspaceId: workspace.id,
    };

    if (shouldRunSync()) {
      // Development mode: process synchronously
      const result = await processGenerationSync(jobData);

      if (result.success) {
        return NextResponse.json({
          jobId: job.id,
          shootId: shoot.id,
          status: 'completed',
          outputUrl: result.outputUrl,
          creditsUsed: unitsCost / 100,
        });
      } else {
        return NextResponse.json({
          jobId: job.id,
          shootId: shoot.id,
          status: 'failed',
          error: result.error,
        });
      }
    } else {
      // Production mode: push to queue for worker
      await queuePush(QUEUES.GENERATION, JSON.stringify(jobData));

      return NextResponse.json({
        jobId: job.id,
        shootId: shoot.id,
        status: 'queued',
        creditsUsed: unitsCost / 100,
      });
    }
  } catch (error) {
    console.error('Error creating quick generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
