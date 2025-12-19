'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Coins, CheckCircle, History, Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/useUser';
import { cn } from '@/lib/utils';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  units: number;
  priceFcfa: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreditsPage() {
  const searchParams = useSearchParams();
  const { credits, refreshCredits } = useCredits();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Check for success/error from payment redirect
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  // Fetch credit packs
  const { data: packsData } = useSWR<{ packs: CreditPack[] }>(
    '/api/v1/credits/packs',
    fetcher
  );

  // Fetch credit history
  const { data: historyData } = useSWR(
    '/api/v1/credits',
    fetcher
  );

  const handlePurchase = async (packId: string) => {
    setPurchasing(packId);

    try {
      const response = await fetch('/api/v1/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      // Redirect to NabooPay checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {success && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-400">
                Paiement réussi!
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Vos crédits ont été ajoutés à votre compte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900">
          <CardContent className="flex items-center gap-4 py-4">
            <div>
              <p className="font-medium text-red-800 dark:text-red-400">
                Paiement échoué
              </p>
              <p className="text-sm text-red-600 dark:text-red-500">
                Le paiement n'a pas pu être effectué. Veuillez réessayer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Crédits
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gérez vos crédits et achetez des packs
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
        <CardHeader>
          <CardDescription className="text-violet-200">Solde actuel</CardDescription>
          <CardTitle className="text-4xl flex items-center gap-3">
            <Coins className="h-10 w-10" />
            {credits} crédits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-violet-200 text-sm">
            1 crédit = 1 génération finale (1024px) • 0.5 crédit = 1 preview (512px)
          </p>
        </CardContent>
      </Card>

      {/* Credit Packs */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Acheter des crédits
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packsData?.packs?.map((pack) => (
            <Card
              key={pack.id}
              className={cn(
                'relative overflow-hidden transition-all',
                pack.id === 'pro' && 'border-violet-300 shadow-lg'
              )}
            >
              {pack.id === 'pro' && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                  Populaire
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  {pack.name}
                </CardTitle>
                <CardDescription>
                  {pack.credits} crédits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatPrice(pack.priceFcfa)}
                  <span className="text-base font-normal text-slate-500 ml-1">FCFA</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {formatPrice(Math.round(pack.priceFcfa / pack.credits))} FCFA / crédit
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className={cn(
                    'w-full',
                    pack.id === 'pro' && 'bg-gradient-to-r from-violet-600 to-indigo-600'
                  )}
                  disabled={purchasing !== null}
                  onClick={() => handlePurchase(pack.id)}
                >
                  {purchasing === pack.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    'Acheter'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Paiement sécurisé via Wave, Orange Money ou carte bancaire
        </p>
      </div>

      {/* Credit History */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique
        </h2>

        <Card>
          <CardContent className="p-0">
            {historyData?.history?.length > 0 ? (
              <div className="divide-y dark:divide-slate-800">
                {historyData.history.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {entry.description || entry.reason}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={entry.delta > 0 ? 'default' : 'secondary'}
                      className={cn(
                        entry.delta > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      )}
                    >
                      {entry.delta > 0 ? '+' : ''}{entry.credits} cr
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune transaction pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
