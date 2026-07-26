'use client';
import { Check } from 'lucide-react';

interface Props {
  steps: string[];
  currentStep: number; // 0-indexed
}

export function BookingStepper({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
      {steps.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={label} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors ${
                  isDone
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                    ? 'border-primary text-primary bg-card'
                    : 'border-border text-muted-foreground bg-card'
                }`}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`text-[11px] sm:text-sm font-semibold whitespace-nowrap ${
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-4 sm:w-8 h-0.5 shrink-0 rounded-full ${isDone ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
