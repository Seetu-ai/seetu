/**
 * Batch Processor for Catalog Generation
 * Handles batch upload and generation of multiple products
 */

import prisma from './prisma';
import { debitCredits, CREDIT_UNIT_FINAL } from './credits';
import type { BatchJob, BatchGeneration, Product } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BatchStyleSettings {
  presentation: 'product_only' | 'on_model' | 'ghost';
  sceneType: 'studio' | 'real_place' | 'ai_generated';
  backgroundId?: string;
  solidColor?: string;
  brandId?: string;
}

export interface BatchJobProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalProducts: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  estimatedCredits: number;
  usedCredits: number;
  generations: BatchGenerationStatus[];
}

export interface BatchGenerationStatus {
  id: string;
  productId: string;
  productName?: string;
  productThumbnail?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string | null;
  errorMessage?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// BATCH JOB CREATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new batch job
 */
export async function createBatchJob(
  userId: string,
  productIds: string[],
  styleSettings: BatchStyleSettings
): Promise<BatchJob> {
  const estimatedCredits = productIds.length * CREDIT_UNIT_FINAL;

  const batchJob = await prisma.batchJob.create({
    data: {
      userId,
      productIds,
      totalProducts: productIds.length,
      styleSettings: styleSettings as unknown as Record<string, unknown>,
      estimatedCredits,
    },
  });

  // Create individual generation records for each product
  await prisma.batchGeneration.createMany({
    data: productIds.map((productId) => ({
      batchJobId: batchJob.id,
      productId,
      creditsCost: CREDIT_UNIT_FINAL,
    })),
  });

  return batchJob;
}

/**
 * Get batch job progress with generation details
 */
export async function getBatchJobProgress(batchJobId: string): Promise<BatchJobProgress | null> {
  const batchJob = await prisma.batchJob.findUnique({
    where: { id: batchJobId },
    include: {
      generations: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              thumbnailUrl: true,
            },
          },
        },
      },
    },
  });

  if (!batchJob) return null;

  return {
    id: batchJob.id,
    status: batchJob.status,
    totalProducts: batchJob.totalProducts,
    processedCount: batchJob.processedCount,
    successCount: batchJob.successCount,
    failedCount: batchJob.failedCount,
    estimatedCredits: batchJob.estimatedCredits,
    usedCredits: batchJob.usedCredits,
    generations: batchJob.generations.map((gen) => ({
      id: gen.id,
      productId: gen.productId,
      productName: gen.product.name || undefined,
      productThumbnail: gen.product.thumbnailUrl,
      status: gen.status,
      outputUrl: gen.outputUrl,
      errorMessage: gen.errorMessage,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Start processing a batch job
 * This updates the job status and returns the generations to process
 */
export async function startBatchProcessing(batchJobId: string): Promise<BatchGeneration[]> {
  // Update job status to processing
  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: { status: 'processing' },
  });

  // Get all pending generations
  const generations = await prisma.batchGeneration.findMany({
    where: {
      batchJobId,
      status: 'queued',
    },
    include: {
      product: true,
    },
  });

  return generations;
}

/**
 * Mark a generation as processing
 */
export async function markGenerationProcessing(generationId: string): Promise<void> {
  await prisma.batchGeneration.update({
    where: { id: generationId },
    data: { status: 'processing' },
  });
}

/**
 * Complete a generation successfully
 */
export async function completeGeneration(
  generationId: string,
  outputUrl: string,
  caption?: string
): Promise<void> {
  const generation = await prisma.batchGeneration.update({
    where: { id: generationId },
    data: {
      status: 'completed',
      outputUrl,
      caption,
      completedAt: new Date(),
    },
  });

  // Update batch job counters
  await prisma.batchJob.update({
    where: { id: generation.batchJobId },
    data: {
      processedCount: { increment: 1 },
      successCount: { increment: 1 },
      usedCredits: { increment: generation.creditsCost },
    },
  });

  // Check if batch is complete
  await checkBatchCompletion(generation.batchJobId);
}

/**
 * Mark a generation as failed
 */
export async function failGeneration(
  generationId: string,
  errorMessage: string
): Promise<void> {
  const generation = await prisma.batchGeneration.update({
    where: { id: generationId },
    data: {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    },
  });

  // Update batch job counters
  await prisma.batchJob.update({
    where: { id: generation.batchJobId },
    data: {
      processedCount: { increment: 1 },
      failedCount: { increment: 1 },
    },
  });

  // Check if batch is complete
  await checkBatchCompletion(generation.batchJobId);
}

/**
 * Check if a batch job is complete and update status
 */
async function checkBatchCompletion(batchJobId: string): Promise<void> {
  const batchJob = await prisma.batchJob.findUnique({
    where: { id: batchJobId },
  });

  if (!batchJob) return;

  if (batchJob.processedCount >= batchJob.totalProducts) {
    const finalStatus = batchJob.failedCount === 0
      ? 'completed'
      : batchJob.successCount === 0
        ? 'failed'
        : 'partial';

    await prisma.batchJob.update({
      where: { id: batchJobId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// CREDIT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user has enough credits for a batch job
 */
export async function checkBatchCredits(
  userId: string,
  productCount: number
): Promise<{ hasEnough: boolean; needed: number; available: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditUnits: true },
  });

  const needed = productCount * CREDIT_UNIT_FINAL;
  const available = user?.creditUnits ?? 0;

  return {
    hasEnough: available >= needed,
    needed,
    available,
  };
}

/**
 * Debit credits for a single generation in a batch
 */
export async function debitBatchGenerationCredits(
  userId: string,
  generationId: string,
  batchJobId: string
): Promise<boolean> {
  const result = await debitCredits({
    userId,
    units: CREDIT_UNIT_FINAL,
    reason: 'batch_generation',
    refType: 'batch_generation',
    refId: generationId,
    description: `Batch generation (Job: ${batchJobId})`,
  });

  return result.success;
}

// ═══════════════════════════════════════════════════════════════
// BATCH JOB QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all batch jobs for a user
 */
export async function getUserBatchJobs(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<BatchJob[]> {
  const { limit = 20, offset = 0 } = options;

  return prisma.batchJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get a batch job with all generations
 */
export async function getBatchJobWithGenerations(
  batchJobId: string
): Promise<(BatchJob & { generations: (BatchGeneration & { product: Product })[] }) | null> {
  return prisma.batchJob.findUnique({
    where: { id: batchJobId },
    include: {
      generations: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

/**
 * Cancel a batch job (only if pending or partially complete)
 */
export async function cancelBatchJob(batchJobId: string): Promise<boolean> {
  const batchJob = await prisma.batchJob.findUnique({
    where: { id: batchJobId },
  });

  if (!batchJob || batchJob.status === 'completed' || batchJob.status === 'failed') {
    return false;
  }

  // Cancel any queued generations
  await prisma.batchGeneration.updateMany({
    where: {
      batchJobId,
      status: 'queued',
    },
    data: {
      status: 'failed',
      errorMessage: 'Cancelled by user',
    },
  });

  // Update batch job status
  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: {
      status: 'failed',
      completedAt: new Date(),
    },
  });

  return true;
}
