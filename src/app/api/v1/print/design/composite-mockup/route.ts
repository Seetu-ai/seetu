import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

interface MockupZone {
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface MockupData {
  id: string;
  product_id: string;
  mockup_url: string;
  zones: MockupZone[];
}

/**
 * Fetch image as buffer from URL
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * POST /api/v1/print/design/composite-mockup - Composite a design onto a product mockup
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
    const { product_id, mockup_id, design_url, print_area = 'front' } = body;

    if (!design_url) {
      return NextResponse.json(
        { error: 'design_url is required' },
        { status: 400 }
      );
    }

    if (!product_id && !mockup_id) {
      return NextResponse.json(
        { error: 'product_id or mockup_id is required' },
        { status: 400 }
      );
    }

    // Get mockup from database
    let mockup: MockupData | null = null;

    if (mockup_id) {
      // Direct mockup ID provided
      const { data } = await supabase
        .from('print_product_mockups')
        .select('*')
        .eq('id', mockup_id)
        .eq('is_active', true)
        .single();

      mockup = data as MockupData | null;
    } else if (product_id) {
      // Find mockup by product and print area
      const { data } = await supabase
        .from('print_product_mockups')
        .select('*')
        .eq('product_id', product_id)
        .eq('print_area', print_area)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .single();

      mockup = data as MockupData | null;
    }

    if (!mockup) {
      return NextResponse.json(
        { error: 'Mockup not found' },
        { status: 404 }
      );
    }

    if (!mockup.zones || mockup.zones.length === 0) {
      return NextResponse.json(
        { error: 'Mockup has no design zones configured' },
        { status: 400 }
      );
    }

    console.log(`[COMPOSITE] Using mockup: ${mockup.id}`);
    console.log(`[COMPOSITE] Design URL: ${design_url}`);

    // Download mockup and design images
    const [mockupBuffer, designBuffer] = await Promise.all([
      fetchImageBuffer(mockup.mockup_url),
      fetchImageBuffer(design_url),
    ]);

    console.log(`[COMPOSITE] Images loaded`);

    // Get mockup dimensions
    const mockupMetadata = await sharp(mockupBuffer).metadata();
    const mockupWidth = mockupMetadata.width || 800;
    const mockupHeight = mockupMetadata.height || 800;

    // Use the first zone for compositing
    const zone = mockup.zones[0];
    console.log(`[COMPOSITE] Zone: ${zone.label} at (${zone.x}, ${zone.y}) ${zone.width}x${zone.height}`);

    // Resize design to fit the zone
    let processedDesign = sharp(designBuffer);

    // Resize design to fit zone dimensions
    processedDesign = processedDesign.resize(zone.width, zone.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    // Apply rotation if specified
    if (zone.rotation) {
      processedDesign = processedDesign.rotate(zone.rotation, {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    const designResizedBuffer = await processedDesign.png().toBuffer();

    // Composite design onto mockup
    const compositedBuffer = await sharp(mockupBuffer)
      .composite([
        {
          input: designResizedBuffer,
          top: zone.y,
          left: zone.x,
          blend: 'over' as const,
        },
      ])
      .png()
      .toBuffer();

    console.log(`[COMPOSITE] Composite created`);

    // Upload composited image to Supabase Storage
    const filename = `${user.id}/composites/${uuidv4()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('print-designs')
      .upload(filename, compositedBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error(`[COMPOSITE] Upload error:`, uploadError);

      // Try to create bucket if it doesn't exist
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        console.log(`[COMPOSITE] Creating print-designs bucket...`);
        await supabase.storage.createBucket('print-designs', {
          public: true,
        });

        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from('print-designs')
          .upload(filename, compositedBuffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (retryError) {
          console.error(`[COMPOSITE] Retry failed:`, retryError);
          return NextResponse.json(
            { error: 'Failed to save composite image' },
            { status: 500 }
          );
        }

        if (retryData) {
          const { data: { publicUrl } } = supabase.storage
            .from('print-designs')
            .getPublicUrl(retryData.path);

          return NextResponse.json({
            mockup_url: publicUrl,
            product_id: mockup.product_id,
            mockup_id: mockup.id,
            zone: zone.name,
          });
        }
      }

      return NextResponse.json(
        { error: 'Failed to save composite image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('print-designs')
      .getPublicUrl(uploadData.path);

    console.log(`[COMPOSITE] Saved to: ${publicUrl}`);

    return NextResponse.json({
      mockup_url: publicUrl,
      product_id: mockup.product_id,
      mockup_id: mockup.id,
      zone: zone.name,
    });
  } catch (error) {
    console.error('[COMPOSITE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create composite mockup' },
      { status: 500 }
    );
  }
}
