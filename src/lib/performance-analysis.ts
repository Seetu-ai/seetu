/**
 * Performance Analysis for Instagram Posts
 * Correlates visual styles with engagement metrics to generate recommendations
 */

import type { InstagramPost } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface EngagementMetrics {
  totalPosts: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
  topPerformers: PostPerformance[];
}

export interface PostPerformance {
  id: string;
  imageUrl: string;
  engagementScore: number;
  likesCount: number;
  commentsCount: number;
  visualTokens: string[];
  lighting?: string | null;
  framing?: string | null;
}

export interface TokenPerformance {
  token: string;
  avgEngagement: number;
  postCount: number;
  improvement: number;  // Percentage vs overall average
}

export interface StyleRecommendation {
  type: 'lighting' | 'framing' | 'style' | 'general';
  titleFr: string;
  descriptionFr: string;
  impact: 'high' | 'medium' | 'low';
  data?: {
    token?: string;
    improvement?: number;
  };
}

export interface PerformanceInsights {
  metrics: EngagementMetrics;
  tokenPerformance: TokenPerformance[];
  lightingPerformance: TokenPerformance[];
  framingPerformance: TokenPerformance[];
  recommendations: StyleRecommendation[];
  lastAnalyzedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate engagement score for a post
 * Formula: (likes + comments * 2) normalized
 */
export function calculateEngagementScore(
  likesCount: number,
  commentsCount: number,
  viewsCount?: number
): number {
  // Comments are weighted 2x because they indicate higher engagement
  const baseScore = likesCount + commentsCount * 2;

  // If we have views, calculate engagement rate
  if (viewsCount && viewsCount > 0) {
    return (baseScore / viewsCount) * 100;
  }

  return baseScore;
}

/**
 * Analyze posts to extract performance metrics
 */
export function analyzePostPerformance(posts: InstagramPost[]): EngagementMetrics {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      avgLikes: 0,
      avgComments: 0,
      avgEngagement: 0,
      topPerformers: [],
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.commentsCount, 0);

  // Calculate engagement scores
  const postsWithScores = posts.map((post) => ({
    id: post.id,
    imageUrl: post.imageUrl,
    engagementScore: post.engagementScore || calculateEngagementScore(
      post.likesCount,
      post.commentsCount,
      post.viewsCount
    ),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    visualTokens: post.visualTokens,
    lighting: post.lighting,
    framing: post.framing,
  }));

  // Sort by engagement and get top 5
  const topPerformers = [...postsWithScores]
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5);

  const avgEngagement = postsWithScores.reduce(
    (sum, p) => sum + p.engagementScore, 0
  ) / posts.length;

  return {
    totalPosts: posts.length,
    avgLikes: totalLikes / posts.length,
    avgComments: totalComments / posts.length,
    avgEngagement,
    topPerformers,
  };
}

/**
 * Analyze performance by visual token
 */
export function analyzeTokenPerformance(
  posts: InstagramPost[],
  overallAvgEngagement: number
): TokenPerformance[] {
  const tokenStats: Record<string, { totalEngagement: number; count: number }> = {};

  for (const post of posts) {
    const engagement = post.engagementScore || calculateEngagementScore(
      post.likesCount,
      post.commentsCount,
      post.viewsCount
    );

    for (const token of post.visualTokens) {
      if (!tokenStats[token]) {
        tokenStats[token] = { totalEngagement: 0, count: 0 };
      }
      tokenStats[token].totalEngagement += engagement;
      tokenStats[token].count++;
    }
  }

  return Object.entries(tokenStats)
    .map(([token, stats]) => {
      const avgEngagement = stats.totalEngagement / stats.count;
      const improvement = overallAvgEngagement > 0
        ? ((avgEngagement - overallAvgEngagement) / overallAvgEngagement) * 100
        : 0;

      return {
        token,
        avgEngagement,
        postCount: stats.count,
        improvement,
      };
    })
    .filter((t) => t.postCount >= 2)  // Only include tokens with 2+ posts
    .sort((a, b) => b.improvement - a.improvement);
}

/**
 * Analyze performance by lighting style
 */
export function analyzeLightingPerformance(
  posts: InstagramPost[],
  overallAvgEngagement: number
): TokenPerformance[] {
  const lightingStats: Record<string, { totalEngagement: number; count: number }> = {};

  for (const post of posts) {
    if (!post.lighting) continue;

    const engagement = post.engagementScore || calculateEngagementScore(
      post.likesCount,
      post.commentsCount,
      post.viewsCount
    );

    if (!lightingStats[post.lighting]) {
      lightingStats[post.lighting] = { totalEngagement: 0, count: 0 };
    }
    lightingStats[post.lighting].totalEngagement += engagement;
    lightingStats[post.lighting].count++;
  }

  return Object.entries(lightingStats)
    .map(([lighting, stats]) => {
      const avgEngagement = stats.totalEngagement / stats.count;
      const improvement = overallAvgEngagement > 0
        ? ((avgEngagement - overallAvgEngagement) / overallAvgEngagement) * 100
        : 0;

      return {
        token: lighting,
        avgEngagement,
        postCount: stats.count,
        improvement,
      };
    })
    .filter((t) => t.postCount >= 2)
    .sort((a, b) => b.improvement - a.improvement);
}

