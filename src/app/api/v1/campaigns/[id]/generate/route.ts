import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyStyleLock } from '@/lib/style-lock';
import type { StyleLock } from '@/lib/style-lock';

// ═══════════════════════════════════════════════════════════════
// POST - Generate next image for campaign
// ═══════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get campaign with style lock
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if campaign is complete
    if (campaign.generatedCount >= campaign.targetCount) {
      return NextResponse.json(
        { error: 'Campaign is already complete' },
        { status: 400 }
      );
    }

    // Get style lock
    const styleLock = campaign.styleLock as unknown as StyleLock;

    // Build prompt with style lock
    const basePrompt = campaign.brand?.visualDna
      ? `Product photo in brand style. ${campaign.brand.visualDna}`
      : 'Professional product photography, high quality, studio lighting';

    const styledPrompt = applyStyleLock(basePrompt, styleLock);

    // Call the generation API
    const generateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/studio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        prompt: styledPrompt,
        styleSeed: campaign.styleSeed,
        // Pass campaign context
        campaignId: campaign.id,
      }),
    });

    const generateData = await generateRes.json();

    if (!generateRes.ok) {
      throw new Error(generateData.error || 'Generation failed');
    }

    // Create campaign image record
    const campaignImage = await prisma.campaignImage.create({
      data: {
        campaignId: campaign.id,
        outputUrl: generateData.outputUrl,
        caption: generateData.caption,
        sortOrder: campaign.generatedCount,
      },
    });

    // Update campaign progress
    const newGeneratedCount = campaign.generatedCount + 1;
    const newStatus = newGeneratedCount >= campaign.targetCount ? 'completed' : 'active';

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        generatedCount: newGeneratedCount,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      image: campaignImage,
      progress: {
        generated: newGeneratedCount,
        target: campaign.targetCount,
        isComplete: newGeneratedCount >= campaign.targetCount,
      },
    });
  } catch (error) {
    console.error('[CAMPAIGN_GENERATE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
