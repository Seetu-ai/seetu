import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SocialSource } from '@/types';

// APIfy Actor IDs for different platforms
const APIFY_ACTORS = {
  instagram: 'apify~instagram-profile-scraper',
  tiktok: 'clockworks~tiktok-scraper',
  facebook: 'apify~facebook-pages-scraper',
};

const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';

interface ApifyInstagramPost {
  displayUrl?: string;
  url?: string;
  type?: string;
  thumbnailSrc?: string;
  caption?: string;
}

interface ApifyTikTokPost {
  videoMeta?: {
    coverUrl?: string;
  };
  covers?: string[];
  imagePost?: {
    images?: { imageUrl?: string }[];
  };
  text?: string;
  desc?: string;
}

interface ApifyFacebookPost {
  media?: { thumbnail?: string; url?: string }[];
  postImages?: string[];
  text?: string;
  message?: string;
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
    const { platform, handle } = body as { platform: SocialSource; handle: string };

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'Plateforme et handle requis' },
        { status: 400 }
      );
    }

    if (platform === 'photos') {
      return NextResponse.json(
        { error: 'Utilisez l\'upload pour les photos' },
        { status: 400 }
      );
    }

    // Clean the handle (remove @ if present)
    const cleanHandle = handle.replace(/^@/, '').trim();

    if (!cleanHandle) {
      return NextResponse.json(
        { error: 'Handle invalide' },
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

    // Call the appropriate APIfy actor based on platform
    let images: string[] = [];
    let captions: string[] = [];
    let profileData: { bio?: string; profilePicUrl?: string; postsCount?: number; followersCount?: number } = {};

    if (platform === 'instagram') {
      const result = await scrapeInstagram(cleanHandle, apifyToken);
      images = result.images;
      captions = result.captions;
      profileData = result.profileData;
    } else if (platform === 'tiktok') {
      const result = await scrapeTikTok(cleanHandle, apifyToken);
      images = result.images;
      captions = result.captions;
      profileData = result.profileData;
    } else if (platform === 'facebook') {
      const result = await scrapeFacebook(cleanHandle, apifyToken);
      images = result.images;
      captions = result.captions;
      profileData = result.profileData;
    }

    if (images.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Profil non trouvé ou pas assez de photos publiques',
        platform,
        handle: cleanHandle,
        images: [],
        captions: []
      });
    }

    return NextResponse.json({
      success: true,
      platform,
      handle: cleanHandle,
      profilePicUrl: profileData.profilePicUrl,
      bio: profileData.bio,
      postsCount: profileData.postsCount,
      followersCount: profileData.followersCount,
      images,
      captions,
    });

  } catch (error) {
    console.error('Social scrape error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// Instagram scraper
async function scrapeInstagram(handle: string, token: string) {
  const actorUrl = `${APIFY_BASE_URL}/${APIFY_ACTORS.instagram}/run-sync-get-dataset-items`;

  console.log(`[SOCIAL] Calling Apify for Instagram @${handle}`);

  const response = await fetch(actorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({
      usernames: [handle],
      resultsLimit: 12,
      resultsType: 'posts',
      addParentData: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[SOCIAL] Apify error ${response.status}:`, errText.slice(0, 200));
    throw new Error(`Instagram scrape failed: ${response.status}`);
  }

  const data = await response.json();
  const images: string[] = [];
  const captions: string[] = [];
  let profileData: any = {};

  if (Array.isArray(data)) {
    // Extract profile data from first item if available
    if (data[0]) {
      profileData = {
        profilePicUrl: data[0].profilePicUrlHD || data[0].profilePicUrl,
        bio: data[0].biography,
        postsCount: data[0].postsCount,
        followersCount: data[0].followersCount,
      };
    }

    // Extract images and captions
    for (const item of data) {
      if (item.displayUrl && images.length < 12) {
        images.push(item.displayUrl);
        // Extract caption for this post
        if (item.caption && captions.length < 12) {
          captions.push(item.caption);
        }
      } else if (item.thumbnailSrc && images.length < 12) {
        images.push(item.thumbnailSrc);
        if (item.caption && captions.length < 12) {
          captions.push(item.caption);
        }
      }
      // Check latestPosts array
      if (item.latestPosts && Array.isArray(item.latestPosts)) {
        for (const post of item.latestPosts) {
          if (post.displayUrl && images.length < 12) {
            images.push(post.displayUrl);
            if (post.caption && captions.length < 12) {
              captions.push(post.caption);
            }
          }
        }
      }
    }
  }

  return { images, captions, profileData };
}

// TikTok scraper
async function scrapeTikTok(handle: string, token: string) {
  const actorUrl = `${APIFY_BASE_URL}/${APIFY_ACTORS.tiktok}/run-sync-get-dataset-items`;

  const response = await fetch(actorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({
      profiles: [handle],
      resultsPerPage: 12,
      shouldDownloadVideos: false,
      shouldDownloadCovers: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[SOCIAL] TikTok error ${response.status}:`, errText.slice(0, 200));
    throw new Error(`TikTok scrape failed: ${response.status}`);
  }

  const data = await response.json();
  const images: string[] = [];
  const captions: string[] = [];
  let profileData: any = {};

  if (Array.isArray(data)) {
    for (const item of data) {
      // Get video cover images and captions
      if (item.videoMeta?.coverUrl && images.length < 12) {
        images.push(item.videoMeta.coverUrl);
        // Extract caption (text or desc)
        const caption = item.text || item.desc;
        if (caption && captions.length < 12) {
          captions.push(caption);
        }
      }
      if (item.covers && Array.isArray(item.covers)) {
        for (const cover of item.covers) {
          if (cover && images.length < 12) {
            images.push(cover);
          }
        }
      }
      // For image posts (TikTok photo carousels)
      if (item.imagePost?.images && Array.isArray(item.imagePost.images)) {
        for (const img of item.imagePost.images) {
          if (img.imageUrl && images.length < 12) {
            images.push(img.imageUrl);
          }
        }
        // Add caption for image post
        const caption = item.text || item.desc;
        if (caption && captions.length < 12) {
          captions.push(caption);
        }
      }
      // Extract profile data
      if (item.authorMeta && !profileData.profilePicUrl) {
        profileData = {
          profilePicUrl: item.authorMeta.avatar,
          bio: item.authorMeta.signature,
          followersCount: item.authorMeta.fans,
        };
      }
    }
  }

  return { images, captions, profileData };
}

// Facebook scraper
async function scrapeFacebook(handle: string, token: string) {
  const actorUrl = `${APIFY_BASE_URL}/${APIFY_ACTORS.facebook}/run-sync-get-dataset-items`;

  const response = await fetch(actorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({
      startUrls: [{ url: `https://www.facebook.com/${handle}` }],
      resultsLimit: 12,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[SOCIAL] Facebook error ${response.status}:`, errText.slice(0, 200));
    throw new Error(`Facebook scrape failed: ${response.status}`);
  }

  const data = await response.json();
  const images: string[] = [];
  const captions: string[] = [];
  let profileData: any = {};

  if (Array.isArray(data)) {
    for (const item of data) {
      // Extract caption from post
      const caption = item.text || item.message;

      // Extract images from posts
      if (item.media && Array.isArray(item.media)) {
        for (const m of item.media) {
          if ((m.thumbnail || m.url) && images.length < 12) {
            images.push(m.thumbnail || m.url);
          }
        }
        // Add caption for this post
        if (caption && captions.length < 12) {
          captions.push(caption);
        }
      }
      if (item.postImages && Array.isArray(item.postImages)) {
        for (const img of item.postImages) {
          if (img && images.length < 12) {
            images.push(img);
          }
        }
        // Add caption for this post
        if (caption && captions.length < 12) {
          captions.push(caption);
        }
      }
      // Extract profile data
      if (item.pageName && !profileData.bio) {
        profileData = {
          profilePicUrl: item.profilePicture,
          bio: item.about || item.pageName,
          followersCount: item.likes,
        };
      }
    }
  }

  return { images, captions, profileData };
}
