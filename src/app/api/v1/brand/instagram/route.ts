import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// APIfy Instagram Scraper endpoint
const APIFY_API_URL = 'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items';

interface ApifyInstagramPost {
  displayUrl?: string;
  url?: string;
  type?: string;
  thumbnailSrc?: string;
}

interface ApifyInstagramProfile {
  username?: string;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  biography?: string;
  postsCount?: number;
  followersCount?: number;
  latestPosts?: ApifyInstagramPost[];
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { handle } = body;

    if (!handle) {
      return NextResponse.json(
        { error: 'Handle Instagram requis' },
        { status: 400 }
      );
    }

    // Clean the handle (remove @ if present)
    const cleanHandle = handle.replace(/^@/, '').trim();

    if (!cleanHandle) {
      return NextResponse.json(
        { error: 'Handle Instagram invalide' },
        { status: 400 }
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apifyToken) {
      console.error('APIFY_API_TOKEN not configured');
      return NextResponse.json(
        { error: 'Service de scraping non configuré' },
        { status: 500 }
      );
    }

    // Call APIfy Instagram scraper
    const apifyResponse = await fetch(`${APIFY_API_URL}?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [cleanHandle],
        resultsLimit: 12, // Get up to 12 posts
        resultsType: 'posts',
        addParentData: true,
      }),
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('APIfy error:', errorText);
      return NextResponse.json(
        { error: 'Impossible de récupérer le profil Instagram' },
        { status: 500 }
      );
    }

    const apifyData: ApifyInstagramProfile[] = await apifyResponse.json();

    if (!apifyData || apifyData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Profil Instagram non trouvé ou privé',
          handle: cleanHandle,
          images: []
        }
      );
    }

    // Extract profile data
    const profile = apifyData[0];

    // Get image URLs from posts
    const images: string[] = [];

    // If we have latestPosts, extract images
    if (profile.latestPosts && Array.isArray(profile.latestPosts)) {
      for (const post of profile.latestPosts) {
        if (post.displayUrl && images.length < 12) {
          images.push(post.displayUrl);
        } else if (post.thumbnailSrc && images.length < 12) {
          images.push(post.thumbnailSrc);
        }
      }
    }

    // If no images from posts, try to get from direct array response
    if (images.length === 0 && Array.isArray(apifyData)) {
      for (const item of apifyData) {
        const post = item as unknown as ApifyInstagramPost;
        if (post.displayUrl && images.length < 12) {
          images.push(post.displayUrl);
        }
      }
    }

    return NextResponse.json({
      success: true,
      handle: cleanHandle,
      profilePicUrl: profile.profilePicUrlHD || profile.profilePicUrl,
      bio: profile.biography,
      postsCount: profile.postsCount,
      followersCount: profile.followersCount,
      images,
    });

  } catch (error) {
    console.error('Instagram scrape error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}
