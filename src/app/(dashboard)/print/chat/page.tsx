'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { chatAPI, ChatSession, ChatMessage, ExtractedOrder } from '@/lib/print/api-client';

export default function PrintChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(true);
  const [extractedOrder, setExtractedOrder] = useState<ExtractedOrder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    try {
      const newSession = await chatAPI.createSession();
      setSession(newSession);
      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          session_id: newSession.id,
          role: 'assistant',
          content: `Bonjour ! Je suis votre assistant impression. 🎨

Je peux vous aider à:
• Commander des t-shirts, casquettes, flyers, cartes de visite...
• Créer des designs personnalisés avec l'IA
• Obtenir des devis instantanés ou sur mesure

Décrivez-moi ce dont vous avez besoin !`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(session.id, userMessage.content);
      setMessages((prev) => [...prev, response]);

      // Try to extract order after each message
      try {
        const extraction = await chatAPI.extractOrder(session.id);
        if (extraction.extracted_order && extraction.extracted_order.items.length > 0) {
          setExtractedOrder(extraction.extracted_order);
        }
      } catch {
        // Extraction not ready yet
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          session_id: session.id,
          role: 'assistant',
          content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    '50 t-shirts blancs avec mon logo',
    '100 cartes de visite professionnelles',
    '200 flyers A5 pour un événement',
    'Des casquettes personnalisées',
  ];

  if (isCreatingSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" />
          <p className="text-slate-500">Initialisation de l'assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/print">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Assistant Impression</h1>
            <p className="text-sm text-slate-500">Décrivez votre commande en langage naturel</p>
          </div>
        </div>
        {extractedOrder && extractedOrder.items.length > 0 && (
          <Button className="bg-violet-600 hover:bg-violet-700">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Voir la commande ({extractedOrder.items.length})
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Extracted Order Preview */}
      {extractedOrder && extractedOrder.items.length > 0 && (
        <Card className="mb-4 border-violet-200 bg-violet-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="font-medium text-violet-900">Commande détectée</span>
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                {Math.round(extractedOrder.confidence * 100)}% confiance
              </Badge>
            </div>
            <div className="space-y-2">
              {extractedOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {item.quantity}x {item.product_name}
                  </span>
                  {item.matched_product_id && (
                    <Badge variant="outline" className="text-xs">
                      Produit trouvé
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Suggestions rapides:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" size="icon" className="shrink-0">
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Décrivez ce dont vous avez besoin..."
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="shrink-0 bg-violet-600 hover:bg-violet-700"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
