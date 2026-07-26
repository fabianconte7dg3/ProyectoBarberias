'use client';
import { parse, format, addMinutes } from 'date-fns';
import { Check, Sunrise, Sun, Moon } from 'lucide-react';

interface Props {
  slots: string[]; // "HH:mm", ya calculados (ver lib/disponibilidad.ts)
  selectedTime?: string;
  onSelect: (time: string) => void;
  duracionMinutos: number;
  loading?: boolean;
}

// Agrupación puramente presentacional de los slots ya calculados por hora del
// día — no cambia qué horarios existen, solo cómo se organizan visualmente
// (mismo criterio que el mockup de Stitch: Mañana / Tarde / Noche).
const GRUPOS: Array<{ label: string; icon: typeof Sunrise; enRango: (hora: number) => boolean }> = [
  { label: 'Mañana', icon: Sunrise, enRango: (h) => h < 12 },
  { label: 'Tarde', icon: Sun, enRango: (h) => h >= 12 && h < 19 },
  { label: 'Noche', icon: Moon, enRango: (h) => h >= 19 },
];

export function TimeSlotGrid({ slots, selectedTime, onSelect, duracionMinutos, loading }: Props) {
  if (loading) {
    return (
      <div className="text-center p-8 bg-muted rounded-2xl border-2 border-dashed border-border mt-6 mb-28">
        <p className="text-muted-foreground font-medium">Cargando horarios disponibles...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center p-8 bg-muted rounded-2xl border-2 border-dashed border-border mt-6 mb-28">
        <p className="text-muted-foreground font-medium">No hay horarios disponibles para este día.</p>
      </div>
    );
  }

  const gruposConSlots = GRUPOS.map((grupo) => ({
    ...grupo,
    slots: slots.filter((time) => grupo.enRango(parse(time, 'HH:mm', new Date()).getHours())),
  })).filter((g) => g.slots.length > 0);

  return (
    <div className="space-y-6 mt-8 mb-28">
      <h2 className="text-lg font-semibold px-1 text-foreground">¿A qué hora?</h2>

      {gruposConSlots.map((grupo) => {
        const Icon = grupo.icon;
        return (
          <div key={grupo.label} className="space-y-3">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Icon size={14} />
              <span>{grupo.label}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-1">
              {grupo.slots.map((time) => {
                const isSelected = selectedTime === time;

                // Calcular hora de inicio y fin (usando la duración del servicio)
                const startTimeObj = parse(time, 'HH:mm', new Date());
                const endTimeObj = addMinutes(startTimeObj, duracionMinutos);
                const endTime = format(endTimeObj, 'hh:mm a');
                const displayStart = format(startTimeObj, 'hh:mm a');

                return (
                  <button
                    key={time}
                    onClick={() => onSelect(time)}
                    className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {displayStart}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      hasta {endTime}
                    </span>

                    {isSelected && (
                      <div className="absolute top-2 right-2 text-primary">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
