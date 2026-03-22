'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingBag } from 'lucide-react';
import { ChatPanel } from '@/components/print/chat/chat-panel';
import { OrderBuilder } from '@/components/print/builder/order-builder';
import { OrderItem } from '@/components/print/builder/order-item-card';
import { chatAPI, ChatSession, ExtractedOrder, uploadAPI, designAPI, ordersAPI, productsAPI } from '@/lib/print/api-client';
import { toast } from 'sonner';

interface DesignOption {
  id: string;
  imageUrl: string;
  label: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

export default function PrintBuilderPage() {
  const router = useRouter();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(true);
  const [uploadedDesignUrl, setUploadedDesignUrl] = useState<string | null>(null);
  const [generatingDesigns, setGeneratingDesigns] = useState<Record<string, boolean>>({});
  const [designOptions, setDesignOptions] = useState<Record<string, DesignOption[]>>({});

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const newSession = await chatAPI.createSession();
      setSession(newSession);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour ! 👋 Je suis Bloo, ton assistant Blooprint.\n\nJe peux t'aider à commander des impressions personnalisées : t-shirts, casquettes, flyers, cartes de visite, roll-ups et bien plus !\n\nDis-moi ce dont tu as besoin.`,
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Failed to create session:', error);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour ! 👋 Bienvenue sur votre créateur de devis.\n\n⚠️ Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async (content: string, imageUrl?: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Store uploaded design URL if there's one
    if (imageUrl) {
      setUploadedDesignUrl(imageUrl);
    }

    try {
      if (!session) {
        throw new Error('No session');
      }

      // Send message to AI with image URLs if present
      const imageUrls = imageUrl ? [imageUrl] : [];
      const response = await chatAPI.sendMessage(session.id, content, imageUrls);

      setMessages((prev) => [...prev, {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: response.created_at,
      }]);

      // Try to extract order from conversation
      try {
        const extraction = await chatAPI.extractOrder(session.id);
        if (extraction.extracted_order && extraction.extracted_order.items.length > 0) {
          updateItemsFromExtraction(extraction.extracted_order);
        }
      } catch {
        // Order extraction not ready yet - that's fine
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Désolé, je n'ai pas pu traiter ton message. Réessaie s'il te plaît.`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const result = await uploadAPI.uploadFile(file);
      toast.success('Fichier téléchargé avec succès');
      return result.url;
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Échec du téléchargement. Réessayez.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateDesign = () => {
    // Add a message asking for design generation
    handleSendMessage("Je voudrais générer un design avec l'IA pour mon produit");
  };

  const handleGenerateDesignForItem = async (itemId: string, productName: string): Promise<DesignOption[]> => {
    setGeneratingDesigns((prev) => ({ ...prev, [itemId]: true }));
    try {
      // Find the item to get its design brief
      const item = items.find(i => i.id === itemId);
      const designBrief = item?.designBrief;

      // Pass the design brief as prompt to include user's specific request
      const result = await designAPI.generateForProduct(productName, designBrief);
      const options: DesignOption[] = result.designs.map((d, i) => ({
        id: d.id,
        imageUrl: d.image_url, // Photorealistic product mockup with design
        label: `Design ${i + 1}`,
      }));
      setDesignOptions((prev) => ({ ...prev, [itemId]: options }));
      toast.success(`${options.length} designs générés avec succès!`);
      return options;
    } catch (error) {
      console.error('Failed to generate designs:', error);
      toast.error('Échec de la génération. Réessayez.');
      return [];
    } finally {
      setGeneratingDesigns((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleUploadForItem = (itemId: string) => {
    // Trigger a file dialog and upload for a specific item
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const result = await uploadAPI.uploadFile(file);
        // Update the item with the uploaded design
        setItems((prev) => prev.map((item) =>
          item.id === itemId
            ? { ...item, designUrl: result.url, status: 'ready' as const }
            : item
        ));
        toast.success('Design téléchargé avec succès');
      } catch (error) {
        console.error('Failed to upload:', error);
        toast.error('Échec du téléchargement');
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const updateItemsFromExtraction = async (extracted: ExtractedOrder) => {
    const newItems: OrderItem[] = await Promise.all(
      extracted.items.map(async (item, index) => {
        // Try to get real price from API if we have a matched product
        let price = calculatePrice(item.product_name, item.quantity);
        if (item.matched_product_id) {
          try {
            const priceResult = await productsAPI.calculatePrice(
              item.matched_product_id,
              item.quantity,
              item.specifications
            );
            price = priceResult.client_price || price;
          } catch {
            // Fall back to estimated price
          }
        }

        // Build design brief from conversation summary and item description
        const designBrief = extracted.conversation_summary || item.file_description || '';

        return {
          id: `item-${index}-${Date.now()}`,
          productId: item.matched_product_id,
          productName: item.product_name,
          quantity: item.quantity,
          specifications: Object.entries(item.specifications || {})
            .map(([, v]) => `${v}`)
            .join(' • ') || 'Standard',
          specificationsObject: item.specifications,
          price,
          // If we have an uploaded design, use it; otherwise mark as needs_design
          status: (uploadedDesignUrl ? 'ready' : (item.matched_product_id ? 'in_progress' : 'needs_design')) as 'ready' | 'in_progress' | 'needs_design',
          designUrl: uploadedDesignUrl || undefined,
          designBrief, // Store user's design request for AI generation
        };
      })
    );
    setItems(newItems);
  };

  // Calculate estimated prices
  const calculatePrice = (productName: string, quantity: number): number => {
    const basePrices: Record<string, number> = {
      't-shirt': 3500,
      'polo': 5500,
      'casquette': 4500,
      'flyer': 50,
      'carte': 150,
      'affiche': 500,
      'roll-up': 35000,
      'bâche': 8000,
      'kakémono': 25000,
      'boîte': 2000,
    };

    const name = productName.toLowerCase();
    for (const [key, basePrice] of Object.entries(basePrices)) {
      if (name.includes(key)) {
        return basePrice * quantity;
      }
    }
    return 5000 * quantity;
  };

  const handleItemDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDesignSelect = (itemId: string, designId: string) => {
    setItems((prev) => prev.map((item) =>
      item.id === itemId ? { ...item, designUrl: designId, status: 'ready' as const } : item
    ));
  };

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Ajoutez des articles avant de continuer');
      return;
    }

    setIsCreatingOrder(true);
    try {
      // Create real order in database
      const order = await ordersAPI.create({
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          specifications: item.specificationsObject,
          client_price: item.price,
          file_ready: item.status === 'ready',
        })),
        chat_session_id: session?.id,
        entry_point: 'chat',
      });

      toast.success('Commande cr\u00e9\u00e9e avec succ\u00e8s');
      router.push(`/print/checkout?orderId=${order.id}`);
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error('\u00c9chec de la cr\u00e9ation de la commande. R\u00e9essayez.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isCreatingSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-slate-500">Initialisation de l'assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-6 -mt-6">
      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onUploadFile={handleFileUpload}
        onGenerateStyle={handleGenerateDesign}
        isLoading={isLoading}
        isUploading={isUploading}
        className="w-[380px] shrink-0"
      />

      {/* Order Builder or Empty State */}
      <div className="flex-1 p-6 bg-slate-50 overflow-hidden">
        {items.length > 0 ? (
          <OrderBuilder
            items={items}
            onItemDelete={handleItemDelete}
            onDesignSelect={handleDesignSelect}
            onDesignGenerate={handleGenerateDesignForItem}
            onDesignUpload={handleUploadForItem}
            onCheckout={handleCheckout}
            generatingDesigns={generatingDesigns}
            designOptions={designOptions}
            isLoading={isCreatingOrder}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Votre commande est vide
            </h2>
            <p className="text-slate-500 max-w-sm">
              Discutez avec l'assistant pour ajouter des produits à votre commande.
              Décrivez simplement ce dont vous avez besoin !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
