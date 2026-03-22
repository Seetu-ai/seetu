import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

interface MockupData {
  id: string;
  mockup_url: string;
  print_area: string;
  zones: Array<{
    name: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Convert URL to base64 for Gemini
 */
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const [header, data] = url.split(',');
      let mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      if (mimeType === 'image/jpg') {
        mimeType = 'image/jpeg';
      }
      return { data, mimeType };
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[DESIGN] Failed to fetch image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = buffer.toString('base64');
    let mimeType = response.headers.get('content-type') || 'image/jpeg';
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }

    return { data, mimeType };
  } catch (error) {
    console.error(`[DESIGN] Error converting URL to base64:`, error);
    return null;
  }
}

/**
 * Find a product by name (fuzzy match)
 */
async function findProductByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productName: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const name = productName.toLowerCase();

  // Try to match by slug first
  const slugPatterns = [
    name.replace(/\s+/g, '-'),
    name.replace(/\s+/g, ''),
  ];

  for (const pattern of slugPatterns) {
    const { data } = await supabase
      .from('print_products')
      .select('id, name, slug')
      .ilike('slug', `%${pattern}%`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (data) return data;
  }

  // Try by name
  const { data } = await supabase
    .from('print_products')
    .select('id, name, slug')
    .or(`name.ilike.%${name}%,name_fr.ilike.%${name}%`)
    .eq('is_active', true)
    .limit(1)
    .single();

  return data;
}

/**
 * Get default mockup for a product
 */
async function getDefaultMockup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<MockupData | null> {
  // Try to get default mockup first
  const { data: defaultMockup } = await supabase
    .from('print_product_mockups')
    .select('*')
    .eq('product_id', productId)
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (defaultMockup) return defaultMockup as MockupData;

  // Fall back to first mockup
  const { data: firstMockup } = await supabase
    .from('print_product_mockups')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();

  return firstMockup as MockupData | null;
}

/**
 * Create a mockup preview by compositing design onto product mockup
 */
