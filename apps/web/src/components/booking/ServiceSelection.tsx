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
      <h2 className="text-lg font-semibold px-1">1. ¿Qué te vas a hacer hoy?</h2>
      <div className="grid gap-3">
        {servicios.map((s) => {
          const isSelected = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-transparent bg-white shadow-sm hover:border-gray-200'
              }`}
              aria-pressed={isSelected}
            >
              <div>
                <p className="font-semibold text-base">{s.nombre}</p>
                <p className="text-sm text-gray-500">{s.duracionMinutos} min</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-semibold">${s.precioBase}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-300'
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
