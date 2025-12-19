import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getDefaultBrand } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { constructPrompt, buildNegativePrompt, selectPipeline } from '@/lib/prompt-builder';
import { getCleanReferenceUrl } from '@/lib/image-processing';
import { debitCredits } from '@/lib/credits';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { uploadGeneratedImage } from '@/lib/storage';
import type { WizardBrief } from '@/lib/stores/wizard-store';
import type { BrandDNA, VerbalDNA, ProductAnalysis } from '@/types';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Credit costs in units (100 units = 1 credit displayed)
const CREDIT_COST = 100; // 1 credit per generation

/**
 * POST /api/v1/studio/generate
 * Generate image from wizard brief using Gemini
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimitKey = getRateLimitKey(user.id, 'ai-generation');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.aiGeneration);
    const rateLimitError = rateLimitResponse(rateLimit);
    if (rateLimitError) {
      return rateLimitError;
    }

    const body = await req.json();
    const brief: WizardBrief = body;
    const useBrandStyle = body.useBrandStyle !== false;

    // Validate brief
    if (!brief.product?.url) {
      return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    }

    // Check credits
    if (user.creditUnits < CREDIT_COST) {
      return NextResponse.json(
        { error: 'Crédits insuffisants', required: CREDIT_COST, available: user.creditUnits },
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

    // Get brand DNA
    let brandDNA: BrandDNA | undefined;
    let verbalDNA: VerbalDNA | undefined;

    if (useBrandStyle) {
      // Try to get from selected brand first
      if (brief.selectedBrandId) {
        const selectedBrand = await prisma.brand.findFirst({
          where: { id: brief.selectedBrandId, userId: user.id },
        });

        if (selectedBrand) {
          console.log(`[STUDIO] Using selected brand: ${selectedBrand.name}`);
          brandDNA = selectedBrand.visualDNA as unknown as BrandDNA | undefined;
          verbalDNA = selectedBrand.verbalDNA as unknown as VerbalDNA | undefined;
        }
      }

      // Fallback to default brand
      if (!brandDNA) {
        const defaultBrand = await getDefaultBrand(user.id);
        if (defaultBrand) {
          console.log(`[STUDIO] Using default brand: ${defaultBrand.name}`);
          brandDNA = defaultBrand.visualDNA as unknown as BrandDNA | undefined;
          verbalDNA = defaultBrand.verbalDNA as unknown as VerbalDNA | undefined;
        }
      }

      if (brandDNA) {
        console.log(`[STUDIO] Brand DNA loaded: ${brandDNA.vibe_summary || 'no summary'}`);
      }
    } else {
      console.log(`[STUDIO] Brand style disabled`);
    }

    // Build prompt
    const prompt = await constructPrompt(brief, backgroundMetadata || undefined, brandDNA);
    const negativePrompt = buildNegativePrompt(brief);

    console.log('[STUDIO] Generated prompt:', prompt.substring(0, 200) + '...');

    // Check if this is an iteration
    const isIteration = !!brief.iterationFeedback;
    if (isIteration) {
      console.log('[STUDIO] Iteration feedback:', brief.iterationFeedback);
    }

    // Prepare product reference image (clean reference if multi-product image)
    let productImageUrl = brief.product.url;

    if (brief.product.id) {
      try {
        const product = await prisma.product.findUnique({
          where: { id: brief.product.id },
          select: { metadata: true, originalUrl: true },
        });

        const metadata = product?.metadata as { bbox?: any; svgPath?: string } | null;

        if (metadata?.bbox) {
          console.log('[STUDIO] Product has bbox metadata, creating clean reference...');
          try {
            productImageUrl = await getCleanReferenceUrl(
              product?.originalUrl || brief.product.url,
              brief.product.id,
              metadata.bbox,
              metadata.svgPath
            );
            console.log('[STUDIO] Clean reference created:', productImageUrl);
          } catch (cleanRefError) {
            console.warn('[STUDIO] Failed to create clean reference, using original:', cleanRefError);
          }
        }
      } catch (lookupError) {
        console.warn('[STUDIO] Failed to lookup product metadata:', lookupError);
      }
    }

    // Generate image
    const outputUrl = await generateWithGemini(
      prompt,
      productImageUrl,
      user.id,
      brief.scene.backgroundUrl,
      brief.moodboard.url,
      brief.iterationFeedback,
      brief.previousImageUrl,
      negativePrompt
    );

    if (!outputUrl) {
      throw new Error('Generation failed - no output');
    }

    // Generate caption if verbal DNA is available
    let generatedCaption: string | undefined;
    const activeVerbalDNA = verbalDNA || brandDNA?.verbal_dna;
    if (activeVerbalDNA && brief.product?.analysis) {
      try {
        generatedCaption = await generateCaptionForProduct(
          brief.product.analysis,
          activeVerbalDNA
        );
        console.log('[STUDIO] Generated caption:', generatedCaption?.substring(0, 100) + '...');
      } catch (captionError) {
        console.warn('[STUDIO] Caption generation failed:', captionError);
      }
    }

    // Debit credits atomically (prevents race conditions)
    const debitResult = await debitCredits({
      userId: user.id,
      units: CREDIT_COST,
      reason: 'studio_generation',
      refType: 'studio_wizard',
      description: 'Studio wizard generation',
    });

    if (!debitResult.success) {
      console.error('[STUDIO] Credit debit failed:', debitResult.error);
      return NextResponse.json(
        { error: 'Crédits insuffisants', details: debitResult.error },
        { status: 402 }
      );
    }

    // Create studio session
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidBackgroundId = brief.scene.backgroundId && uuidRegex.test(brief.scene.backgroundId);

    // Check if product actually exists in database (wizard may use temp IDs)
    let validProductId: string | null = null;
    if (brief.product.id && uuidRegex.test(brief.product.id)) {
      const productExists = await prisma.product.findUnique({
        where: { id: brief.product.id },
        select: { id: true },
      });
      if (productExists) {
        validProductId = brief.product.id;
      }
    }

    try {
      await prisma.studioSession.create({
        data: {
          userId: user.id,
          productId: validProductId,
          productAnalysis: (brief.product.analysis || undefined) as any,
          presentation: brief.presentation.type,
          presentationDetails: brief.presentation.note,
          backgroundId: isValidBackgroundId ? brief.scene.backgroundId : null,
          sceneType: brief.scene.type,
          moodboardUrl: brief.moodboard.url,
          styleInstruction: brief.moodboard.note,
          modifiers: {
            product_note: brief.product.note,
            presentation_note: brief.presentation.note,
            scene_note: brief.scene.note,
            style_note: brief.moodboard.note,
            streetview_location: brief.scene.backgroundName,
            streetview_url: brief.scene.backgroundUrl,
          },
          canvasState: brief.canvas as any,
          finalPrompt: prompt,
          generatedUrls: [outputUrl],
          status: 'completed',
          creditsCost: CREDIT_COST,
          currentStep: 4,
          completedSteps: [1, 2, 3, 4],
        },
      });
    } catch (sessionError) {
      console.warn('[STUDIO] Failed to save session:', sessionError);
    }

    return NextResponse.json({
      success: true,
      outputUrl,
      caption: generatedCaption,
      prompt,
      pipeline,
      creditsCost: CREDIT_COST,
      creditsRemaining: debitResult.newBalance,
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
 * Generate image using Gemini
 */
