import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { checkVideoStatus } from '@/lib/kling';

// ═══════════════════════════════════════════════════════════════
// GET - Get video generation status
// ═══════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get video generation
    const video = await prisma.videoGeneration.findFirst({
      where: {
        id: videoId,
        userId: dbUser.id,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, return cached status
    if (video.status === 'completed' || video.status === 'failed') {
      return NextResponse.json({
        id: video.id,
        status: video.status,
        sourceImageUrl: video.sourceImageUrl,
        outputUrl: video.outputUrl,
        duration: video.duration,
        quality: video.quality,
        creditsCost: video.creditsCost,
        errorMessage: video.errorMessage,
        createdAt: video.createdAt,
        completedAt: video.completedAt,
      });
    }

    // If processing, check Kling status
    if (video.externalTaskId && video.status === 'processing') {
      try {
        const klingStatus = await checkVideoStatus(video.externalTaskId);

        if (klingStatus.status === 'completed' && klingStatus.videoUrl) {
          // Update with completed status
          const updated = await prisma.videoGeneration.update({
            where: { id: video.id },
            data: {
              status: 'completed',
              outputUrl: klingStatus.videoUrl,
              completedAt: new Date(),
            },
          });

          return NextResponse.json({
            id: updated.id,
            status: updated.status,
            sourceImageUrl: updated.sourceImageUrl,
            outputUrl: updated.outputUrl,
            duration: updated.duration,
            quality: updated.quality,
            creditsCost: updated.creditsCost,
            createdAt: updated.createdAt,
            completedAt: updated.completedAt,
          });
        }

        if (klingStatus.status === 'failed') {
          // Update with failed status
          const updated = await prisma.videoGeneration.update({
            where: { id: video.id },
            data: {
              status: 'failed',
              errorMessage: klingStatus.error || 'Video generation failed',
              completedAt: new Date(),
            },
          });

          return NextResponse.json({
            id: updated.id,
            status: updated.status,
            sourceImageUrl: updated.sourceImageUrl,
            errorMessage: updated.errorMessage,
            duration: updated.duration,
            quality: updated.quality,
            creditsCost: updated.creditsCost,
            createdAt: updated.createdAt,
            completedAt: updated.completedAt,
          });
        }
      } catch (klingError) {
        console.error('[VIDEO] Error checking Kling status:', klingError);
        // Return current status without updating
      }
    }

    // Return current status
    return NextResponse.json({
      id: video.id,
      status: video.status,
      sourceImageUrl: video.sourceImageUrl,
      outputUrl: video.outputUrl,
      duration: video.duration,
      quality: video.quality,
      creditsCost: video.creditsCost,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt,
      completedAt: video.completedAt,
    });
  } catch (error) {
    console.error('[VIDEO] Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
