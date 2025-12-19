'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Zap, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useCredits } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Product {
  id: string;
  name: string | null;
  thumbnailUrl: string;
}

interface Template {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
}

interface TemplatePack {
  id: string;
  slug: string;
  name: string;
  templates: Template[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Carré', description: 'Instagram, profil' },
  { value: '4:5', label: 'Portrait', description: 'Instagram feed' },
  { value: '9:16', label: 'Story', description: 'Instagram/TikTok story' },
];

export default function QuickGeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedProductId = searchParams.get('product');

  const { credits, refreshCredits } = useCredits();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(preselectedProductId);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generating, setGenerating] = useState(false);

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useSWR(
    '/api/v1/products?pageSize=50',
    fetcher
  );

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useSWR(
    '/api/v1/templates',
    fetcher
  );

  const handleGenerate = async () => {
    if (!selectedProduct || !selectedTemplate) {
      toast.error('Veuillez sélectionner un produit et un style');
      return;
    }

    if (credits < 0.5) {
      toast.error('Crédits insuffisants');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/v1/quick-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          templateId: selectedTemplate,
          aspectRatio,
          mode: 'preview',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      toast.success('Génération lancée!');
      refreshCredits();

      // Redirect to shoot page to see results
      router.push(`/shoots/${data.shootId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-8 w-8 text-amber-500" />
            Quick Generate
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Générez une image en quelques clics
          </p>
        </div>
      </div>

      {/* Step 1: Select Product */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center">
              1
            </span>
            Sélectionnez un produit
          </CardTitle>
          <CardDescription>
            Choisissez le produit à mettre en valeur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : productsData?.products?.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {productsData.products.map((product: Product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    selectedProduct === product.id
                      ? 'border-violet-600 ring-2 ring-violet-200'
                      : 'border-transparent hover:border-slate-300'
                  )}
                >
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover"
                  />
                  {selectedProduct === product.id && (
                    <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-violet-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">Aucun produit disponible</p>
              <Button asChild>
                <Link href="/products">Ajouter des produits</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center">
              2
            </span>
            Choisissez un style
          </CardTitle>
          <CardDescription>
            Sélectionnez l&apos;ambiance de votre photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {templatesData?.packs?.map((pack: TemplatePack) => (
                <div key={pack.id}>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                    {pack.name}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {pack.templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          'relative p-3 rounded-lg border-2 transition-all text-left',
                          selectedTemplate === template.id
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        )}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center mb-2">
                          <Sparkles className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {template.name}
                        </p>
                        {selectedTemplate === template.id && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-violet-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Select Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center">
              3
            </span>
            Format de sortie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={cn(
                  'px-4 py-3 rounded-lg border-2 transition-all text-left',
                  aspectRatio === ratio.value
                    ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                )}
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {ratio.label}
                </p>
                <p className="text-xs text-slate-500">{ratio.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-violet-200 dark:border-violet-800">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              Prêt à générer?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Coût: 0.5 crédit • Solde: {credits} crédits
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 min-w-[200px]"
            disabled={!selectedProduct || !selectedTemplate || generating || credits < 0.5}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Générer (0.5 cr)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