async function generateWithGemini(
  prompt: string,
  productImageUrl: string,
  userId: string,
  backgroundUrl?: string,
  moodboardUrl?: string,
  iterationFeedback?: string,
  previousImageUrl?: string,
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
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

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

    // Add previous image if this is an iteration
    if (iterationFeedback && previousImageUrl) {
      const prevImage = await urlToBase64(previousImageUrl);
      if (prevImage) {
        parts.push({
          inlineData: {
            mimeType: prevImage.mimeType,
            data: prevImage.data,
          },
        });
      }
    }

    // Build the generation prompt
    let fullPrompt: string;

    if (iterationFeedback && previousImageUrl) {
      fullPrompt = `Improve this product photography image based on the user's feedback.

PREVIOUS IMAGE: The last image provided is the current version that needs improvement.
PRODUCT IMAGE: The first image shows the EXACT product to use. Keep it IDENTICAL.

USER FEEDBACK - MAKE THESE CHANGES:
${iterationFeedback}

Original Requirements:
${prompt}
${negativePrompt ? `\nAVOID (DO NOT INCLUDE THESE): ${negativePrompt}` : ''}

CRITICAL INSTRUCTIONS:
1. Apply the user's feedback changes to improve the image
2. The product must still look EXACTLY like the product image (same brand, label, colors)
3. Only modify what the user requested - keep everything else the same
4. Maintain commercial quality and professional photography standards

Create an improved version that addresses the user's feedback while maintaining product accuracy.`;
    } else {
      fullPrompt = `Generate a professional product photography image.

Product Image: First image provided - THIS IS THE EXACT PRODUCT TO USE. Keep the product IDENTICAL - same label, same design, same brand, same colors, same text. Do NOT redesign or modify the product appearance in any way.
${backgroundUrl ? 'Background Reference: Second image provided - place the product naturally into this scene with matching lighting and shadows.' : ''}
${moodboardUrl ? 'Style Reference: Use the style, lighting, and mood from the reference image.' : ''}

Requirements:
${prompt}
${negativePrompt ? `\nAVOID (DO NOT INCLUDE THESE): ${negativePrompt}` : ''}

CRITICAL: The product in the output must look EXACTLY like the product in the input image. Same brand, same label design, same colors. Only change the background/environment, not the product itself.

Create a photorealistic, commercial-quality image that looks like it was shot by a professional photographer in Senegal. The product should be the clear focal point with perfect lighting and composition.`;
    }

    parts.push(fullPrompt);

    const result = await model.generateContent(parts);
    const response = result.response;

    if (response.candidates && response.candidates[0]) {
      const responseParts = response.candidates[0].content?.parts || [];

      for (const part of responseParts) {
        if ((part as any).inlineData) {
          const inlineData = (part as any).inlineData;
          const buffer = Buffer.from(inlineData.data, 'base64');

          // Upload to Supabase Storage
          const { url: outputUrl } = await uploadGeneratedImage(buffer, userId);
          console.log('[STUDIO] Image saved to Supabase:', outputUrl);
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

      // Check if file exists
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

    // Check if the response is actually an image
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error('[urlToBase64] URL did not return an image:', url, 'Content-Type:', contentType);
      return null;
    }

    const buffer = await response.arrayBuffer();
    // Clean up content-type (remove charset, duplicates, etc.)
    const mimeType = contentType.split(';')[0].split(',')[0].trim() || 'image/jpeg';
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  } catch (error) {
    console.error('[urlToBase64] Error converting URL to base64:', error, 'URL:', url);
    return null;
  }
}

/**
 * Generate caption for product using brand's verbal style
 */
async function generateCaptionForProduct(
  productAnalysis: ProductAnalysis,
  verbalDNA: VerbalDNA
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const productDesc = productAnalysis.name || productAnalysis.description ||
                      `${productAnalysis.subcategory} ${productAnalysis.style}`;

  const languageMap: Record<string, string> = {
    'english': 'Write the caption in ENGLISH',
    'french': 'Write the caption in FRENCH',
    'french_wolof_mix': 'Write the caption in FRENCH with occasional Wolof expressions',
    'wolof_dominant': 'Write the caption in WOLOF with French words mixed in',
    'arabic_mix': 'Write the caption in FRENCH/ARABIC mix as appropriate',
  };

  const primaryLanguage = verbalDNA.primary_language || 'french';
  const languageInstruction = languageMap[primaryLanguage] || 'Write the caption in the same language as the examples';

  let emojiInstruction = '';
  if (verbalDNA.emoji_palette && verbalDNA.emoji_palette.length > 0) {
    const emojiCount = verbalDNA.emoji_frequency === 'heavy' ? '3-5' :
                       verbalDNA.emoji_frequency === 'moderate' ? '1-2' :
                       verbalDNA.emoji_frequency === 'minimal' ? '0-1' : '0';
    emojiInstruction = `Use ${emojiCount} emojis, ONLY from this set: ${verbalDNA.emoji_palette.join(' ')}`;
  } else {
    emojiInstruction = verbalDNA.emoji_frequency === 'none' ? 'Do NOT use any emojis' : 'Use emojis sparingly';
  }

  const lengthMap: Record<string, string> = {
    'short': 'Keep it SHORT - 1-2 sentences max, under 50 words',
    'medium': 'Medium length - 3-5 sentences, around 50-100 words',
    'long': 'Longer storytelling style - can be 100+ words if authentic to brand',
  };
  const lengthInstruction = lengthMap[verbalDNA.typical_length] || lengthMap['short'];

  const structureMap: Record<string, string> = {
    'storytelling': 'Use a narrative/storytelling approach',
    'bullet_points': 'Use bullet points or list format',
    'short_punchline': 'Short punchy statement, impactful',
    'question_hook': 'Start with an engaging question',
    'quote_based': 'Include a quote or testimonial style',
  };
  const structureInstruction = structureMap[verbalDNA.caption_structure] || '';

  let hashtagInstruction = '';
  if (verbalDNA.signature_hashtags && verbalDNA.signature_hashtags.length > 0) {
    if (verbalDNA.uses_hashtags_in_caption) {
      hashtagInstruction = `Include these hashtags: #${verbalDNA.signature_hashtags.slice(0, 4).join(' #')}`;
    } else {
      hashtagInstruction = 'Hashtags should be added separately, not in the main caption';
    }
  }

  let fewShotExamples = '';
  const exemplars = verbalDNA.exemplars && verbalDNA.exemplars.length > 0
    ? verbalDNA.exemplars
    : verbalDNA.example_captions?.slice(0, 3) || [];

  if (exemplars.length > 0) {
    fewShotExamples = `
LEARN FROM THEIR ACTUAL CAPTIONS (Mimic this exact style):

${exemplars.map((caption, i) => `Example ${i + 1}:
"${caption}"
`).join('\n')}

Your caption MUST sound like it was written by the same person who wrote these examples.
Do NOT be generic. Be authentic to the examples above.`;
  }

  const prompt = `You are a copywriter who has mastered mimicking a specific brand's voice.
Write an Instagram caption for this product that sounds EXACTLY like the brand's existing content.

PRODUCT TO PROMOTE:
${productDesc}
${productAnalysis.colors?.length ? `Colors: ${productAnalysis.colors.join(', ')}` : ''}
${productAnalysis.materials?.length ? `Materials: ${productAnalysis.materials.join(', ')}` : ''}

CRITICAL STYLE INSTRUCTIONS:
- ${languageInstruction}
- Tone: ${verbalDNA.tone}
- ${emojiInstruction}
- ${lengthInstruction}
${structureInstruction ? `- ${structureInstruction}` : ''}
${verbalDNA.formatting_quirks ? `- Formatting: ${verbalDNA.formatting_quirks}` : ''}
${verbalDNA.cta_style ? `- Call-to-action style: ${verbalDNA.cta_style}` : ''}
${hashtagInstruction ? `- ${hashtagInstruction}` : ''}
${fewShotExamples}

RULES:
1. Do NOT include quotation marks around the caption
2. Do NOT explain what you're doing - just output the caption
3. Sound HUMAN, not like AI - use natural language patterns from the examples
4. Capture the brand's personality exactly as shown in the examples

Generate the caption now:`;

  console.log(`[CAPTION] Generating in ${primaryLanguage} with ${exemplars.length} exemplars`);

  const result = await model.generateContent(prompt);
  const caption = result.response.text().trim();

  return caption.replace(/^["']|["']$/g, '').replace(/^Caption:\s*/i, '');
}
