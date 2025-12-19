'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'email') {
          setStatus('error');
          setMessage('Lien de confirmation invalide');
          return;
        }

        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        });

        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        setStatus('success');
        setMessage('Votre email a été confirmé avec succès!');

        // Redirect to onboarding after 2 seconds
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage('Une erreur est survenue');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          {status === 'loading' && (
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>
        <CardTitle className="text-2xl text-center">
          {status === 'loading' && 'Confirmation en cours...'}
          {status === 'success' && 'Email confirmé!'}
          {status === 'error' && 'Erreur de confirmation'}
        </CardTitle>
        <CardDescription className="text-center">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'success' && (
          <p className="text-sm text-center text-slate-600">
            Redirection vers la création de votre workspace...
          </p>
        )}
        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/signup">Réessayer l&apos;inscription</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmLoading() {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Chargement...
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<ConfirmLoading />}>
      <ConfirmContent />
    </Suspense>
  );
}
