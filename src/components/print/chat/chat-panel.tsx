'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Upload, MoreVertical, Image, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, imageUrl?: string) => void;
  onGenerateStyle?: () => void;
  onUploadFile?: (file: File) => Promise<string | null>;
  isLoading?: boolean;
  isUploading?: boolean;
  className?: string;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onGenerateStyle,
  onUploadFile,
  isLoading,
  isUploading,
  className,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !pendingImage) || isLoading || isUploading) return;

    let imageUrl: string | undefined;

    // Upload image if there's one pending
    if (pendingImage && onUploadFile) {
      const uploadedUrl = await onUploadFile(pendingImage.file);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const messageContent = input.trim() || (pendingImage ? 'Voici mon fichier design' : '');
    if (messageContent) {
      onSendMessage(messageContent, imageUrl);
    }

    setInput('');
    setPendingImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Format non supporté. Utilisez PNG, JPG, WEBP ou PDF.');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setPendingImage({ file, preview });
    } else {
      // For PDFs, use a placeholder
      setPendingImage({ file, preview: '/pdf-placeholder.png' });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingImage = () => {
    if (pendingImage?.preview) {
      URL.revokeObjectURL(pendingImage.preview);
    }
    setPendingImage(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col h-full bg-white border-r', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Assistant Blooprint</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600">En ligne</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5 text-slate-400" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-2 shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-900 rounded-bl-md'
              )}>
                {message.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={message.imageUrl}
                      alt="Design"
                      className="max-w-full rounded-lg max-h-40 object-contain"
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
            {message.role === 'user' && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Lu {formatTime(message.timestamp)}</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-2 flex gap-2">
        <Button variant="outline" size="sm" className="text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={onGenerateStyle}>
          <Sparkles className="h-3.5 w-3.5" />
          Générer un design IA
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          Télécharger mon logo
        </Button>
      </div>

      {/* Pending Image Preview */}
      {pendingImage && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img
              src={pendingImage.preview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-lg border-2 border-emerald-500"
            />
            <button
              onClick={removePendingImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">{pendingImage.file.name}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5 text-slate-400" />
            )}
          </Button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImage ? "Ajoute un message (optionnel)..." : "Écrivez votre message..."}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-slate-400"
            disabled={isLoading || isUploading}
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700 shrink-0"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingImage) || isLoading || isUploading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
