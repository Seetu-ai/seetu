'use client';

import { Check, CreditCard, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStepperProps {
  currentStep: number;
}

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  const steps = [
    { id: 'order', label: 'Commande créée', icon: Check },
    { id: 'payment', label: 'Paiement', sublabel: '(vous êtes ici)', icon: CreditCard },
    { id: 'production', label: 'Production', sublabel: '(3-5 jours)', icon: Package },
    { id: 'delivery', label: 'Livraison', sublabel: '(Dakar)', icon: Truck },
  ];

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;
        const status = currentStep > index ? 'completed' : currentStep === index ? 'current' : 'upcoming';

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                status === 'completed' && 'bg-emerald-100 text-emerald-600',
                status === 'current' && 'bg-emerald-600 text-white',
                status === 'upcoming' && 'bg-slate-100 text-slate-400'
              )}>
                {status === 'completed' ? <Check className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="mt-2 text-center">
                <p className={cn('text-sm font-medium', status === 'current' ? 'text-emerald-600' : 'text-slate-600')}>{step.label}</p>
                {step.sublabel && <p className="text-xs text-slate-400">{step.sublabel}</p>}
              </div>
            </div>
            {!isLast && <div className={cn('w-20 h-0.5 mx-2 mt-[-24px]', status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200')} />}
          </div>
        );
      })}
    </div>
  );
}
