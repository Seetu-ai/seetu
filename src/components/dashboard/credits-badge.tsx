'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';
import { useCredits } from '@/hooks/useUser';

export function CreditsBadge() {
  const { credits } = useCredits();

  return (
    <Link href="/credits">
      <Button variant="outline" size="sm" className="gap-2">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="font-semibold">{credits}</span>
        <span className="hidden sm:inline text-slate-500">crédits</span>
      </Button>
    </Link>
  );
}
