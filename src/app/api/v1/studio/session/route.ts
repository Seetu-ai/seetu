import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildHarmonizationPrompt } from '@/lib/vision';

/**
 * POST /api/v1/studio/session
 * Create or update a studio session
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, productId, productAnalysis, presentation, backgroundId, styleInstruction, modifiers } = body;

    let session;

    if (sessionId) {
      // Update existing session
      session = await prisma.studioSession.update({
        where: { id: sessionId },
        data: {
          productId,
          productAnalysis,
          presentation,
          backgroundId,
          styleInstruction,
          modifiers: modifiers || {},
          currentStep: determineStep({ productAnalysis, presentation, backgroundId, styleInstruction }),
        },
        include: {
          product: true,
          background: true,
        },
      });
    } else {
      // Create new session
      session = await prisma.studioSession.create({
        data: {
          userId: user.id,
          productId,
          productAnalysis,
          presentation,
          backgroundId,
          styleInstruction,
          modifiers: modifiers || {},
          currentStep: 1,
        },
        include: {
          product: true,
          background: true,
        },
      });
    }

    // Build prompt if ready
    let finalPrompt = null;
    if (session.productAnalysis && session.presentation && session.styleInstruction) {
      finalPrompt = buildHarmonizationPrompt(
        {
          productAnalysis: session.productAnalysis as any,
          selectedPlacement: session.presentation,
          selectedBackground: session.backgroundId,
          selectedStyle: session.styleInstruction,
          customInstructions: (session.modifiers as any)?.style_note || null,
        },
        session.background ? {
          name: session.background.name,
          lighting: session.background.lighting,
          mood: session.background.mood,
        } : undefined
      );

      await prisma.studioSession.update({
        where: { id: session.id },
        data: { finalPrompt },
      });
    }

    return NextResponse.json({
      session: {
        ...session,
        finalPrompt,
      },
      nextStep: getNextStep(session),
    });
  } catch (error) {
    console.error('Studio session error:', error);
    return NextResponse.json(
      { error: 'Failed to process session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/studio/session?id=xxx
 * Get a studio session
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      const session = await prisma.studioSession.findFirst({
        where: { id: sessionId, userId: user.id },
        include: {
          product: true,
          background: true,
        },
      });

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ session });
    }

    // Get recent sessions
    const sessions = await prisma.studioSession.findMany({
      where: { userId: user.id },
      include: {
        product: true,
        background: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function determineStep(data: {
  productAnalysis: any;
  presentation: string | null;
  backgroundId: string | null;
  styleInstruction: string | null;
}): number {
  if (!data.productAnalysis) return 1;
  if (!data.presentation) return 2;
  if (!data.backgroundId) return 3;
  if (!data.styleInstruction) return 4;
  return 5;
}

function getNextStep(session: any): {
  step: string;
  message: string;
  options?: { id: string; label: string; icon?: string }[];
} {
  const analysis = session.productAnalysis as any;

  if (!analysis) {
    return {
      step: 'upload',
      message: "Uploadez une photo de votre produit pour commencer.",
    };
  }

  if (!session.presentation) {
    const presentationOptions = {
      product_only: { label: 'Produit seul', icon: '📦' },
      on_model: { label: 'Sur mannequin', icon: '👤' },
      ghost: { label: 'Ghost mannequin', icon: '👻' },
    };

    return {
      step: 'presentation',
      message: `Je vois ${analysis.description || 'votre produit'}. Comment voulez-vous le présenter?`,
      options: Object.entries(presentationOptions).map(([id, opt]) => ({
        id,
        label: opt.label,
        icon: opt.icon,
      })),
    };
  }

  if (!session.backgroundId) {
    return {
      step: 'background',
      message: `Parfait! Où voulez-vous photographier votre ${analysis.subcategory?.toLowerCase() || 'produit'}?`,
      options: [
        { id: 'real_place', label: 'Lieu réel au Sénégal', icon: '🇸🇳' },
        { id: 'studio', label: 'Studio professionnel', icon: '📸' },
        { id: 'lifestyle', label: 'Ambiance lifestyle', icon: '✨' },
      ],
    };
  }

  if (!session.styleInstruction) {
    return {
      step: 'style',
      message: "Quel style de photo préférez-vous?",
      options: [
        { id: 'clean', label: 'Clean & Minimal', icon: '⚪' },
        { id: 'warm', label: 'Chaleureux', icon: '🌅' },
        { id: 'vibrant', label: 'Vibrant', icon: '🎨' },
        { id: 'luxe', label: 'Luxe', icon: '💎' },
      ],
    };
  }

  return {
    step: 'ready',
    message: "Parfait! Votre photo est prête à être générée.",
  };
}
