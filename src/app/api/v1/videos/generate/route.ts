import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getVideoCost, debitCredits, type VideoDuration, type VideoQuality } from '@/lib/credits';
import { generateVideo, buildVideoPrompt, isKlingConfigured } from '@/lib/kling';

// ═══════════════════════════════════════════════════════════════
// POST - Start video generation
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Check if Kling is configured
    if (!isKlingConfigured()) {
      return NextResponse.json(
        { error: 'Video generation is not configured' },
        { status: 503 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sourceImageUrl,
      duration = 5,
      quality = 'standard',
      prompt,
    } = body as {
      sourceImageUrl: string;
      duration?: VideoDuration;
      quality?: VideoQuality;
      prompt?: string;
    };

    // Validation
    if (!sourceImageUrl) {
      return NextResponse.json(
        { error: 'sourceImageUrl is required' },
        { status: 400 }
      );
    }

    if (duration !== 5 && duration !== 10) {
      return NextResponse.json(
        { error: 'Duration must be 5 or 10 seconds' },
        { status: 400 }
      );
    }

    if (quality !== 'standard' && quality !== 'pro') {
      return NextResponse.json(
        { error: 'Quality must be standard or pro' },
        { status: 400 }
      );
    }

    // Calculate cost
    const creditsCost = getVideoCost(duration, quality);

    // Check credits
    if (user.creditUnits < creditsCost) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          needed: creditsCost,
          available: user.creditUnits,
        },
        { status: 402 }
      );
    }

    // Create video generation record
    const videoGeneration = await prisma.videoGeneration.create({
      data: {
        userId: user.id,
        sourceImageUrl,
        prompt: prompt || buildVideoPrompt(),
        duration,
        quality,
        creditsCost,
        status: 'pending',
      },
    });

    try {
      // Start Kling generation
      const klingResponse = await generateVideo({
        imageUrl: sourceImageUrl,
        prompt: prompt || buildVideoPrompt(),
        duration,
        mode: quality === 'pro' ? 'pro' : 'std',
      });

      // Update with external task ID
      await prisma.videoGeneration.update({
        where: { id: videoGeneration.id },
        data: {
          externalTaskId: klingResponse.taskId,
          status: 'processing',
        },
      });

      // Debit credits
      const debitResult = await debitCredits({
        userId: user.id,
        units: creditsCost,
        reason: 'video_generation',
        refType: 'video_generation',
        refId: videoGeneration.id,
        description: `Video generation (${duration}s ${quality})`,
      });

      if (!debitResult.success) {
        // Rollback - mark as failed
        await prisma.videoGeneration.update({
          where: { id: videoGeneration.id },
          data: {
            status: 'failed',
            errorMessage: 'Failed to debit credits',
          },
        });

        return NextResponse.json(
          { error: 'Failed to process payment' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        videoId: videoGeneration.id,
        taskId: klingResponse.taskId,
        status: 'processing',
        creditsCost,
        message: 'Video generation started. Poll /api/v1/videos/{videoId} for status.',
      });
    } catch (klingError) {
      console.error('[VIDEO] Kling API error:', klingError);

      // Mark as failed
      await prisma.videoGeneration.update({
        where: { id: videoGeneration.id },
        data: {
          status: 'failed',
          errorMessage: klingError instanceof Error ? klingError.message : 'Kling API error',
        },
      });

      return NextResponse.json(
        { error: 'Failed to start video generation' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[VIDEO] Error starting generation:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET - List user's video generations
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
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [videos, total] = await Promise.all([
      prisma.videoGeneration.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          sourceImageUrl: true,
          duration: true,
          quality: true,
          status: true,
          outputUrl: true,
          creditsCost: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.videoGeneration.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      videos,
      total,
      hasMore: offset + videos.length < total,
    });
  } catch (error) {
    console.error('[VIDEO] Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
