'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Heart,
  MessageCircle,
  Eye,
  Loader2,
  RefreshCw,
  Lightbulb,
  Image,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TokenPerformance {
  token: string;
  averageEngagement: number;
  postCount: number;
  percentageDiff: number;
}

interface PerformanceInsights {
  overallStats: {
    totalPosts: number;
    averageEngagement: number;
    topEngagementScore: number;
    postingFrequency: string;
  };
  tokenPerformance: TokenPerformance[];
  lightingPerformance: Record<string, { average: number; count: number }>;
  framingPerformance: Record<string, { average: number; count: number }>;
  recommendations: string[];
  topPosts: Array<{
    id: string;
    imageUrl: string;
    engagementScore: number;
    likesCount: number;
    commentsCount: number;
    visualTokens: string[];
  }>;
  lastAnalyzedAt: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      fetchAnalytics(selectedBrandId);
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/v1/brands');
      const data = await res.json();
      if (data.brands && data.brands.length > 0) {
        setBrands(data.brands);
        setSelectedBrandId(data.brands[0].id);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  };

  const fetchAnalytics = async (brandId: string, refresh = false) => {
    setIsLoading(true);
    try {
      const url = `/api/v1/brands/${brandId}/analytics${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.insights) {
        setInsights(data.insights);
        setPostCount(data.postCount || 0);
      } else {
        setInsights(null);
        setPostCount(data.postCount || 0);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Erreur de chargement des analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedBrandId) return;
    setIsRefreshing(true);
    await fetchAnalytics(selectedBrandId, true);
    toast.success('Analytics actualisées!');
  };

  if (isLoading && !insights) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Performance Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Analysez vos posts Instagram pour optimiser votre contenu
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Brand selector */}
          <select
            value={selectedBrandId || ''}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* No data state */}
      {!insights ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucune donnée disponible
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {postCount === 0
              ? "Analysez d'abord votre marque Instagram pour obtenir des insights de performance."
              : 'Vos posts Instagram sont en cours d\'analyse.'}
          </p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Image className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-500">Posts analysés</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {insights.overallStats.totalPosts}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-rose-600" />
                </div>
                <span className="text-sm text-slate-500">Engagement moyen</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {insights.overallStats.averageEngagement.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm text-slate-500">Meilleur score</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {insights.overallStats.topEngagementScore.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-sm text-slate-500">Fréquence</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {insights.overallStats.postingFrequency}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-violet-600" />
                <h3 className="font-semibold text-violet-900">
                  Recommandations
                </h3>
              </div>
              <ul className="space-y-2">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                    <span className="text-violet-400">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Token Performance */}
          {insights.tokenPerformance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">
                Performance par style visuel
              </h3>
              <div className="space-y-3">
                {insights.tokenPerformance.slice(0, 6).map((token) => (
                  <div key={token.token} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-600 truncate">
                      {token.token.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          token.percentageDiff > 0
                            ? 'bg-green-500'
                            : token.percentageDiff < 0
                            ? 'bg-red-400'
                            : 'bg-slate-400'
                        )}
                        style={{
                          width: `${Math.min(100, (token.averageEngagement / insights.overallStats.topEngagementScore) * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium w-16 text-right',
                        token.percentageDiff > 0
                          ? 'text-green-600'
                          : token.percentageDiff < 0
                          ? 'text-red-500'
                          : 'text-slate-600'
                      )}
                    >
                      {token.percentageDiff > 0 ? '+' : ''}
                      {token.percentageDiff.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-400 w-16">
                      ({token.postCount} posts)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Posts */}
          {insights.topPosts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Vos meilleurs posts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insights.topPosts.slice(0, 8).map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center gap-3 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.commentsCount}
                          </span>
                        </div>
                        {post.visualTokens.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {post.visualTokens.slice(0, 2).map((token) => (
                              <span
                                key={token}
                                className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] text-white"
                              >
                                {token}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 rounded text-xs font-medium text-white">
                      {post.engagementScore.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last analyzed */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Dernière analyse:{' '}
            {new Date(insights.lastAnalyzedAt).toLocaleString('fr-FR')}
          </p>
        </>
      )}
    </div>
  );
}
