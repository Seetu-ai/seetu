'use client';

import { useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Package,
  Upload,
  Loader2,
  MoreVertical,
  Trash2,
  Zap,
  Expand,
  Sparkles,
  Check,
  ScanSearch,
  MousePointerClick,
  Pen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { ImagePreview, useImagePreview } from '@/components/ui/image-preview';

interface Product {
  id: string;
  name: string | null;
  originalUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProductsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { previewState, openPreview, setPreviewOpen } = useImagePreview();

  // Name dialog state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [newProductName, setNewProductName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);

  // Analysis results state
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);

  // Multi-product detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<Array<{
    id: string;
    description: string;
    bbox: { x_min: number; y_min: number; x_max: number; y_max: number };
    svgPath?: string; // SVG path from Moondream /segment
    segBbox?: { x_min: number; y_min: number; x_max: number; y_max: number };
  }>>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showProductSelectionDialog, setShowProductSelectionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Name editing state for multi-product dialog
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [showNameEditStep, setShowNameEditStep] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/products?search=${search}`,
    fetcher
  );

  // When files are selected, upload and detect products first
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setPendingFiles(fileArray);
    setCurrentFileIndex(0);
    // Keep upload dialog open to show loading state

    // Process first file immediately
    await processFileUploadAndDetect(fileArray[0]);
  };

  // Upload file and detect products with Moondream
  const processFileUploadAndDetect = async (file: File) => {
    setUploading(true);
    setPendingAnalysis(null);
    setPendingImageUrl(null);
    setPendingThumbnailUrl(null);
    setNewProductName('');
    setDetectedProducts([]);
    setSelectedProductIds([]);
    setPendingFile(file);

    try {
      // Create FormData for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // 1. Upload file
      const uploadResponse = await fetch('/api/v1/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { url, thumbnailUrl } = await uploadResponse.json();
      setPendingImageUrl(url);
      setPendingThumbnailUrl(thumbnailUrl || url);
      setUploading(false);
      setDetecting(true);

      // 2. Detect products with Moondream
      const detectFormData = new FormData();
      detectFormData.append('file', file);

      const detectRes = await fetch('/api/v1/studio/detect', {
        method: 'POST',
        body: detectFormData,
      });

      if (detectRes.ok) {
        const { products, totalCount } = await detectRes.json();
        console.log('[DETECT] Found products:', products);

        // Products detected with SVG paths from Moondream
        if (products && products.length > 0) {
          // Auto-select all products
          setSelectedProductIds(products.map((p: any) => p.id));

          // Products now come with svgPath from backend (Moondream /segment)
          setDetectedProducts(products);
          console.log('[DETECT] Products with SVG paths:', products.map((p: any) => ({
            name: p.description,
            hasSvgPath: !!p.svgPath,
            pathLength: p.svgPath?.length || 0
          })));

          // Show the dialog with outlines ready
          setDetecting(false);
          setUploadDialogOpen(false);
          setShowProductSelectionDialog(true);
          return;
        }
      }

      // Single product or detection failed - proceed with analysis
      setDetecting(false);
      await analyzeSelectedProduct(file, url, thumbnailUrl);
    } catch (error) {
      console.error('Upload/detect error:', error);
      toast.error("Erreur lors de l'upload ou de la détection");
      setUploading(false);
      setDetecting(false);
      setUploadDialogOpen(false);
      setPendingFiles([]);
    }
  };

  // Analyze a single product with Gemini
  const analyzeSelectedProduct = async (file: File, imageUrl?: string, thumbUrl?: string) => {
    setAnalyzing(true);
    setShowProductSelectionDialog(false);

    try {
      const url = imageUrl || pendingImageUrl;
      const thumbnailUrl = thumbUrl || pendingThumbnailUrl;

      // Analyze the product with Gemini
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', file);

      const analyzeRes = await fetch('/api/v1/studio/analyze', {
        method: 'POST',
        body: analyzeFormData,
      });

      if (analyzeRes.ok) {
        const { analysis } = await analyzeRes.json();
        setPendingAnalysis(analysis);
        // Pre-fill name with AI suggestion
        setNewProductName(analysis.name || '');
      }

      setAnalyzing(false);
      // Close upload dialog and show analysis results dialog
      setUploadDialogOpen(false);
      setShowNameDialog(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Erreur lors de l'analyse");
      setAnalyzing(false);
    }
  };

  // Handle product selection from multi-product dialog - go to name edit step
  const handleProductSelection = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Sélectionnez au moins un produit');
      return;
    }

    // Get selected products
    const selectedProducts = detectedProducts.filter(p => selectedProductIds.includes(p.id));

    if (selectedProducts.length === 0) {
      toast.error('Aucun produit sélectionné');
      return;
    }

    // Initialize names with detected descriptions
    const initialNames: Record<string, string> = {};
    selectedProducts.forEach(p => {
      initialNames[p.id] = p.description;
    });
    setProductNames(initialNames);

    // Show name edit step
    setShowProductSelectionDialog(false);
    setShowNameEditStep(true);
  };

  // Handle final save after name editing
  const handleSaveWithNames = async () => {
    const selectedProducts = detectedProducts.filter(p => selectedProductIds.includes(p.id));

    // Check all names are filled
    const missingNames = selectedProducts.some(p => !productNames[p.id]?.trim());
    if (missingNames) {
      toast.error('Veuillez donner un nom à chaque produit');
      return;
    }

    setShowNameEditStep(false);
    setAnalyzing(true);

    try {
      // Create each selected product with user-provided name
      for (const product of selectedProducts) {
        const finalName = productNames[product.id]?.trim() || product.description;
        const createResponse = await fetch('/api/v1/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            imageUrl: pendingImageUrl,
            thumbnailUrl: pendingThumbnailUrl,
            metadata: {
              bbox: product.bbox,
              svgPath: product.svgPath, // Store SVG path for clean reference generation
              segBbox: product.segBbox,
              detectedAs: product.description,
            },
          }),
        });

        if (!createResponse.ok) {
          console.error('Failed to create product:', finalName);
          continue;
        }

        toast.success(`"${finalName}" ajouté !`);
      }

      mutate(); // Refresh product list
      handleCancelUpload(); // Reset state
    } catch (error) {
      console.error('Error creating products:', error);
      toast.error('Erreur lors de la création des produits');
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Cancel the upload process
  const handleCancelUpload = () => {
    setPendingFiles([]);
    setCurrentFileIndex(0);
    setNewProductName('');
    setShowNameDialog(false);
    setPendingImageUrl(null);
    setPendingThumbnailUrl(null);
    setPendingAnalysis(null);
    setDetectedProducts([]);
    setSelectedProductIds([]);
    setShowProductSelectionDialog(false);
    setPendingFile(null);
    setProductNames({});
    setShowNameEditStep(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save product after reviewing analysis and confirming name
  const handleConfirmUpload = async () => {
    if (!newProductName.trim() || !pendingImageUrl) {
      toast.error('Veuillez entrer un nom pour le produit');
      return;
    }

    const productName = newProductName.trim();
    setShowNameDialog(false);

    try {
      // Create product record with analysis data
      const createResponse = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          imageUrl: pendingImageUrl,
          thumbnailUrl: pendingThumbnailUrl,
          category: pendingAnalysis?.category,
          metadata: pendingAnalysis ? {
            category: pendingAnalysis.category,
            subcategory: pendingAnalysis.subcategory,
            colors: pendingAnalysis.colors,
            materials: pendingAnalysis.materials,
            style: pendingAnalysis.style,
            description: pendingAnalysis.description,
            keywords: pendingAnalysis.keywords,
            suggestedContexts: pendingAnalysis.suggestedContexts,
          } : {},
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to save product');
      }

      toast.success(`"${productName}" ajouté !`);
      mutate();

      // Process next file if any
      if (currentFileIndex + 1 < pendingFiles.length) {
        const nextIndex = currentFileIndex + 1;
        setCurrentFileIndex(nextIndex);
        await processFileUploadAndDetect(pendingFiles[nextIndex]);
      } else {
        // All files processed
        handleCancelUpload();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Supprimer ce produit?')) return;

    try {
      const response = await fetch(
        `/api/v1/products/${productId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Produit supprimé');
      mutate();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Produits
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {data?.pagination?.total || 0} produit(s) dans votre bibliothèque
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter des produits</DialogTitle>
                <DialogDescription>
                  Uploadez vos photos de produits (JPG, PNG)
                </DialogDescription>
              </DialogHeader>
              {/* Loading state */}
              {(uploading || detecting || analyzing) ? (
                <div className="mt-4 border-2 border-violet-300 bg-violet-50 rounded-xl p-8 text-center">
                  {detecting ? (
                    <ScanSearch className="h-12 w-12 text-violet-500 animate-pulse mx-auto mb-4" />
                  ) : (
                    <Loader2 className="h-12 w-12 text-violet-500 animate-spin mx-auto mb-4" />
                  )}
                  <p className="text-violet-800 font-medium">
                    {uploading ? 'Upload en cours...' : detecting ? 'Détection et segmentation...' : 'Analyse du produit...'}
                  </p>
                  <p className="text-sm text-violet-600 mt-2">
                    {uploading
                      ? "L'image est en cours d'envoi"
                      : detecting
                      ? "Moondream détecte et segmente les produits"
                      : "Gemini analyse les caractéristiques du produit"}
                  </p>
                </div>
              ) : (
                <div
                  className={`
                    mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${dragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Glissez vos images ou cliquez pour sélectionner
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      JPG, PNG jusqu'à 10MB
                    </p>
                  </label>
                </div>
              )}
            </DialogContent>
          </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="aspect-square" />
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.products?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.products.map((product: Product) => (
            <Card key={product.id} className="group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => {
                      const images = data.products.map((p: Product) => ({
                        url: p.originalUrl || p.thumbnailUrl,
                        alt: p.name || 'Product',
                        id: p.id,
                      }));
                      const index = data.products.findIndex((p: Product) => p.id === product.id);
                      openPreview(images, index);
                    }}
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    <div className="pointer-events-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const images = data.products.map((p: Product) => ({
                            url: p.originalUrl || p.thumbnailUrl,
                            alt: p.name || 'Product',
                            id: p.id,
                          }));
                          const index = data.products.findIndex((p: Product) => p.id === product.id);
                          openPreview(images, index);
                        }}
                      >
                        <Expand className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      <Button size="sm" asChild variant="secondary">
                        <Link href={`/studio?product=${product.id}`}>
                          <Zap className="h-4 w-4 mr-1" />
                          Générer
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/studio?product=${product.id}`}>
                            <Zap className="h-4 w-4 mr-2" />
                            Générer
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {product.name || 'Sans nom'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Aucun produit
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-sm mb-6">
              Ajoutez vos premiers produits pour commencer à générer des photos.
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter des produits
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      <ImagePreview
        images={previewState.images}
        initialIndex={previewState.index}
        open={previewState.open}
        onOpenChange={setPreviewOpen}
      />

      {/* Product Analysis & Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={(open) => !open && handleCancelUpload()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Analyse du produit
              {pendingFiles.length > 1 && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({currentFileIndex + 1}/{pendingFiles.length})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image preview */}
            {pendingImageUrl && (
              <div className="relative h-[160px] bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={pendingImageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Analysis results */}
            {pendingAnalysis && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
                <p className="text-xs text-violet-600 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Ce que j'ai détecté :
                </p>

                {/* Category */}
                {pendingAnalysis.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">
                      {pendingAnalysis.category}
                      {pendingAnalysis.subcategory && ` • ${pendingAnalysis.subcategory}`}
                    </span>
                  </div>
                )}

                {/* Description */}
                {pendingAnalysis.description && (
                  <p className="text-sm text-slate-700">{pendingAnalysis.description}</p>
                )}

                {/* Colors and Materials */}
                <div className="flex flex-wrap gap-1.5">
                  {pendingAnalysis.colors?.map((color: string) => (
                    <span
                      key={color}
                      className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600"
                    >
                      {color}
                    </span>
                  ))}
                  {pendingAnalysis.materials?.map((mat: string) => (
                    <span
                      key={mat}
                      className="text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-700"
                    >
                      {mat}
                    </span>
                  ))}
                </div>

                {/* Suggested contexts */}
                {pendingAnalysis.suggestedContexts?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-slate-500 mb-1">Contextes suggérés :</p>
                    <p className="text-xs text-slate-600">
                      {pendingAnalysis.suggestedContexts.slice(0, 3).join(' • ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="ex: Sac à main Elegance, Robe Dakar..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && newProductName.trim() && handleConfirmUpload()}
              />
              <p className="text-xs text-slate-500">
                {pendingAnalysis?.name
                  ? "Nom suggéré par l'IA. Vous pouvez le modifier si besoin."
                  : "Donnez un nom descriptif à votre produit"}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelUpload}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={!newProductName.trim()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Product Selection Dialog */}
      <Dialog open={showProductSelectionDialog} onOpenChange={(open) => !open && handleCancelUpload()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-violet-500" />
              Plusieurs produits détectés
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les produits que vous souhaitez ajouter à votre bibliothèque
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image with detected products highlighted */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ minHeight: '250px', maxHeight: '400px' }}>
              {/* Debug info - remove after testing */}
              {!pendingImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                  Image URL non disponible
                </div>
              )}

              {/* Image container - centers the image */}
              {pendingImageUrl && (
                <div className="flex items-center justify-center h-full" style={{ minHeight: '250px' }}>
                  <div className="relative inline-block max-w-full max-h-[400px]">
                    {/* The actual image */}
                    <img
                      src={pendingImageUrl}
                      alt="Uploaded product"
                      className="block max-w-full max-h-[400px] h-auto w-auto"
                      style={{ objectFit: 'contain' }}
                    />

                    {/* Dark overlay for better visibility of highlights */}
                    <div className="absolute inset-0 bg-black/30 pointer-events-none" />

                    {/* Single SVG overlay for ALL product paths - uses full image coordinates */}
                    <svg
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ overflow: 'visible' }}
                    >
                      {detectedProducts.map((product, idx) => {
                        const colors = ['#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];
                        const color = colors[idx % colors.length];
                        const isSelected = selectedProductIds.includes(product.id);

                        if (!product.svgPath) return null;

                        return (
                          <path
                            key={product.id}
                            d={product.svgPath}
                            fill={isSelected ? `${color}40` : `${color}20`}
                            stroke={color}
                            strokeWidth="0.008"
                            className="cursor-pointer"
                            style={{
                              pointerEvents: 'all',
                              filter: isSelected ? `drop-shadow(0 0 6px ${color})` : `drop-shadow(0 0 3px ${color})`,
                            }}
                            onClick={() => toggleProductSelection(product.id)}
                          />
                        );
                      })}
                    </svg>

                    {/* Bounding box overlays for labels and fallback highlighting */}
                    {detectedProducts.map((product, idx) => {
                      const colors = ['#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];
                      const color = colors[idx % colors.length];
                      const isSelected = selectedProductIds.includes(product.id);

                      // Clamp bbox values to 0-1 range
                      const bbox = {
                        x_min: Math.max(0, Math.min(1, product.bbox?.x_min ?? 0)),
                        y_min: Math.max(0, Math.min(1, product.bbox?.y_min ?? 0)),
                        x_max: Math.max(0, Math.min(1, product.bbox?.x_max ?? 1)),
                        y_max: Math.max(0, Math.min(1, product.bbox?.y_max ?? 1)),
                      };

                      return (
                        <div
                          key={product.id}
                          onClick={() => toggleProductSelection(product.id)}
                          className="absolute cursor-pointer"
                          style={{
                            left: `${bbox.x_min * 100}%`,
                            top: `${bbox.y_min * 100}%`,
                            width: `${(bbox.x_max - bbox.x_min) * 100}%`,
                            height: `${(bbox.y_max - bbox.y_min) * 100}%`,
                            zIndex: isSelected ? 30 : 20,
                          }}
                        >
                          {/* Fallback: colored border box when no SVG path */}
                          {!product.svgPath && (
                            <div
                              className="absolute inset-0 rounded transition-all"
                              style={{
                                border: `3px solid ${color}`,
                                backgroundColor: isSelected ? `${color}35` : `${color}15`,
                                boxShadow: `0 0 0 1px ${color}, inset 0 0 20px ${color}30`,
                              }}
                            />
                          )}

                          {/* Product label badge */}
                          <div
                            className="absolute -top-7 left-0 px-2 py-1 text-xs font-semibold rounded shadow-lg whitespace-nowrap max-w-[150px] truncate"
                            style={{
                              backgroundColor: color,
                              color: 'white',
                            }}
                          >
                            {idx + 1}. {product.description}
                          </div>

                          {/* Selection indicator */}
                          {isSelected && (
                            <div
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                              style={{ backgroundColor: color }}
                            >
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Product list */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                {detectedProducts.length} produit(s) détecté(s) - cliquez sur l'image ou la liste pour sélectionner :
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                {detectedProducts.map((product, idx) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  // Match colors with image labels: violet, green, orange, pink, cyan
                  const borderColors = [
                    'border-violet-500',
                    'border-green-500',
                    'border-orange-500',
                    'border-pink-500',
                    'border-cyan-500',
                  ];
                  const bgColors = [
                    'bg-violet-50',
                    'bg-green-50',
                    'bg-orange-50',
                    'bg-pink-50',
                    'bg-cyan-50',
                  ];
                  const dotColors = [
                    'bg-violet-500',
                    'bg-green-500',
                    'bg-orange-500',
                    'bg-pink-500',
                    'bg-cyan-500',
                  ];

                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        isSelected
                          ? `${borderColors[idx % borderColors.length]} ${bgColors[idx % bgColors.length]}`
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      {/* Color indicator matching bounding box */}
                      <div
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                          dotColors[idx % dotColors.length]
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{product.description}</p>
                      </div>
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? `${borderColors[idx % borderColors.length]} ${dotColors[idx % dotColors.length]}`
                            : 'border-slate-300'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductIds(detectedProducts.map(p => p.id))}
              >
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductIds([])}
              >
                Tout désélectionner
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelUpload}>
              Annuler
            </Button>
            <Button
              onClick={handleProductSelection}
              disabled={selectedProductIds.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Continuer avec {selectedProductIds.length} produit(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Name Editing Dialog - Step 2 after selection */}
      <Dialog open={showNameEditStep} onOpenChange={(open) => !open && handleCancelUpload()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5 text-violet-500" />
              Nommer vos produits
            </DialogTitle>
            <DialogDescription>
              Donnez un nom à chaque produit sélectionné
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {detectedProducts
              .filter(p => selectedProductIds.includes(p.id))
              .map((product, idx) => {
                const colors = ['border-violet-300 bg-violet-50', 'border-green-300 bg-green-50', 'border-orange-300 bg-orange-50', 'border-pink-300 bg-pink-50', 'border-cyan-300 bg-cyan-50'];
                const dotColors = ['bg-violet-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

                return (
                  <div key={product.id} className={cn('p-3 rounded-lg border-2', colors[idx % colors.length])}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold', dotColors[idx % dotColors.length])}>
                        {idx + 1}
                      </div>
                      <span className="text-sm text-slate-500">
                        Détecté : {product.description}
                      </span>
                    </div>
                    <Input
                      value={productNames[product.id] || ''}
                      onChange={(e) => setProductNames(prev => ({ ...prev, [product.id]: e.target.value }))}
                      placeholder="Nom du produit..."
                      className="bg-white"
                    />
                  </div>
                );
              })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowNameEditStep(false);
              setShowProductSelectionDialog(true);
            }}>
              Retour
            </Button>
            <Button
              onClick={handleSaveWithNames}
              disabled={detectedProducts.filter(p => selectedProductIds.includes(p.id)).some(p => !productNames[p.id]?.trim())}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Enregistrer {selectedProductIds.length} produit(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
