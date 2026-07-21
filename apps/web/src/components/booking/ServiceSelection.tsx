'use client';
import { Servicio } from '@/lib/types';
import { Check } from 'lucide-react';

interface Props {
  servicios: Servicio[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ServiceSelection({ servicios, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-base sm:text-lg font-bold px-1 text-foreground">1. ¿Qué te vas a hacer hoy?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {servicios.map((s) => {
          const isSelected = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border bg-card shadow-xs hover:border-primary/50'
              }`}
              aria-pressed={isSelected}
            >
              <div>
                <p className="font-semibold text-sm sm:text-base text-foreground">{s.nombre}</p>
                <p className="text-xs text-muted-foreground">{s.duracionMinutos} min</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400">${s.precioBase}</span>
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                }`}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