async function createMockupPreview(
  designUrl: string,
  mockup: MockupData,
  mockupImageData: { data: string; mimeType: string },
  userId: string,
  serviceClient: ReturnType<typeof createServiceClient>
): Promise<string | null> {
  try {
    if (!mockup.zones || mockup.zones.length === 0) {
      console.log('[DESIGN] No zones defined for mockup');
      return null;
    }

    const zone = mockup.zones[0];
    console.log(`[DESIGN] Creating mockup preview with zone: ${zone.label}`);

    // Download the design image
    const designResponse = await fetch(designUrl);
    if (!designResponse.ok) {
      console.error('[DESIGN] Failed to fetch design for composite');
      return null;
    }
    const designBuffer = Buffer.from(await designResponse.arrayBuffer());

    // Get mockup buffer from base64
    const mockupBuffer = Buffer.from(mockupImageData.data, 'base64');

    // Resize design to fit the zone
    const designResized = await sharp(designBuffer)
      .resize(zone.width, zone.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Composite design onto mockup
    const compositedBuffer = await sharp(mockupBuffer)
      .composite([
        {
          input: designResized,
          top: zone.y,
          left: zone.x,
          blend: 'over' as const,
        },
      ])
      .png()
      .toBuffer();

    // Upload composited image
    const filename = `${userId}/mockup-previews/${uuidv4()}.png`;
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('print-designs')
      .upload(filename, compositedBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[DESIGN] Failed to upload mockup preview:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from('print-designs')
      .getPublicUrl(uploadData.path);

    console.log(`[DESIGN] Mockup preview created: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[DESIGN] Error creating mockup preview:', error);
    return null;
  }
}

/**
 * POST /api/v1/print/design/generate - Generate AI designs for print products
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { product_name, prompt, num_variations = 3 } = body;

    if (!product_name) {
      return NextResponse.json(
        { error: 'product_name is required' },
        { status: 400 }
      );
    }

    if (!genAI) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Find the product by name
    const product = await findProductByName(supabase, product_name);
    let mockup: MockupData | null = null;
    let mockupImageData: { data: string; mimeType: string } | null = null;

    if (product) {
      console.log(`[DESIGN] Found product: ${product.name} (${product.id})`);

      // Get the default mockup for this product
      mockup = await getDefaultMockup(supabase, product.id);

      if (mockup) {
        console.log(`[DESIGN] Found mockup: ${mockup.mockup_url}`);

        // Download mockup image as base64
        mockupImageData = await urlToBase64(mockup.mockup_url);
        if (mockupImageData) {
          console.log(`[DESIGN] Mockup image loaded successfully`);
        }
      } else {
        console.log(`[DESIGN] No mockup found for product ${product.id}`);
      }
    } else {
      console.log(`[DESIGN] Product not found for name: ${product_name}`);
    }

    // Build design prompt based on product type
    const designPrompt = buildDesignPrompt(product_name, prompt, mockup);

    // Generate multiple design variations
    const designs: { id: string; image_url: string; prompt: string }[] = [];

    // Use the exact same model and config that Seetu uses for product photos
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        // Match studio config for image generation
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '2K',
        },
      } as unknown as Record<string, unknown>,
    });

    console.log(`[DESIGN] Using model: gemini-3-pro-image-preview`);
    console.log(`[DESIGN] Product: ${product_name}, Has mockup: ${!!mockupImageData}`);

    const serviceClient = createServiceClient();

    for (let i = 0; i < Math.min(num_variations, 3); i++) {
      try {
        const variationPrompt = `${designPrompt}\n\nVariation ${i + 1}: Create a unique design variant with a different style or approach.`;

        console.log(`[DESIGN] Generating variation ${i + 1} for ${product_name}`);

        // Single API call: Generate photorealistic product mockup with design
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        if (mockupImageData) {
          // Add product mockup as reference
          parts.push({
            inlineData: {
              mimeType: mockupImageData.mimeType,
              data: mockupImageData.data,
            },
          });

          parts.push({
            text: `REFERENCE: The image above shows a ${product_name}.

TASK: Generate a PHOTOREALISTIC product photo of this same ${product_name} with a custom design printed/applied on it.

DESIGN TO CREATE:
${variationPrompt}

REQUIREMENTS:
- Generate the COMPLETE PRODUCT with the design NATURALLY PRINTED on it
- Same product style, angle, and lighting as the reference
- Design should look PRINTED/EMBROIDERED - not like a sticker pasted on
- Professional e-commerce product photo quality
- Design integrated with product texture and curves`
          });
        } else {
          parts.push({
            text: `Generate a photorealistic product photo of a ${product_name} with a custom design.

DESIGN TO CREATE:
${variationPrompt}

Generate a professional e-commerce product photo showing the ${product_name} with this design naturally printed/applied on it.`
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await model.generateContent(parts as any);
        const responseParts = result.response.candidates?.[0]?.content?.parts || [];

        for (const part of responseParts) {
          const partAny = part as { inlineData?: { data: string; mimeType: string } };
          if (partAny.inlineData) {
            const imageData = partAny.inlineData.data;
            const mimeType = partAny.inlineData.mimeType || 'image/png';

            const filename = `${user.id}/designs/${uuidv4()}.png`;
            const buffer = Buffer.from(imageData, 'base64');

            const { data: uploadData, error: uploadError } = await serviceClient.storage
              .from('print-designs')
              .upload(filename, buffer, { contentType: mimeType, upsert: false });

            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = serviceClient.storage
                .from('print-designs')
                .getPublicUrl(uploadData.path);

              console.log(`[DESIGN] Uploaded: ${publicUrl}`);
              designs.push({
                id: uuidv4(),
                image_url: publicUrl,
                prompt: variationPrompt,
              });
            }
            break;
          }
        }
      } catch (genError) {
        console.error(`[DESIGN] Generation error for variation ${i}:`, genError);
      }
    }

    if (designs.length === 0) {
      console.error('[DESIGN] No designs generated after all attempts');
      return NextResponse.json(
        {
          error: 'Failed to generate designs. The AI image generation service may be unavailable.',
          detail: 'No images were returned from the AI model. Try again in a few moments.',
        },
        { status: 500 }
      );
    }

    // Return both artwork (print-ready) and mockup (preview) URLs
    return NextResponse.json({
      designs,
      product_name,
      product_id: product?.id,
      mockup_id: mockup?.id,
    });
  } catch (error) {
    console.error('[DESIGN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate designs' },
      { status: 500 }
    );
  }
}

/**
 * Build a design prompt based on product type and mockup info
 */
function buildDesignPrompt(productName: string, userPrompt?: string, mockup?: MockupData | null): string {
  const name = productName.toLowerCase();

  let basePrompt = '';
  let printAreaInfo = '';

  // Add print area context if mockup zones are available
  if (mockup?.zones && mockup.zones.length > 0) {
    const zone = mockup.zones[0];
    printAreaInfo = `\nPrint area: ${zone.label} (${zone.width}x${zone.height}px region)`;
  }

  if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('polo')) {
    basePrompt = `Create a professional print-ready design for a ${productName}.${printAreaInfo}
Design requirements:
- Clean, vector-style graphics suitable for screen printing or DTG
- Bold, readable text if any
- Limited color palette (3-4 colors max) for printing efficiency
- High contrast design that works on light and dark fabric
- Isolated design element suitable for printing (no background)
- Modern, trendy street-style aesthetics`;
  } else if (name.includes('casquette') || name.includes('cap')) {
    basePrompt = `Create a professional embroidery-ready design for a ${productName}.${printAreaInfo}
Design requirements:
- Simple, bold design suitable for embroidery
- Limited colors (max 5 thread colors)
- Clean lines without fine details
- Logo or icon style - no photographs
- Compact design that fits on cap front panel`;
  } else if (name.includes('flyer') || name.includes('affiche') || name.includes('carte')) {
    basePrompt = `Create a professional print design for ${productName}.${printAreaInfo}
Design requirements:
- Modern, clean layout
- Professional typography
- Eye-catching but not cluttered
- CMYK-friendly colors
- Clear visual hierarchy`;
  } else if (name.includes('roll-up') || name.includes('bâche') || name.includes('bache')) {
    basePrompt = `Create a professional large format design for ${productName}.${printAreaInfo}
Design requirements:
- Bold, readable from distance
- Large text and graphics
- High contrast colors
- Professional corporate style
- Clear message/branding`;
  } else {
    basePrompt = `Create a professional print-ready design for ${productName}.${printAreaInfo}
Design requirements:
- Clean, professional appearance
- Suitable for commercial printing
- Good visual impact
- Balanced composition`;
  }

  if (userPrompt) {
    basePrompt += `\n\nAdditional requirements: ${userPrompt}`;
  }

  return basePrompt;
}