/**
 * Analyze performance by framing style
 */
export function analyzeFramingPerformance(
  posts: InstagramPost[],
  overallAvgEngagement: number
): TokenPerformance[] {
  const framingStats: Record<string, { totalEngagement: number; count: number }> = {};

  for (const post of posts) {
    if (!post.framing) continue;

    const engagement = post.engagementScore || calculateEngagementScore(
      post.likesCount,
      post.commentsCount,
      post.viewsCount
    );

    if (!framingStats[post.framing]) {
      framingStats[post.framing] = { totalEngagement: 0, count: 0 };
    }
    framingStats[post.framing].totalEngagement += engagement;
    framingStats[post.framing].count++;
  }

  return Object.entries(framingStats)
    .map(([framing, stats]) => {
      const avgEngagement = stats.totalEngagement / stats.count;
      const improvement = overallAvgEngagement > 0
        ? ((avgEngagement - overallAvgEngagement) / overallAvgEngagement) * 100
        : 0;

      return {
        token: framing,
        avgEngagement,
        postCount: stats.count,
        improvement,
      };
    })
    .filter((t) => t.postCount >= 2)
    .sort((a, b) => b.improvement - a.improvement);
}

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Generate style recommendations based on performance data
 */
export function generateRecommendations(
  tokenPerformance: TokenPerformance[],
  lightingPerformance: TokenPerformance[],
  framingPerformance: TokenPerformance[]
): StyleRecommendation[] {
  const recommendations: StyleRecommendation[] = [];

  // Token-based recommendations
  const topToken = tokenPerformance.find((t) => t.improvement > 20);
  if (topToken) {
    recommendations.push({
      type: 'style',
      titleFr: `Style "${topToken.token}" performant`,
      descriptionFr: `Vos posts avec le style "${topToken.token}" obtiennent ${Math.round(topToken.improvement)}% plus d'engagement. Utilisez-le plus souvent!`,
      impact: topToken.improvement > 40 ? 'high' : 'medium',
      data: { token: topToken.token, improvement: topToken.improvement },
    });
  }

  // Lighting recommendations
  const topLighting = lightingPerformance.find((t) => t.improvement > 15);
  if (topLighting) {
    const lightingNameFr: Record<string, string> = {
      golden_hour: 'heure dorée',
      studio_soft: 'studio doux',
      natural: 'lumière naturelle',
      dramatic: 'dramatique',
    };
    const name = lightingNameFr[topLighting.token] || topLighting.token;

    recommendations.push({
      type: 'lighting',
      titleFr: `Éclairage ${name} recommandé`,
      descriptionFr: `L'éclairage "${name}" génère +${Math.round(topLighting.improvement)}% d'engagement sur vos photos.`,
      impact: topLighting.improvement > 30 ? 'high' : 'medium',
      data: { token: topLighting.token, improvement: topLighting.improvement },
    });
  }

  // Framing recommendations
  const topFraming = framingPerformance.find((t) => t.improvement > 15);
  if (topFraming) {
    const framingNameFr: Record<string, string> = {
      flat_lay: 'flat lay',
      close_up: 'gros plan',
      lifestyle: 'lifestyle',
      editorial: 'éditorial',
    };
    const name = framingNameFr[topFraming.token] || topFraming.token;

    recommendations.push({
      type: 'framing',
      titleFr: `Cadrage ${name} performant`,
      descriptionFr: `Vos photos en cadrage "${name}" obtiennent +${Math.round(topFraming.improvement)}% d'engagement.`,
      impact: topFraming.improvement > 30 ? 'high' : 'medium',
      data: { token: topFraming.token, improvement: topFraming.improvement },
    });
  }

  // Underperforming style warnings
  const worstToken = tokenPerformance.find((t) => t.improvement < -20);
  if (worstToken) {
    recommendations.push({
      type: 'style',
      titleFr: `Style "${worstToken.token}" moins performant`,
      descriptionFr: `Vos posts avec "${worstToken.token}" ont ${Math.round(Math.abs(worstToken.improvement))}% moins d'engagement. Essayez d'autres styles.`,
      impact: 'low',
      data: { token: worstToken.token, improvement: worstToken.improvement },
    });
  }

  // General recommendations if no specific patterns found
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      titleFr: 'Continuez à expérimenter',
      descriptionFr: 'Nous n\'avons pas encore assez de données pour des recommandations spécifiques. Continuez à poster pour affiner l\'analyse!',
      impact: 'low',
    });
  }

  return recommendations.slice(0, 5);  // Max 5 recommendations
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate complete performance insights for a brand
 */
export function generatePerformanceInsights(posts: InstagramPost[]): PerformanceInsights {
  const metrics = analyzePostPerformance(posts);

  const tokenPerformance = analyzeTokenPerformance(posts, metrics.avgEngagement);
  const lightingPerformance = analyzeLightingPerformance(posts, metrics.avgEngagement);
  const framingPerformance = analyzeFramingPerformance(posts, metrics.avgEngagement);

  const recommendations = generateRecommendations(
    tokenPerformance,
    lightingPerformance,
    framingPerformance
  );

  return {
    metrics,
    tokenPerformance,
    lightingPerformance,
    framingPerformance,
    recommendations,
    lastAnalyzedAt: new Date().toISOString(),
  };
}
