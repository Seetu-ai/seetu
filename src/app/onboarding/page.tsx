'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  ShoppingBag,
  Utensils,
  Palette,
  Building2,
  MoreHorizontal,
  Instagram,
  Upload,
  X,
  Check,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandDNA, SocialSource } from '@/types';

// TikTok and Facebook icons as SVG components
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const BUSINESS_TYPES = [
  { id: 'fashion', label: 'Mode', icon: ShoppingBag, color: 'bg-pink-100 text-pink-600' },
  { id: 'food', label: 'Alimentation', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'beauty', label: 'Beauté', icon: Palette, color: 'bg-purple-100 text-purple-600' },
  { id: 'realestate', label: 'Immobilier', icon: Building2, color: 'bg-blue-100 text-blue-600' },
  { id: 'other', label: 'Autre', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600' },
] as const;

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram' as SocialSource,
    label: 'Instagram',
    icon: Instagram,
    gradient: 'from-pink-500 to-purple-600',
    placeholder: '@votrecompte'
  },
  {
    id: 'tiktok' as SocialSource,
    label: 'TikTok',
    icon: TikTokIcon,
    gradient: 'from-black to-gray-800',
    placeholder: '@votrecompte'
  },
  {
    id: 'facebook' as SocialSource,
    label: 'Facebook',
    icon: FacebookIcon,
    gradient: 'from-blue-600 to-blue-700',
    placeholder: 'nom.de.page'
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Brand name
  const [brandName, setBrandName] = useState('');
  const [businessType, setBusinessType] = useState<string>('');

  // Step 3: Brand identity
  const [selectedPlatform, setSelectedPlatform] = useState<SocialSource | null>(null);
  const [socialHandle, setSocialHandle] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [socialImages, setSocialImages] = useState<string[]>([]);
  const [socialCaptions, setSocialCaptions] = useState<string[]>([]);
  const [fetchingSocial, setFetchingSocial] = useState(false);
  const [analyzingBrand, setAnalyzingBrand] = useState(false);
  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);

  // Creation state
  const [loading, setLoading] = useState(false);

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: { file: File; preview: string }[] = [];

    for (let i = 0; i < files.length && uploadedPhotos.length + newPhotos.length < 12; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setUploadedPhotos((prev) => [...prev, ...newPhotos].slice(0, 12));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadedPhotos.length]);

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  // Fetch social media images
  const fetchSocialImages = async () => {
    if (!socialHandle.trim() || !selectedPlatform) {
      toast.error('Veuillez entrer un handle');
      return;
    }

    setFetchingSocial(true);

    try {
      const response = await fetch('/api/v1/brand/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, handle: socialHandle }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Impossible de récupérer le profil');
      }

      if (data.images.length < 3) {
        toast.error('Profil non trouvé ou pas assez de photos publiques');
        return;
      }

      setSocialImages(data.images);
      setSocialCaptions(data.captions || []);
      toast.success(`${data.images.length} photos récupérées de ${data.handle}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      setFetchingSocial(false);
    }
  };

  // Analyze brand identity
  const analyzeBrandIdentity = async () => {
    let imageUrls: string[] = [];
    let captions: string[] = [];

    if (selectedPlatform && selectedPlatform !== 'photos') {
      imageUrls = socialImages;
      captions = socialCaptions;
    } else {
      // Upload photos to get URLs
      const uploadPromises = uploadedPhotos.map(async (photo) => {
        const formData = new FormData();
        formData.append('file', photo.file);

        const response = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        return data.url;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    if (imageUrls.length < 3) {
      toast.error('Au moins 3 images sont nécessaires');
      return;
    }

    setAnalyzingBrand(true);

    try {
      const response = await fetch('/api/v1/brand/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls,
          captions: captions.length >= 3 ? captions : undefined,
          source: selectedPlatform || 'photos',
          socialHandle: selectedPlatform !== 'photos' ? socialHandle : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analyse échouée');
      }

      setBrandDNA(data.brandDNA);
      toast.success('ADN de marque extrait!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur d\'analyse');
    } finally {
      setAnalyzingBrand(false);
    }
  };

  // Create brand
  const handleCreateBrand = async () => {
    if (!brandName.trim() || !businessType) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      // First update the user with business type
      await fetch('/api/v1/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType }),
      });

      // Then create the brand
      const response = await fetch('/api/v1/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName,
          instagramHandle: socialHandle || undefined,
          visualDNA: brandDNA ? {
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
          } : undefined,
          verbalDNA: brandDNA?.verbal_dna || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      toast.success('Marque créée avec succès!');
      router.push('/studio');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const resetBrandSelection = () => {
    setBrandDNA(null);
    setSelectedPlatform(null);
    setSocialHandle('');
    setSocialImages([]);
    setSocialCaptions([]);
    uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    setUploadedPhotos([]);
  };

  // Lighting style display names
  const lightingLabels: Record<string, string> = {
    studio_soft: 'Studio doux',
    studio_hard: 'Studio dur',
    natural_sunlight: 'Lumière naturelle',
    golden_hour: 'Heure dorée',
    neon_night: 'Néon nocturne',
    overcast_diffused: 'Lumière diffuse',
  };

  // Framing display names
  const framingLabels: Record<string, string> = {
    minimalist_centered: 'Minimaliste centré',
    flat_lay: 'Flat lay',
    low_angle_lifestyle: 'Lifestyle angle bas',
    close_up_detail: 'Gros plan détail',
    chaotic_lifestyle: 'Lifestyle dynamique',
    editorial_fashion: 'Editorial mode',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              Cabine
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'w-3 h-3 rounded-full transition-all',
                step >= s
                  ? 'bg-violet-600'
                  : 'bg-slate-200 dark:bg-slate-700'
              )}
            />
          ))}
        </div>

        <Card className="border-0 shadow-xl">
          {/* Step 1: Brand Name */}
          {step === 1 && (
            <>
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center">Bienvenue sur Cabine!</CardTitle>
                <CardDescription className="text-center">
                  Créez votre première marque pour commencer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de votre marque</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ma Marque"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
                  onClick={() => {
                    if (!brandName.trim()) {
                      toast.error('Veuillez entrer un nom');
                      return;
                    }
                    setStep(2);
                  }}
                  disabled={!brandName.trim()}
                >
                  Continuer
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Type d&apos;activité</CardTitle>
                <CardDescription className="text-center">
                  Sélectionnez le type qui correspond le mieux à votre activité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setBusinessType(type.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                          businessType === type.id
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-950'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        )}
                      >
                        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', type.color)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
                  onClick={() => setStep(3)}
                  disabled={!businessType}
                >
                  Continuer
                </Button>
              </CardFooter>
            </>
          )}

          {/* Step 3: Brand DNA */}
          {step === 3 && (
            <>
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-violet-100 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-violet-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center">ADN de Marque</CardTitle>
                <CardDescription className="text-center">
                  Analysons votre style visuel pour personnaliser vos générations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform selection */}
                {!selectedPlatform && !brandDNA && (
                  <div className="space-y-3">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      return (
                        <button
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform.id)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-violet-300 transition-all"
                        >
                          <div className={cn('w-12 h-12 bg-gradient-to-br rounded-full flex items-center justify-center', platform.gradient)}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold">{platform.label}</p>
                            <p className="text-sm text-slate-500">Analysez votre feed</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400" />
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setSelectedPlatform('photos')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-violet-300 transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">Télécharger des photos</p>
                        <p className="text-sm text-slate-500">Uploadez 6-12 photos de votre style</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                )}

                {/* Social media handle input */}
                {selectedPlatform && selectedPlatform !== 'photos' && !brandDNA && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder={SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform)?.placeholder}
                        value={socialHandle}
                        onChange={(e) => setSocialHandle(e.target.value)}
                        disabled={fetchingSocial}
                      />
                      <Button
                        onClick={fetchSocialImages}
                        disabled={!socialHandle.trim() || fetchingSocial}
                      >
                        {fetchingSocial ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Récupérer'
                        )}
                      </Button>
                    </div>

                    {socialImages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-500">
                          {socialImages.length} photos trouvées
                        </p>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {socialImages.map((url, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                              <Image
                                src={url}
                                alt={`Photo ${idx + 1}`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={resetBrandSelection}
                    >
                      Changer de méthode
                    </Button>
                  </div>
                )}

                {/* Photo upload */}
                {selectedPlatform === 'photos' && !brandDNA && (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {uploadedPhotos.map((photo, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100 relative group">
                          <Image
                            src={photo.preview}
                            alt={`Upload ${idx + 1}`}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {uploadedPhotos.length < 12 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-violet-400 flex flex-col items-center justify-center gap-1 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {uploadedPhotos.length}/12
                          </span>
                        </button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={resetBrandSelection}
                    >
                      Changer de méthode
                    </Button>
                  </div>
                )}

                {/* Brand DNA Result */}
                {brandDNA && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">ADN extrait!</span>
                    </div>

                    {/* French Summary */}
                    {brandDNA.analysis_summary_fr && (
                      <div className="p-4 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-100">
                        <p className="text-sm text-violet-900 leading-relaxed italic">
                          &ldquo;{brandDNA.analysis_summary_fr}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Vibe Summary */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase mb-1">Style Visuel</p>
                      <p className="text-sm font-semibold text-slate-800">{brandDNA.vibe_summary}</p>
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase">Palette</p>
                      <div className="flex gap-2">
                        {[
                          { color: brandDNA.palette.primary, name: brandDNA.palette.primaryName || 'Primary' },
                          { color: brandDNA.palette.secondary, name: brandDNA.palette.secondaryName || 'Secondary' },
                          { color: brandDNA.palette.accent, name: brandDNA.palette.accentName || 'Accent' },
                        ].map((c, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full">
                            <div
                              className="w-4 h-4 rounded-full border border-slate-200"
                              style={{ backgroundColor: c.color }}
                            />
                            <span className="text-xs">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Visual Tokens */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase">Style Tokens</p>
                      <div className="flex flex-wrap gap-1">
                        {brandDNA.visual_tokens.slice(0, 6).map((token, idx) => (
                          <span key={idx} className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Photography Settings */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase">Paramètres Photo</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-100 rounded">
                          <span className="text-slate-500">Éclairage:</span>{' '}
                          <span className="font-medium">{lightingLabels[brandDNA.photography_settings.lighting] || brandDNA.photography_settings.lighting}</span>
                        </div>
                        <div className="p-2 bg-slate-100 rounded">
                          <span className="text-slate-500">Cadrage:</span>{' '}
                          <span className="font-medium">{framingLabels[brandDNA.photography_settings.framing] || brandDNA.photography_settings.framing}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verbal DNA Section */}
                    {brandDNA.verbal_dna && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-500 uppercase">Style de Communication</p>
                        <div className="space-y-2 text-xs">
                          <div className="p-2 bg-pink-50 rounded">
                            <span className="text-pink-600 font-medium">Ton:</span>{' '}
                            <span className="text-pink-800">{brandDNA.verbal_dna.tone}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <span className="text-slate-500">Langue:</span>{' '}
                            <span className="font-medium">{brandDNA.verbal_dna.language_mix}</span>
                          </div>
                          {brandDNA.verbal_dna.emoji_palette.length > 0 && (
                            <div className="p-2 bg-amber-50 rounded">
                              <span className="text-amber-600 font-medium">Emojis favoris:</span>{' '}
                              <span className="text-lg">{brandDNA.verbal_dna.emoji_palette.slice(0, 5).join(' ')}</span>
                            </div>
                          )}
                          {brandDNA.verbal_dna.signature_hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {brandDNA.verbal_dna.signature_hashtags.slice(0, 4).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={resetBrandSelection}
                    >
                      Recommencer
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {/* Analyze button */}
                {!brandDNA && selectedPlatform && (
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-600"
                    onClick={analyzeBrandIdentity}
                    disabled={
                      analyzingBrand ||
                      (selectedPlatform !== 'photos' && socialImages.length < 3) ||
                      (selectedPlatform === 'photos' && uploadedPhotos.length < 3)
                    }
                  >
                    {analyzingBrand ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extraction de l&apos;ADN...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Extraire l&apos;ADN de marque
                      </>
                    )}
                  </Button>
                )}

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                    disabled={loading || analyzingBrand}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
                    onClick={handleCreateBrand}
                    disabled={loading || analyzingBrand}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : brandDNA ? (
                      'Créer ma marque'
                    ) : (
                      'Passer et créer'
                    )}
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Credits info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-950/50 rounded-xl text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-violet-600">3 crédits gratuits</span> pour commencer
          </p>
        </div>
      </div>
    </div>
  );
}
