import React, { useEffect, useState } from 'react';
import { isSameDay } from 'date-fns';
import { CitaAgenda, CitaCard } from './CitaCard';
import { User } from 'lucide-react';

interface BarberoColumn {
  id: string;
  nombreCompleto: string;
  rol: string;
}

interface TimelineGridProps {
  barberos: BarberoColumn[];
  citas: CitaAgenda[];
  selectedDate: Date;
  currentUserId: string;
  currentUserRole: string;
  onStatusChange: (citaId: string, nuevoEstado: CitaAgenda['estado']) => void;
  onCobrarClick?: (cita: CitaAgenda) => void;
}

const START_HOUR = 8; // 08:00 AM
const END_HOUR = 20;  // 08:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function TimelineGrid({
  barberos,
  citas,
  selectedDate,
  currentUserId,
  currentUserRole,
  onStatusChange,
  onCobrarClick,
}: TimelineGridProps) {
  const [nowPercent, setNowPercent] = useState<number | null>(null);

  // Calcular la posición de la barra "NOW"
  useEffect(() => {
    function calculateNow() {
      const now = new Date();
      if (!isSameDay(now, selectedDate)) {
        setNowPercent(null);
        return;
      }

      const hours = now.getHours() + now.getMinutes() / 60;
      if (hours < START_HOUR || hours > END_HOUR) {
        setNowPercent(null);
        return;
      }

      const percent = ((hours - START_HOUR) / TOTAL_HOURS) * 100;
      setNowPercent(percent);
    }

    calculateNow();
    const interval = setInterval(calculateNow, 60000); // actualizar cada minuto
    return () => clearInterval(interval);
  }, [selectedDate]);

  const hoursArray = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="w-full flex-1 overflow-x-auto overflow-y-auto bg-background p-4">
      <div className="min-w-[768px] flex flex-col border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
        
        {/* Header con Nombres de Barberos */}
        <div className="flex border-b border-border bg-secondary/40 sticky top-0 z-20">
          {/* Columna de Horas Vacía */}
          <div className="w-20 shrink-0 border-r border-border p-3 flex items-center justify-center font-semibold text-xs text-muted-foreground">
            Hora
          </div>

          {/* Barberos Columns Headers */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-border">
            {barberos.map((barbero) => (
              <div key={barbero.id} className="p-3 flex items-center gap-2 justify-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <User size={14} />
                </div>
                <span className="font-semibold text-sm truncate">{barbero.nombreCompleto}</span>
                {barbero.id === currentUserId && (
                  <span className="text-[10px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded-full">
                    Tú
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo de la Grilla de Tiempo */}
        <div className="relative flex min-h-[600px]">
          
          {/* Columna Lateral de Horas */}
          <div className="w-20 shrink-0 border-r border-border divide-y divide-border/40 bg-secondary/10">
            {hoursArray.map((hour) => (
              <div key={hour} className="h-20 px-2 py-1 text-[11px] font-mono text-muted-foreground text-center">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Área de Columnas de Barberos con Citas */}
          <div className="flex-1 relative grid grid-flow-col auto-cols-fr divide-x divide-border">
            
            {/* Indicador "NOW" (Barra roja horizontal) */}
            {nowPercent !== null && (
              <div
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none transition-all duration-500"
                style={{ top: `${nowPercent}%` }}
              >
                <div className="w-3 h-3 rounded-full bg-rose-500 -ml-1.5 shadow-md shadow-rose-500/50" />
                <div className="flex-1 h-[2px] bg-rose-500" />
                <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded ml-1 shadow-sm">
                  AHORA
                </span>
              </div>
            )}

            {/* Columnas por Barbero */}
            {barberos.map((barbero) => {
              const citasBarbero = citas.filter((c) => c.barberoId === barbero.id);
              const canEdit = currentUserRole !== 'barbero' || barbero.id === currentUserId;

              return (
                <div key={barbero.id} className="relative h-full p-2 space-y-3">
                  {citasBarbero.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50 italic">
                      Sin citas programadas
                    </div>
                  ) : (
                    citasBarbero.map((cita) => (
                      <CitaCard
                        key={cita.id}
                        cita={cita}
                        onStatusChange={onStatusChange}
                        onCobrarClick={onCobrarClick}
                        canEdit={canEdit}
                      />
                    ))
                  )}
                </div>
              );
            })}

          </div>

        </div>

      </div>
    </div>
  );
}
