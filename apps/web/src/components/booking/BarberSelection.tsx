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
    <div className="space-y-4 mt-10">
      <h2 className="text-lg font-semibold px-1">2. Elige a tu barbero</h2>
      
      {/* Carrusel horizontal para barberos (Mobile UX) */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x px-1 no-scrollbar">
        
        {/* Opción especial: Cualquiera */}
        <button
          onClick={() => onSelect(null)}
          className={`snap-start flex-shrink-0 w-24 flex flex-col items-center space-y-2 p-2 rounded-2xl border-2 transition-all ${
            selectedId === null ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'
          }`}
          aria-pressed={selectedId === null}
        >
          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 ${
            selectedId === null ? 'border-primary text-primary bg-white' : 'border-gray-200 text-gray-400 bg-white'
          }`}>
            <UserCircle2 size={32} strokeWidth={1.5} />
            {selectedId === null && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check size={12} strokeWidth={4} />
              </div>
            )}
          </div>
          <span className="text-sm font-medium text-center leading-tight">Cualquiera</span>
        </button>

        {/* Mapeo de barberos reales */}
        {barberos.map((b) => {
          const isSelected = selectedId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`snap-start flex-shrink-0 w-24 flex flex-col items-center space-y-2 p-2 rounded-2xl border-2 transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'
              }`}
              aria-pressed={isSelected}
            >
              <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 bg-white ${
                isSelected ? 'border-primary' : 'border-gray-200'
              }`}>
                {b.fotoUrl ? (
                  <img src={b.fotoUrl} alt={b.nombre} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-gray-400">{b.nombre.charAt(0)}</span>
                )}
                
                {isSelected && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-center leading-tight">{b.nombre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
