import prisma from './prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCleanReferenceUrl } from './image-processing';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

interface GenerationParams {
  jobId: string;
  productId: string;
  templateId: string;
  workspaceId: string;
}

/**
 * Build the final prompt from template
 */
function buildPrompt(template: { prompt: string }, product: { name: string | null }): string {
  let prompt = template.prompt;
  prompt = prompt.replace(/\{\{product\}\}/g, product.name || 'the product');
  return prompt;
}

/**
 * Convert image URL to base64 for Gemini
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Handle local URLs
    if (url.startsWith('/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', url);
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(url).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      return { data: buffer.toString('base64'), mimeType };
    }

    // Handle remote URLs
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Generate image using Gemini API
 */
async function generateWithGemini(
  prompt: string,
  negativePrompt: string | null,
  productImageUrl: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  if (!genAI) {
    return { success: false, error: 'Gemini API not configured' };
  }

  try {
    // Get the Gemini model with image generation capability
    // Nano Banana 3 (Gemini 3 Pro Image)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

    // Get product image as base64
    const productImage = await imageUrlToBase64(productImageUrl);

    // Build the full prompt with STRONG product reproduction instructions
    let fullPrompt = `You are a professional product photographer. Generate a new product photo.

CRITICAL - PRODUCT REPRODUCTION:
The image provided is the ACTUAL PRODUCT you must reproduce. This is NOT a style reference.
You MUST:
1. COPY the EXACT product - same shape, colors, labels, brand, design
2. Keep every detail identical: logos, text, patterns, materials, proportions
3. Do NOT redesign or create a different product
4. The product in your output must be RECOGNIZABLE as the SAME product

SCENE/STYLE: ${prompt}

${negativePrompt ? `AVOID: ${negativePrompt}` : ''}

OUTPUT: Place the EXACT product from the reference image into the described setting with professional lighting. The product must remain identical to the original.`;

    // Create the request with image context if available
    let result;
    if (productImage) {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: productImage.mimeType,
            data: productImage.data,
          },
        },
        fullPrompt,
      ]);
    } else {
      result = await model.generateContent(fullPrompt);
    }

    const response = result.response;

    // Check for image in response
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content?.parts || [];

      for (const part of parts) {
        if ((part as any).inlineData) {
          const inlineData = (part as any).inlineData;
          return {
            success: true,
            imageBase64: inlineData.data,
          };
        }
      }
    }

    return { success: false, error: 'No image generated in response' };

  } catch (error) {
    console.error('Gemini generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process a generation job
 */
export async function processGenerationSync(params: GenerationParams): Promise<{
  success: boolean;
  outputUrl?: string;
  error?: string;
}> {
  const { jobId } = params;

  try {
    // Update job status to processing
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    // Get job details with relations
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        product: true,
        template: true,
        shoot: true,
      },
    });

    if (!job || !job.template) {
      throw new Error('Job or template not found');
    }

    let outputUrl: string;
    let seedUsed = Math.floor(Math.random() * 1000000);

    // Check if Gemini API is configured
    const isGeminiConfigured = GEMINI_API_KEY && !GEMINI_API_KEY.includes('example');

    if (isGeminiConfigured && job.product?.originalUrl) {
      // Use Gemini for AI generation
      const prompt = buildPrompt(job.template, job.product);

      console.log('[GENERATION] Generating image with prompt:', prompt.substring(0, 100) + '...');

      // Prepare clean reference image (removes other products/background)
      let referenceUrl = job.product.originalUrl;
      const metadata = job.product.metadata as any;

      if (metadata?.bbox) {
        try {
          console.log('[GENERATION] Preparing clean reference image...');
          referenceUrl = await getCleanReferenceUrl(
            job.product.originalUrl,
            job.product.id,
            metadata.bbox,
            metadata.svgPath
          );
          console.log('[GENERATION] Clean reference created:', referenceUrl);
        } catch (error) {
          console.warn('[GENERATION] Failed to create clean reference, using original:', error);
        }
      }

      const result = await generateWithGemini(
        prompt,
        job.template.negativePrompt,
        referenceUrl  // Use clean reference instead of original
      );

      if (result.success && result.imageBase64) {
        // Save generated image locally
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const fs = await import('fs/promises');
        const path = await import('path');

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'generations');
        await fs.mkdir(uploadDir, { recursive: true });

        const buffer = Buffer.from(result.imageBase64, 'base64');
        await fs.writeFile(path.join(uploadDir, filename), buffer);

        outputUrl = `/uploads/generations/${filename}`;
        console.log('[NANO BANANA PRO] Image saved to:', outputUrl);
      } else {
        console.warn('[NANO BANANA PRO] Generation failed:', result.error);
        // Fallback to original image
        outputUrl = job.product.thumbnailUrl || job.product.originalUrl;
      }

    } else {
      // Development mode without API: Return original image
      outputUrl = job.product?.thumbnailUrl || job.product?.originalUrl || '/placeholder-generation.jpg';
      console.log('[DEV MODE] Gemini API not configured. Using original image as placeholder.');
    }

    // Update job as completed
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        outputUrl,
        seedUsed,
        promptUsed: job.template.prompt,
        completedAt: new Date(),
      },
    });

    // Update shoot progress
    await prisma.shoot.update({
      where: { id: job.shootId },
      data: {
        completedJobs: { increment: 1 },
        status: 'completed',
      },
    });

    return { success: true, outputUrl };

  } catch (error) {
    console.error('Generation error:', error);

    // Mark job as failed
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if generation should run synchronously (dev mode without Redis)
 */
export function shouldRunSync(): boolean {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  return !redisUrl || redisUrl.includes('example');
}
