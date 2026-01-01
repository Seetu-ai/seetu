/**
 * Core Generation Logic
 * Extracted from the generate route for reuse in batch processing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prisma';
import { constructPrompt, buildNegativePrompt, selectPipeline } from './prompt-builder';
import { getCleanReferenceUrl } from './image-processing';
import { uploadGeneratedImage, getAssetImageSignedUrls } from './storage';
import type { WizardBrief, ProductAnalysis, PresentationType, SceneType } from './stores/wizard-store';
import type { BatchStyleSettings } from './batch-processor';
import type { Product } from '@prisma/client';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GenerationInput {
  brief: WizardBrief;
  userId: string;
  brandId?: string;
}

export interface GenerationOutput {
  success: boolean;
  outputUrl?: string;
  caption?: string;
  error?: string;
}

export interface BrandDNA {
  vibe_summary?: string;
  primary_colors?: string[];
  secondary_colors?: string[];
  lighting_style?: string;
  photography_style?: string;
  verbal_dna?: VerbalDNA;
}

export interface VerbalDNA {
  tone?: string;
  primary_language?: string;
  emoji_palette?: string[];
  emoji_frequency?: string;
  typical_length?: string;
  caption_structure?: string;
  signature_hashtags?: string[];
  uses_hashtags_in_caption?: boolean;
  exemplars?: string[];
  example_captions?: string[];
  formatting_quirks?: string;
  cta_style?: string;
}

// ═══════════════════════════════════════════════════════════════
// BRIEF BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a WizardBrief from a product and style settings
 */
export function buildBriefFromProduct(
  product: Product,
  styleSettings: BatchStyleSettings,
  brandId?: string
): WizardBrief {
  // Extract product analysis from metadata
  // Analysis can be stored either:
  // 1. Directly in metadata (category, colors, etc.) - from products page
  // 2. Under metadata.analysis - legacy format
  let analysis: ProductAnalysis | undefined;

  if (product.metadata && typeof product.metadata === 'object' && !Array.isArray(product.metadata)) {
    const meta = product.metadata as Record<string, unknown>;

    // Check if analysis is nested under 'analysis' key (legacy)
    if (meta.analysis && typeof meta.analysis === 'object') {
      analysis = meta.analysis as ProductAnalysis;
    }
    // Otherwise check if analysis fields are at top level (products page format)
    else if (meta.category || meta.colors || meta.description) {
      analysis = {
        category: (meta.category as string) || '',
        subcategory: (meta.subcategory as string) || '',
        name: product.name || '',
        colors: (meta.colors as string[]) || [],
        materials: (meta.materials as string[]) || [],
        style: (meta.style as string) || '',
        description: (meta.description as string) || '',
        suggestedContexts: (meta.suggestedContexts as string[]) || [],
        keywords: (meta.keywords as string[]) || [],
      };
    }
  }

  return {
    product: {
      id: product.id,
      url: product.thumbnailUrl || product.originalUrl || '',
      analysis: analysis,
      note: undefined,
    },
    presentation: {
      type: styleSettings.presentation as PresentationType,
      note: undefined,
    },
    scene: {
      type: styleSettings.sceneType as SceneType,
      backgroundId: styleSettings.backgroundId,
      backgroundUrl: undefined,
      backgroundName: undefined,
      solidColor: styleSettings.solidColor,
      note: undefined,
    },
    moodboard: {
      url: undefined,
      note: undefined,
    },
    canvas: {
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    },
    selectedBrandId: brandId,
  };
}

// ═══════════════════════════════════════════════════════════════
// CORE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a single image from a brief
 * This is the core generation logic extracted from the API route
 */
