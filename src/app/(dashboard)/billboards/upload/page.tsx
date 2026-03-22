'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Video,
  Check,
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Billboard {
  id: string;
  name: string;
  address: string;
  pricing: {
    pricePerSlot: number;
    slotDurationMins: number;
  };
  queueLength: number;
  isAvailable: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];

export default function BillboardUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'select' | 'confirm'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null);
  const [selectedBillboards, setSelectedBillboards] = useState<string[]>([]);
  const [pricing, setPricing] = useState<{
    total: number;
    discount: number;
    billboards: Array<{ billboardId: string; subtotal: number }>;
  } | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  const { data: billboardsData } = useSWR<{ billboards: Billboard[] }>(
    '/api/v1/billboards',
    fetcher
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou MP4.');
      return;
    }

    // Validate size
    if (selected.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux (max 50MB)');
      return;
    }

    setFile(selected);
    setFilePreview(URL.createObjectURL(selected));
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/billboard-content', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const result = await response.json();
      setContentId(result.id);
      setStep('select');
      toast.success('Fichier téléchargé ! Sélectionnez vos panneaux.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const toggleBillboard = (id: string) => {
    setSelectedBillboards((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const calculatePrice = async () => {
    if (selectedBillboards.length === 0) {
      toast.error('Sélectionnez au moins un panneau');
      return;
    }

    try {
      const response = await fetch('/api/v1/billboard-payments/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billboardIds: selectedBillboards }),
      });

      if (!response.ok) throw new Error('Price calculation failed');

      const result = await response.json();
      setPricing({
        total: result.total,
        discount: result.discount,
        billboards: result.billboards,
      });
      setStep('confirm');
    } catch (error) {
      toast.error('Erreur lors du calcul du prix');
    }
  };

  const createPayment = async () => {
    if (!contentId) return;

    setCreatingPayment(true);
    try {
      const response = await fetch('/api/v1/billboard-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          billboardIds: selectedBillboards,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        // Paid with credits
        toast.success('Paiement effectué ! Votre publicité est en cours de traitement.');
        router.push('/billboards/my-content');
      } else {
        // Redirect to payment
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du paiement');
    } finally {
      setCreatingPayment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billboards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Publier une annonce</h1>
          <p className="text-sm text-slate-500">
            {step === 'upload' && 'Étape 1/3 : Téléchargez votre média'}
            {step === 'select' && 'Étape 2/3 : Choisissez vos panneaux'}
            {step === 'confirm' && 'Étape 3/3 : Confirmez et payez'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['upload', 'select', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-violet-600 text-white'
                  : ['select', 'confirm'].indexOf(step) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {['select', 'confirm'].indexOf(step) > i ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  ['select', 'confirm'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Téléchargez votre publicité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/quicktime"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-violet-400 transition-colors"
              >
                <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="font-medium text-slate-700">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPG, PNG ou MP4 (max 50MB, vidéo max 60s)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  {file.type.startsWith('video/') ? (
                    <video
                      src={filePreview!}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={filePreview!}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                  <Badge className="absolute top-2 left-2 bg-black/50 text-white">
                    {file.type.startsWith('video/') ? (
                      <Video className="h-3 w-3 mr-1" />
                    ) : (
                      <ImageIcon className="h-3 w-3 mr-1" />
                    )}
                    {file.type.startsWith('video/') ? 'Vidéo' : 'Image'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{file.name}</span>
                  <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                    }}
                  >
                    Changer de fichier
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={uploadFile}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Continuer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Billboards */}
      {step === 'select' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sélectionnez vos panneaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {billboardsData?.billboards
                  .filter((b) => b.isAvailable)
                  .map((billboard) => (
                    <div
                      key={billboard.id}
                      onClick={() => toggleBillboard(billboard.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedBillboards.includes(billboard.id)
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{billboard.name}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {billboard.address}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedBillboards.includes(billboard.id)
                              ? 'bg-violet-600 border-violet-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedBillboards.includes(billboard.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {billboard.pricing.slotDurationMins} min
                        </span>
                        <span className="font-semibold text-violet-600">
                          {billboard.pricing.pricePerSlot.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700"
              onClick={calculatePrice}
              disabled={selectedBillboards.length === 0}
            >
              Continuer ({selectedBillboards.length} sélectionné
              {selectedBillboards.length > 1 ? 's' : ''})
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 'confirm' && pricing && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                {file?.type.startsWith('video/') ? (
                  <video
                    src={filePreview!}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={filePreview!}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Selected billboards */}
              <div className="space-y-2">
                {billboardsData?.billboards
                  .filter((b) => selectedBillboards.includes(b.id))
                  .map((billboard) => (
                    <div
                      key={billboard.id}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <span>{billboard.name}</span>
                      <span className="font-medium">
                        {billboard.pricing.pricePerSlot.toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
              </div>

              {/* Pricing */}
              <div className="pt-4 border-t space-y-2">
                {pricing.discount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Réduction</span>
                    <span>-{pricing.discount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-violet-600">
                    {pricing.total.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('select')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700"
              onClick={createPayment}
              disabled={creatingPayment}
            >
              {creatingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Payer {pricing.total.toLocaleString()} FCFA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
