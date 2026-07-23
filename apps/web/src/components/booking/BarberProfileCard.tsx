'use client';
import { Barbero } from '@/lib/types';
import { Check, Scissors, Sparkles } from 'lucide-react';

interface Props {
  barbero: Barbero;
}

export function BarberProfileCard({ barbero }: Props) {
  const inicial = barbero.nombre.charAt(0).toUpperCase();

  return (
    <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <Scissors size={18} className="text-primary" />
          <span>2. Tu profesional de atención</span>
        </h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Especialista Asignado
        </span>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-background shadow-md flex items-center gap-4 relative overflow-hidden">
        {/* Glow de fondo discreto */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>

        {/* Avatar del Barbero */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-md border border-primary-foreground/20">
            {barbero.fotoUrl ? (
              <img src={barbero.fotoUrl} alt={barbero.nombre} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span>{inicial}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-sm border-2 border-background">
            <Check size={12} strokeWidth={3} />
          </div>
        </div>

        {/* Detalles del Barbero */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-foreground truncate">{barbero.nombre}</h3>
            <Sparkles size={14} className="text-amber-500 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Barbero Profesional & Especialista</p>
          <div className="pt-1 flex items-center gap-2">
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
              ✔ Seleccionado automáticamente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