export async function generateSingleImage(input: GenerationInput): Promise<GenerationOutput> {
  const { brief, userId, brandId } = input;

  if (!genAI) {
    return { success: false, error: 'Gemini API not configured' };
  }

  try {
    // Validate brief
    if (!brief.product?.url) {
      return { success: false, error: 'Product image is required' };
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
          lightingData: background.lightingData as Record<string, unknown>,
        };
      }
    }

    // Get brand DNA
    let brandDNA: BrandDNA | undefined;

    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId },
      });
      if (brand) {
        brandDNA = brand.visualDNA as unknown as BrandDNA | undefined;
      }
    }

    // Build prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = await constructPrompt(brief, backgroundMetadata || undefined, brandDNA as any);
    const negativePrompt = buildNegativePrompt(brief);

    console.log('[GEN_CORE] Generated prompt:', prompt.substring(0, 200) + '...');

    // Prepare product reference image
    let productImageUrl = brief.product.url;
    const originalProductUrl = brief.product.url;

    if (brief.product.id) {
      try {
        const product = await prisma.product.findUnique({
          where: { id: brief.product.id },
          select: { metadata: true, originalUrl: true },
        });

        const metadata = product?.metadata as { bbox?: unknown; svgPath?: string } | null;

        if (metadata?.bbox) {
          console.log('[GEN_CORE] Product has bbox metadata, creating clean reference...');
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleanRefUrl = await getCleanReferenceUrl(
              product?.originalUrl || brief.product.url,
              brief.product.id,
              metadata.bbox as any,
              metadata.svgPath
            );

            // Verify the clean reference is accessible
            const verifyResponse = await fetch(cleanRefUrl, { method: 'HEAD' });
            const contentType = verifyResponse.headers.get('content-type') || '';
            if (verifyResponse.ok && contentType.startsWith('image/')) {
              productImageUrl = cleanRefUrl;
              console.log('[GEN_CORE] Clean reference verified');
            } else {
              productImageUrl = originalProductUrl;
            }
          } catch {
            productImageUrl = originalProductUrl;
          }
        }
      } catch {
        // Use original URL on error
      }
    }

    // Generate image
    const outputUrl = await generateWithGemini(
      prompt,
      productImageUrl,
      userId,
      brief.scene.backgroundUrl,
      brief.moodboard.url,
      negativePrompt
    );

    if (!outputUrl) {
      return { success: false, error: 'Generation failed - no output' };
    }

    return {
      success: true,
      outputUrl,
    };
  } catch (error) {
    console.error('[GEN_CORE] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// GEMINI GENERATION
// ═══════════════════════════════════════════════════════════════

async function generateWithGemini(
  prompt: string,
  productImageUrl: string,
  userId: string,
  backgroundUrl?: string,
  moodboardUrl?: string,
  negativePrompt?: string
): Promise<string | null> {
  if (!genAI) {
    console.error('Gemini API not configured');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as Record<string, unknown>,
    });

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Add product image
    console.log(`[GEN_CORE] Loading product image from: ${productImageUrl}`);
    const productImage = await urlToBase64(productImageUrl);
    if (productImage) {
      parts.push({
        inlineData: {
          mimeType: productImage.mimeType,
          data: productImage.data,
        },
      });
    } else {
      console.error(`[GEN_CORE] FAILED to load product image from: ${productImageUrl}`);
      return null;
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
    const fullPrompt = `Generate a professional product photography image.

PRODUCT IMAGE (First image): THIS IS THE EXACT AND ONLY PRODUCT TO SHOW.
STRICT RULES FOR THE PRODUCT:
- Reproduce this EXACT garment/item - same design, same color, same fabric, same details
- Do NOT add any extra clothing, layers, accessories, or items that are not in the original image
- The product must appear EXACTLY as shown - nothing added, nothing removed

${backgroundUrl ? 'Background Reference: Second image provided - place the product naturally into this scene with matching lighting and shadows.' : ''}
${moodboardUrl ? 'Style Reference: Use the style, lighting, and mood from the reference image.' : ''}

Requirements:
${prompt}
${negativePrompt ? `\nAVOID (DO NOT INCLUDE THESE): ${negativePrompt}` : ''}

CRITICAL: The product in the output must look EXACTLY like the product in the input image. Same brand, same label design, same colors. Only change the background/environment, not the product itself.

Create a photorealistic, commercial-quality image that looks like it was shot by a professional photographer in Senegal. The product should be the clear focal point with perfect lighting and composition.`;

    parts.push({ text: fullPrompt });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent(parts as any);
    const response = result.response;

    if (response.candidates && response.candidates[0]) {
      const responseParts = response.candidates[0].content?.parts || [];

      for (const part of responseParts) {
        if ((part as { inlineData?: { data: string } }).inlineData) {
          const inlineData = (part as { inlineData: { data: string } }).inlineData;
          const buffer = Buffer.from(inlineData.data, 'base64');

          // Upload to Supabase Storage
          const { url: outputUrl } = await uploadGeneratedImage(buffer, userId);
          console.log('[GEN_CORE] Image saved to Supabase:', outputUrl);
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

      try {
        await fs.access(filePath);
      } catch {
        console.error('[urlToBase64] Local file not found:', filePath);
        return null;
      }

      const buffer = await fs.readFile(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { data: buffer.toString('base64'), mimeType };
    }

    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error('[urlToBase64] URL did not return an image:', url);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const mimeType = contentType.split(';')[0].split(',')[0].trim() || 'image/jpeg';
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  } catch (error) {
    console.error('[urlToBase64] Error:', error);
    return null;
  }
}
