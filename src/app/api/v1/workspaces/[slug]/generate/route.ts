import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildHarmonizationPrompt } from '@/lib/vision';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Credit costs in units (100 units = 1 credit displayed)
const CREDIT_COSTS = {
  preview: 50,   // 0.5 credits
  final: 100,    // 1 credit
  final_4k: 200, // 2 credits
};

/**
 * POST /api/v1/workspaces/[slug]/generate
 * Generate a harmonized product image using Nano Banana Pro
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
    const body = await req.json();
    const {
      productImageUrl,
      productAnalysis,
      placement,
      backgroundId,
      style,
      customPrompt,
      mode = 'final', // preview, final, final_4k
    } = body;

    // Check credits
    const creditCost = CREDIT_COSTS[mode as keyof typeof CREDIT_COSTS] || 100;
    if (workspace.creditUnits < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditCost, available: workspace.creditUnits },
        { status: 402 }
      );
    }

    // Get background metadata if selected
    let backgroundMetadata = null;
    if (backgroundId) {
      const background = await prisma.background.findUnique({
        where: { id: backgroundId },
      });
      if (background) {
        backgroundMetadata = {
          name: background.name,
          lighting: background.lighting,
          mood: background.mood,
          promptHints: background.promptHints,
        };
      }
    }

    // Build the harmonization prompt
    const prompt = customPrompt || buildHarmonizationPrompt(
      {
        productAnalysis,
        selectedPlacement: placement,
        selectedBackground: backgroundId,
        selectedStyle: style,
        customInstructions: null,
      },
      backgroundMetadata || undefined
    );

    console.log('[STUDIO] Generating with prompt:', prompt.substring(0, 150) + '...');

    // Generate image with Nano Banana Pro
    const outputUrl = await generateWithNanoBananaPro(prompt, productImageUrl);

    if (!outputUrl) {
      throw new Error('Generation failed - no output');
    }

    // Debit credits
    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: { creditUnits: { decrement: creditCost } },
      }),
      prisma.creditLedger.create({
        data: {
          workspaceId: workspace.id,
          delta: -creditCost,
          balanceAfter: workspace.creditUnits - creditCost,
          reason: 'Studio generation',
          refType: 'studio_generation',
          createdBy: user.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      outputUrl,
      creditsCost: creditCost,
      creditsRemaining: workspace.creditUnits - creditCost,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate image using Nano Banana Pro (Gemini 3 Pro Image)
 */
async function generateWithNanoBananaPro(
  prompt: string,
  productImageUrl?: string
): Promise<string | null> {
  if (!genAI) {
    console.error('Gemini API not configured');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

    // Build the full prompt for harmonization
    const fullPrompt = `Generate a professional product photography image.

${prompt}

The image should look authentic, as if shot by a professional photographer in Senegal.
Ensure realistic lighting, shadows, and reflections that match the environment.
The product should be the clear focal point with beautiful composition.`;

    let result;

    // If we have a product image, include it for reference
    if (productImageUrl) {
      const productImageBase64 = await urlToBase64(productImageUrl);
      if (productImageBase64) {
        result = await model.generateContent([
          {
            inlineData: {
              mimeType: productImageBase64.mimeType,
              data: productImageBase64.data,
            },
          },
          `Here is the product to photograph. ${fullPrompt}`,
        ]);
      } else {
        result = await model.generateContent(fullPrompt);
      }
    } else {
      result = await model.generateContent(fullPrompt);
    }

    const response = result.response;

    // Extract image from response
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content?.parts || [];

      for (const part of parts) {
        if ((part as any).inlineData) {
          const inlineData = (part as any).inlineData;

          // Save to local storage
          const filename = `studio-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
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
    console.error('Nano Banana Pro generation error:', error);
    return null;
  }
}

/**
 * Convert URL to base64
 */
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      // Already base64
      const [header, data] = url.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      return { data, mimeType };
    }

    if (url.startsWith('/')) {
      // Local file
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', url);
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      return { data: buffer.toString('base64'), mimeType };
    }

    // Remote URL
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return null;
  }
}
