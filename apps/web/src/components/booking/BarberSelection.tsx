'use client';
import { Barbero } from '@/lib/types';
import { Check, UserCircle2 } from 'lucide-react';

interface Props {
  barberos: Barbero[];
  selectedId?: string | null; // null significa "Cualquiera"
  onSelect: (id: string | null) => void;
}

export function BarberSelection({ barberos, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-base sm:text-lg font-bold px-1 text-foreground">2. Elige a tu barbero</h2>
      
      {/* Grilla Responsiva para Barberos (Desktop y Mobile Grid) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        
        {/* Opción especial: Cualquiera */}
        <button
          onClick={() => onSelect(null)}
          className={`flex flex-col items-center space-y-2 p-3 rounded-2xl border-2 transition-all ${
            selectedId === null ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:bg-secondary/50'
          }`}
          aria-pressed={selectedId === null}
        >
          <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 ${
            selectedId === null ? 'border-primary text-primary bg-card' : 'border-border text-muted-foreground bg-secondary'
          }`}>
            <UserCircle2 size={32} strokeWidth={1.5} />
            {selectedId === null && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check size={12} strokeWidth={4} />
              </div>
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-center leading-tight text-foreground">Cualquiera</span>
        </button>

        {/* Mapeo de barberos reales */}
        {barberos.map((b) => {
          const isSelected = selectedId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`flex flex-col items-center space-y-2 p-3 rounded-2xl border-2 transition-all ${
                isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:bg-secondary/50'
              }`}
              aria-pressed={isSelected}
            >
              <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 bg-card ${
                isSelected ? 'border-primary' : 'border-border'
              }`}>
                {b.fotoUrl ? (
                  <img src={b.fotoUrl} alt={b.nombre} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">{b.nombre.charAt(0)}</span>
                )}
                
                {isSelected && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-center leading-tight text-foreground">{b.nombre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
