'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/stores/wizard-store';
import { WizardPanel } from '@/components/studio/wizard-panel';
import { CanvasPreview } from '@/components/studio/canvas-preview';
import { Layers, RotateCcw, ArrowLeft, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  creditUnits: number;
}

export default function StudioPage() {
  const router = useRouter();
  const { reset, products, generatedImages } = useWizardStore();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Fetch user data
    fetch('/api/v1/user')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error);
  }, []);

  const handleReset = () => {
    reset();
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const hasContent = products.length > 0 || generatedImages.length > 0;
  const credits = user ? Math.floor(user.creditUnits / 100) : 0;
  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <Layers className="h-5 w-5 text-violet-600" />
            <span className="text-slate-900">Studio Pro</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}

          {/* Credits */}
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Coins className="h-4 w-4" />
            <span>{credits} crédits</span>
          </div>

          {/* User Avatar */}
          <Avatar className="h-9 w-9 bg-violet-600">
            <AvatarFallback className="bg-violet-600 text-white text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Wizard Panel */}
        <WizardPanel />

        {/* Right: Canvas Preview */}
        <CanvasPreview />
      </div>
    </div>
  );
}
