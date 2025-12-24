'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera,
  User,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

type CreatorType = 'MODEL' | 'PHOTOGRAPHER' | 'LOCATION_OWNER';

interface UserData {
  name: string | null;
  email: string;
}

const creatorTypes = [
  {
    id: 'MODEL' as CreatorType,
    title: 'Mannequin',
    description: 'Votre image sera utilisée pour des shootings IA',
    icon: User,
    color: 'bg-pink-100 text-pink-600',
    earnings: '0.50 crédit / utilisation',
  },
  {
    id: 'PHOTOGRAPHER' as CreatorType,
    title: 'Photographe',
    description: 'Vendez vos styles et presets photo',
    icon: Camera,
    color: 'bg-violet-100 text-violet-600',
    earnings: '0.25 crédit / utilisation',
  },
  {
    id: 'LOCATION_OWNER' as CreatorType,
    title: 'Propriétaire de lieu',
    description: 'Monétisez vos espaces comme décors',
    icon: MapPin,
    color: 'bg-amber-100 text-amber-600',
    earnings: '0.25 crédit / utilisation',
  },
];

export default function CreatorRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<CreatorType | null>(null);
  const [bio, setBio] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'wave' | 'orange_money' | ''>('');
  const [payoutPhone, setPayoutPhone] = useState('');

  // Fetch current user info
  useEffect(() => {
    fetch('/api/v1/user')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !user) {
      setError('Veuillez sélectionner un type de créateur');
      return;
    }

    if (!payoutMethod || !payoutPhone) {
      setError('Veuillez configurer vos informations de paiement');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/creators/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          displayName: user.name || user.email.split('@')[0], // Use existing name
          bio: bio || undefined,
          instagramHandle: instagramHandle || undefined,
          payoutMethod,
          payoutPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      // Success - redirect to creator dashboard
      router.push('/creator');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Activer le mode Créateur
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Bonjour <span className="font-medium text-slate-900">{user?.name || user?.email}</span> !
          Choisissez comment vous souhaitez contribuer.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-violet-600' : 'bg-slate-200'}`} />
        <div className={`w-12 h-1 ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`} />
        <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 ? 'Quel type de créateur êtes-vous ?' : 'Informations de paiement'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Vous pourrez ajouter d\'autres types plus tard'
              : 'Comment souhaitez-vous recevoir vos gains ?'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Creator Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {creatorTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedType === type.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.color}`}>
                        <type.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {type.title}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {type.description}
                        </p>
                        <p className="text-xs text-green-600 font-medium mt-1">
                          {type.earnings}
                        </p>
                      </div>
                      {selectedType === type.id && (
                        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Optional bio */}
              <div className="pt-4 border-t">
                <Label htmlFor="bio" className="text-slate-500">Bio (optionnel)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Quelques mots sur vous..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Optional Instagram */}
              <div>
                <Label htmlFor="instagram" className="text-slate-500">Instagram (optionnel)</Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm">
                    @
                  </span>
                  <Input
                    id="instagram"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="votre_handle"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payout Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>Important :</strong> Vous recevrez <strong>50% des revenus</strong> chaque
                  fois qu'un utilisateur utilise vos assets. Minimum de retrait : 5 000 FCFA.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Méthode de paiement *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPayoutMethod('wave')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      payoutMethod === 'wave'
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-bold text-blue-600">W</span>
                      </div>
                      <span className="font-medium">Wave</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPayoutMethod('orange_money')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      payoutMethod === 'orange_money'
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-bold text-orange-600">OM</span>
                      </div>
                      <span className="font-medium">Orange Money</span>
                    </div>
                  </button>
                </div>
              </div>

              {payoutMethod && (
                <div className="space-y-2">
                  <Label htmlFor="payoutPhone">Numéro de téléphone {payoutMethod === 'wave' ? 'Wave' : 'Orange Money'} *</Label>
                  <Input
                    id="payoutPhone"
                    value={payoutPhone}
                    onChange={(e) => setPayoutPhone(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    type="tel"
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => router.push('/creator')}>
                Annuler
              </Button>
            )}

            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedType}
              >
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !payoutMethod || !payoutPhone}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activation...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Activer mon compte créateur
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
