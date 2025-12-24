'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  X,
  MapPin,
  User,
  Camera,
  Check,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreatorProfile {
  id: string;
  type: 'MODEL' | 'PHOTOGRAPHER' | 'LOCATION_OWNER';
  displayName: string;
}

const assetTypeConfig = {
  MODEL: {
    type: 'MODEL_PROFILE',
    title: 'Profil Mannequin',
    icon: User,
    color: 'bg-pink-100 text-pink-600',
  },
  PHOTOGRAPHER: {
    type: 'PHOTO_STYLE',
    title: 'Style Photo',
    icon: Camera,
    color: 'bg-violet-100 text-violet-600',
  },
  LOCATION_OWNER: {
    type: 'LOCATION',
    title: 'Lieu',
    icon: MapPin,
    color: 'bg-amber-100 text-amber-600',
  },
};

const locationTypes = [
  { value: 'STUDIO', label: 'Studio photo' },
  { value: 'OUTDOOR', label: 'Extérieur' },
  { value: 'INDOOR', label: 'Intérieur' },
  { value: 'ROOFTOP', label: 'Rooftop' },
  { value: 'BEACH', label: 'Plage' },
  { value: 'GARDEN', label: 'Jardin' },
  { value: 'RESTAURANT', label: 'Restaurant/Café' },
  { value: 'OTHER', label: 'Autre' },
];

const genderOptions = [
  { value: 'MALE', label: 'Homme' },
  { value: 'FEMALE', label: 'Femme' },
  { value: 'NON_BINARY', label: 'Non-binaire' },
];

const ageRangeOptions = [
  { value: '18-25', label: '18-25 ans' },
  { value: '26-35', label: '26-35 ans' },
  { value: '36-45', label: '36-45 ans' },
  { value: '46+', label: '46+ ans' },
];

export default function NewAssetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Location-specific fields
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationType, setLocationType] = useState('');

  // Model-specific fields
  const [modelGender, setModelGender] = useState('');
  const [modelAgeRange, setModelAgeRange] = useState('');
  const [modelStyles, setModelStyles] = useState('');

  // Photo style-specific fields
  const [stylePreset, setStylePreset] = useState('');

  // File uploads
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Fetch creator profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/v1/creators/me');
        if (response.status === 404) {
          router.push('/creator/register');
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const handleThumbnailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImagesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 10) {
      toast.error('Maximum 10 images autorisées');
      return;
    }

    setImageFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [imageFiles.length]);

  const removeImage = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (!profile) return;

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!thumbnailFile) {
      setError('Une image de couverture est requise');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assetConfig = assetTypeConfig[profile.type];

      // Step 1: Create the asset
      const createResponse = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: assetConfig.type,
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          // Location fields
          locationName: locationName.trim() || undefined,
          locationCity: locationCity.trim() || undefined,
          locationType: locationType || undefined,
          // Model fields
          modelGender: modelGender || undefined,
          modelAgeRange: modelAgeRange || undefined,
          modelStyles: modelStyles.split(',').map(s => s.trim()).filter(Boolean),
          // Photo style fields
          stylePreset: stylePreset.trim() || undefined,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Erreur lors de la création');
      }

      const assetId = createData.asset.id;

      // Step 2: Upload thumbnail
      const thumbnailFormData = new FormData();
      thumbnailFormData.append('type', 'thumbnail');
      thumbnailFormData.append('file', thumbnailFile);

      const thumbnailResponse = await fetch(`/api/v1/assets/${assetId}/upload`, {
        method: 'POST',
        body: thumbnailFormData,
      });

      if (!thumbnailResponse.ok) {
        const thumbnailError = await thumbnailResponse.json();
        throw new Error(thumbnailError.error || 'Erreur lors de l\'upload de la couverture');
      }

      // Step 3: Upload additional images
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFormData = new FormData();
        imageFormData.append('type', 'image');
        imageFormData.append('file', imageFiles[i]);
        imageFormData.append('index', i.toString());

        const imageResponse = await fetch(`/api/v1/assets/${assetId}/upload`, {
          method: 'POST',
          body: imageFormData,
        });

        if (!imageResponse.ok) {
          console.error(`Failed to upload image ${i}`);
        }
      }

      toast.success('Asset créé avec succès!');
      router.push(`/creator/assets/${assetId}`);
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

  if (!profile) {
    return null;
  }

  const assetConfig = assetTypeConfig[profile.type];
  const Icon = assetConfig.icon;

  const isStep1Valid = title.trim().length > 0;
  const isStep2Valid = thumbnailFile !== null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Nouvel asset
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Créez un nouveau {assetConfig.title.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-violet-600' : 'bg-slate-200'}`} />
        <div className={`w-12 h-1 ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`} />
        <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${assetConfig.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>
                {step === 1 ? 'Informations' : 'Images'}
              </CardTitle>
              <CardDescription>
                {step === 1
                  ? 'Décrivez votre asset'
                  : 'Ajoutez des images pour votre asset'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    profile.type === 'LOCATION_OWNER'
                      ? 'Ex: Studio moderne Dakar Plateau'
                      : profile.type === 'MODEL'
                      ? 'Ex: Portrait professionnel'
                      : 'Ex: Style cinématique'
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre asset en détail..."
                  rows={3}
                />
              </div>

              {/* Location-specific fields */}
              {profile.type === 'LOCATION_OWNER' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationName">Nom du lieu</Label>
                      <Input
                        id="locationName"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Ex: Villa Teranga"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locationCity">Ville</Label>
                      <Input
                        id="locationCity"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                        placeholder="Ex: Dakar"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationType">Type de lieu</Label>
                    <Select value={locationType} onValueChange={setLocationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Model-specific fields */}
              {profile.type === 'MODEL' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="modelGender">Genre</Label>
                      <Select value={modelGender} onValueChange={setModelGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          {genderOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modelAgeRange">Tranche d&apos;âge</Label>
                      <Select value={modelAgeRange} onValueChange={setModelAgeRange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          {ageRangeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelStyles">Styles (séparés par des virgules)</Label>
                    <Input
                      id="modelStyles"
                      value={modelStyles}
                      onChange={(e) => setModelStyles(e.target.value)}
                      placeholder="Ex: Portrait, Mode, Commercial"
                    />
                  </div>
                </>
              )}

              {/* Photo style-specific fields */}
              {profile.type === 'PHOTOGRAPHER' && (
                <div className="space-y-2">
                  <Label htmlFor="stylePreset">Preset / Style</Label>
                  <Input
                    id="stylePreset"
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    placeholder="Ex: Film grain, Moody, Cinematic"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Ex: moderne, lumineux, professionnel"
                />
              </div>
            </div>
          )}

          {/* Step 2: Images */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Image de couverture *</Label>
                <div className="relative">
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img
                        src={thumbnailPreview}
                        alt="Couverture"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setThumbnailFile(null);
                          setThumbnailPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">
                        Cliquez pour ajouter une image
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        JPG, PNG ou WebP (max 20MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleThumbnailChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Additional Images */}
              <div className="space-y-2">
                <Label>Images supplémentaires (optionnel)</Label>
                <p className="text-sm text-slate-500">
                  Ajoutez jusqu&apos;à 10 images pour montrer votre asset sous différents angles
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < 10 && (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                      <ImagePlus className="h-6 w-6 text-slate-400" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImagesChange}
                        multiple
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
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
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isStep2Valid}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Créer l&apos;asset
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
