'use client';
import { Servicio, ComboPublico } from '@/lib/types';
import { Check, Layers } from 'lucide-react';

interface Props {
  servicios: Servicio[];
  combos?: ComboPublico[];
  selectedServicioId?: string;
  selectedComboId?: string;
  onSelectServicio: (id: string) => void;
  onSelectCombo: (id: string) => void;
}

export function ServiceSelection({ servicios, combos = [], selectedServicioId, selectedComboId, onSelectServicio, onSelectCombo }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-base sm:text-lg font-bold px-1 text-foreground">¿Qué te vas a hacer hoy?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {servicios.map((s) => {
          const isSelected = selectedServicioId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectServicio(s.id)}
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

        {combos.map((c) => {
          const isSelected = selectedComboId === c.id;
          const duracion = c.duracionAjustadaMinutos || c.servicios.reduce((t, cs) => t + cs.servicio.duracionMinutos, 0);
          return (
            <button
              key={c.id}
              onClick={() => onSelectCombo(c.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-amber-500/40 bg-amber-500/5 shadow-xs hover:border-amber-500'
              }`}
              aria-pressed={isSelected}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="font-semibold text-sm sm:text-base text-foreground">{c.nombre}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.servicios.map((cs) => cs.servicio.nombre).join(' + ')} · {duracion} min
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400">${c.precioTotal}</span>
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
