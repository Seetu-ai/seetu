import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { constructPrompt, buildNegativePrompt, selectPipeline } from '@/lib/prompt-builder';
import type { WizardBrief } from '@/lib/stores/wizard-store';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Credit costs in units (100 units = 1 credit displayed)
const CREDIT_COST = 100; // 1 credit per generation

/**
 * POST /api/v1/workspaces/[slug]/studio/generate
 * Generate image from wizard brief using Gemini
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'member');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace, user } = context;

  try {
    const brief: WizardBrief = await req.json();

    // Validate brief
    if (!brief.product?.url) {
      return NextResponse.json(
        { error: 'Product image is required' },
        { status: 400 }
      );
    }

    // Check credits
    if (workspace.creditUnits < CREDIT_COST) {
      return NextResponse.json(
        { error: 'Crédits insuffisants', required: CREDIT_COST, available: workspace.creditUnits },
        { status: 402 }
      );
    }

    // Get background metadata if selected
    let backgroundMetadata = null;
    if (brief.scene.backgroundId) {
      const background = await prisma.background.findUnique({
        where: { id: brief.scene.backgroundId },
      });
      if (background) {
        backgroundMetadata = {
          name: background.name,
          lighting: background.lighting,
          mood: background.mood,
          promptHints: background.promptHints,
          lightingData: background.lightingData as any,
        };
      }
    }

    // Determine pipeline
    const pipeline = selectPipeline(brief);
    console.log(`[STUDIO] Using ${pipeline} pipeline`);

    // Build prompt
    const prompt = await constructPrompt(brief, backgroundMetadata || undefined);
    const negativePrompt = buildNegativePrompt(brief);

    console.log('[STUDIO] Generated prompt:', prompt.substring(0, 200) + '...');

    // Generate image
    const outputUrl = await generateWithGemini(
      prompt,
      brief.product.url,
      brief.scene.backgroundUrl,
      brief.moodboard.url
    );

    if (!outputUrl) {
      throw new Error('Generation failed - no output');
    }

    // Debit credits
    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: { creditUnits: { decrement: CREDIT_COST } },
      }),
      prisma.creditLedger.create({
        data: {
          workspaceId: workspace.id,
          delta: -CREDIT_COST,
          balanceAfter: workspace.creditUnits - CREDIT_COST,
          reason: 'Studio wizard generation',
          refType: 'studio_wizard',
          createdBy: user.id,
        },
      }),
    ]);

    // Create/update studio session
    await prisma.studioSession.create({
      data: {
        workspaceId: workspace.id,
        productId: brief.product.id || null,
        productAnalysis: brief.product.analysis || undefined,
        presentation: brief.presentation.type,
        presentationDetails: brief.presentation.note,
        backgroundId: brief.scene.backgroundId,
        sceneType: brief.scene.type,
        moodboardUrl: brief.moodboard.url,
        styleInstruction: brief.moodboard.note,
        modifiers: {
          product_note: brief.product.note,
          presentation_note: brief.presentation.note,
          scene_note: brief.scene.note,
          style_note: brief.moodboard.note,
        },
        canvasState: brief.canvas,
        finalPrompt: prompt,
        generatedUrls: [outputUrl],
        status: 'completed',
        creditsCost: CREDIT_COST,
        currentStep: 4,
        completedSteps: [1, 2, 3, 4],
      },
    });

    return NextResponse.json({
      success: true,
      outputUrl,
      prompt,
      pipeline,
      creditsCost: CREDIT_COST,
      creditsRemaining: workspace.creditUnits - CREDIT_COST,
    });
  } catch (error) {
    console.error('Studio generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate image using Gemini (Nano Banana Pro)
 */
async function generateWithGemini(
  prompt: string,
  productImageUrl: string,
  backgroundUrl?: string,
  moodboardUrl?: string
): Promise<string | null> {
  if (!genAI) {
    console.error('Gemini API not configured');
    return null;
  }

  try {
    // Nano Banana Pro (Gemini 3 Pro Image)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

    // Build content parts
    const parts: any[] = [];

    // Add product image
    const productImage = await urlToBase64(productImageUrl);
    if (productImage) {
      parts.push({
        inlineData: {
          mimeType: productImage.mimeType,
          data: productImage.data,
        },
      });
    }

    // Add background reference if available
    if (backgroundUrl) {
      const bgImage = await urlToBase64(backgroundUrl);
      if (bgImage) {
        parts.push({
          inlineData: {
            mimeType: bgImage.mimeType,
            data: bgImage.data,
          },
        });
      }
    }

    // Add moodboard reference if available
    if (moodboardUrl) {
      const moodImage = await urlToBase64(moodboardUrl);
      if (moodImage) {
        parts.push({
          inlineData: {
            mimeType: moodImage.mimeType,
            data: moodImage.data,
          },
        });
      }
    }

    // Build the generation prompt
    let fullPrompt = `Generate a professional product photography image.

Product Image: First image provided.
${backgroundUrl ? 'Background Reference: Second image provided - harmonize the product into this scene.' : ''}
${moodboardUrl ? 'Style Reference: Use the style, lighting, and mood from the reference image.' : ''}

Requirements:
${prompt}

Create a photorealistic, commercial-quality image that looks like it was shot by a professional photographer in Senegal. The product should be the clear focal point with perfect lighting and composition.`;

    parts.push(fullPrompt);

    const result = await model.generateContent(parts);
    const response = result.response;

    // Extract image from response
    if (response.candidates && response.candidates[0]) {
      const responseParts = response.candidates[0].content?.parts || [];

      for (const part of responseParts) {
        if ((part as any).inlineData) {
          const inlineData = (part as any).inlineData;

          // Save to local storage
          const filename = `wizard-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
          const fs = await import('fs/promises');
          const path = await import('path');

          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'studio');
          await fs.mkdir(uploadDir, { recursive: true });

          const buffer = Buffer.from(inlineData.data, 'base64');
          await fs.writeFile(path.join(uploadDir, filename), buffer);

          const outputUrl = `/uploads/studio/${filename}`;
          console.log('[STUDIO] Image saved to:', outputUrl);
          return outputUrl;
        }
      }
    }

    console.error('No image in Gemini response');
    return null;
  } catch (error) {
    console.error('Gemini generation error:', error);
    return null;
  }
}

/**
 * Convert URL to base64
 */
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const [header, data] = url.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      return { data, mimeType };
    }

    if (url.startsWith('/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', url);
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      return { data: buffer.toString('base64'), mimeType };
    }

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return null;
  }
}
