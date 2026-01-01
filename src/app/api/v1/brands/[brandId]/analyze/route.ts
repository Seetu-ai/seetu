import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { analyzeBrand } from '@/lib/brand-analysis';
import { calculateEngagementScore } from '@/lib/performance-analysis';

// Instagram post data from Apify
interface ApifyInstagramPost {
  id?: string;
  displayUrl?: string;
  thumbnailSrc?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  videoPlayCount?: number;
  timestamp?: string;
  // Nested structure alternative
  latestPosts?: ApifyInstagramPost[];
}

interface RouteParams {
  params: Promise<{ brandId: string }>;
}

const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';
const APIFY_INSTAGRAM_ACTOR = 'apify~instagram-profile-scraper';

/**
 * POST /api/v1/brands/[brandId]/analyze - Analyze brand from Instagram
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId } = await params;

    // Check if brand exists and belongs to user
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        userId: user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Marque non trouvée' }, { status: 404 });
    }

    const body = await req.json();
    const { instagramHandle } = body as { instagramHandle?: string };

    const handle = instagramHandle || brand.instagramHandle;

    if (!handle) {
      return NextResponse.json(
        { error: 'Handle Instagram requis' },
        { status: 400 }
      );
    }

    // Clean handle
    const cleanHandle = handle.replace(/^@/, '').trim();

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      console.error('APIFY_API_TOKEN not configured');
      return NextResponse.json(
        { error: 'Service de scraping non configuré (APIFY_API_TOKEN manquant)' },
        { status: 500 }
      );
    }

    // Step 1: Fetch images from Instagram via Apify
    const cleanToken = apifyToken.trim();
    console.log(`[BRAND_ANALYZE] Fetching Instagram data for @${cleanHandle}, token starts with: ${cleanToken.slice(0, 10)}...`);
    const actorUrl = `${APIFY_BASE_URL}/${APIFY_INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(cleanToken)}`;

    let apifyRes;
    try {
      apifyRes = await fetch(actorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernames: [cleanHandle],
          resultsLimit: 12,
          resultsType: 'posts',
          addParentData: true,
        }),
      });
    } catch (fetchError) {
      console.error('Apify fetch error:', fetchError);
      return NextResponse.json(
        { error: `Erreur de connexion à Apify: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}` },
        { status: 500 }
      );
    }

    if (!apifyRes.ok) {
      const errorText = await apifyRes.text();
      console.error('Apify error:', apifyRes.status, errorText);
      return NextResponse.json(
        { error: `Erreur Apify (${apifyRes.status}): ${errorText.slice(0, 100)}` },
        { status: 500 }
      );
    }

    const apifyData = await apifyRes.json();

    // Extract images, captions, and engagement data
    const images: string[] = [];
    const captions: string[] = [];
    const postsData: Array<{
      instagramId?: string;
      imageUrl: string;
      caption?: string;
      likesCount: number;
      commentsCount: number;
      viewsCount: number;
      postedAt?: Date;
    }> = [];

    const processPost = (item: ApifyInstagramPost) => {
      const imageUrl = item.displayUrl || item.thumbnailSrc;
      if (imageUrl && images.length < 12) {
        images.push(imageUrl);
        if (item.caption) captions.push(item.caption);

        // Collect engagement data for performance analytics
        postsData.push({
          instagramId: item.id,
          imageUrl,
          caption: item.caption,
          likesCount: item.likesCount || 0,
          commentsCount: item.commentsCount || 0,
          viewsCount: item.videoPlayCount || 0,
          postedAt: item.timestamp ? new Date(item.timestamp) : undefined,
        });
      }
    };

    if (Array.isArray(apifyData)) {
      for (const item of apifyData) {
        processPost(item as ApifyInstagramPost);

        // Handle nested latestPosts structure
        const apifyItem = item as ApifyInstagramPost;
        if (apifyItem.latestPosts && Array.isArray(apifyItem.latestPosts)) {
          for (const post of apifyItem.latestPosts) {
            processPost(post);
          }
        }
      }
    }

    console.log(`[BRAND_ANALYZE] Found ${images.length} images, ${captions.length} captions`);

    if (images.length < 3) {
      return NextResponse.json(
        { error: 'Profil non trouvé ou pas assez de photos publiques' },
        { status: 400 }
      );
    }

    // Step 2: Analyze brand DNA using shared utility
    console.log(`[BRAND_ANALYZE] Analyzing brand DNA...`);
    const analyzeResult = await analyzeBrand({
      imageUrls: images,
      captions: captions.length >= 3 ? captions : undefined,
      source: 'instagram',
      socialHandle: cleanHandle,
    });

    if (!analyzeResult.success || !analyzeResult.brandDNA) {
      console.error('Brand analysis failed:', analyzeResult.error);
      return NextResponse.json(
        { error: analyzeResult.error || 'Erreur lors de l\'analyse' },
        { status: 500 }
      );
    }

    const brandDNA = analyzeResult.brandDNA;

    // Step 3: Update brand with DNA
    console.log(`[BRAND_ANALYZE] Updating brand with DNA...`);
    const updatedBrand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        instagramHandle: cleanHandle,
        visualDNA: {
          source: brandDNA.source,
          socialHandle: brandDNA.socialHandle,
          sourceImageUrls: brandDNA.sourceImageUrls,
          analyzedAt: brandDNA.analyzedAt,
          palette: brandDNA.palette,
          visual_tokens: brandDNA.visual_tokens,
          photography_settings: brandDNA.photography_settings,
          voice_profile: brandDNA.voice_profile,
          vibe_summary: brandDNA.vibe_summary,
          analysis_summary_fr: brandDNA.analysis_summary_fr,
        } as unknown as Prisma.InputJsonValue,
        verbalDNA: brandDNA.verbal_dna ? brandDNA.verbal_dna as unknown as Prisma.InputJsonValue : undefined,
        analyzedAt: new Date(),
      },
    });

    console.log(`[BRAND_ANALYZE] Success! Brand ${brandId} updated`);

    // Step 4: Save Instagram posts with engagement data for performance analytics
    console.log(`[BRAND_ANALYZE] Saving ${postsData.length} Instagram posts with engagement data...`);

    for (const postData of postsData) {
      const engagementScore = calculateEngagementScore(
        postData.likesCount,
        postData.commentsCount,
        postData.viewsCount
      );

      // Extract visual tokens from the brand DNA analysis for this post
      // We'll use the overall brand visual tokens for now
      const visualTokens = brandDNA.visual_tokens || [];

      await prisma.instagramPost.upsert({
        where: {
          brandId_instagramId: {
            brandId,
            instagramId: postData.instagramId || postData.imageUrl,
          },
        },
        update: {
          imageUrl: postData.imageUrl,
          caption: postData.caption,
          likesCount: postData.likesCount,
          commentsCount: postData.commentsCount,
          viewsCount: postData.viewsCount,
          engagementScore,
          postedAt: postData.postedAt,
          visualTokens,
          lighting: brandDNA.photography_settings?.lighting,
          framing: brandDNA.photography_settings?.framing,
          scrapedAt: new Date(),
        },
        create: {
          brandId,
          instagramId: postData.instagramId || postData.imageUrl,
          imageUrl: postData.imageUrl,
          caption: postData.caption,
          likesCount: postData.likesCount,
          commentsCount: postData.commentsCount,
          viewsCount: postData.viewsCount,
          engagementScore,
          postedAt: postData.postedAt,
          visualTokens,
          lighting: brandDNA.photography_settings?.lighting,
          framing: brandDNA.photography_settings?.framing,
        },
      });
    }

    console.log(`[BRAND_ANALYZE] Saved ${postsData.length} Instagram posts`);

    return NextResponse.json({
      success: true,
      brand: updatedBrand,
      imagesAnalyzed: images.length,
      postsWithEngagement: postsData.length,
    });
  } catch (error) {
    console.error('Error analyzing brand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
