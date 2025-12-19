'use client';

import { useWizardStore } from '@/lib/stores/wizard-store';
import { StepBrand } from './steps/step-brand';
import { StepProducts } from './steps/step-products';
import { StepPresentation } from './steps/step-presentation';
import { StepScene } from './steps/step-scene';
import { StepMoodboard } from './steps/step-moodboard';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { num: 1, title: 'Marque', component: StepBrand },
  { num: 2, title: 'Produits', component: StepProducts },
  { num: 3, title: 'Présentation', component: StepPresentation },
  { num: 4, title: 'Lieu (Scène)', component: StepScene },
  { num: 5, title: 'Générer', component: StepMoodboard },
];

export function WizardPanel() {
  const { currentStep, completedSteps, goToStep } = useWizardStore();

  return (
    <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      {STEPS.map((step) => {
        const isActive = currentStep === step.num;
        const isCompleted = completedSteps.includes(step.num);
        const StepComponent = step.component;

        return (
          <div
            key={step.num}
            className={cn('border-b border-slate-200 transition-all', {
              'bg-slate-50': isActive,
            })}
          >
            {/* Step Header */}
            <div
              className={cn(
                'px-5 py-4 flex justify-between items-center cursor-pointer transition-colors',
                'hover:bg-slate-50',
                isActive && 'bg-slate-50'
              )}
              onClick={() => goToStep(step.num)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center',
                    'text-xs font-bold',
                    isActive && 'bg-violet-600 text-white',
                    isCompleted && !isActive && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-slate-200 text-slate-500'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold uppercase tracking-wide',
                    isActive ? 'text-slate-900' : 'text-slate-600'
                  )}
                >
                  {step.title}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  isActive && 'rotate-180'
                )}
              />
            </div>

            {/* Step Content */}
            {isActive && (
              <div className="px-5 pb-5 pt-2 bg-white border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                <StepComponent />
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
