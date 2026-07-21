import React, { useEffect, useState, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll a la primera cita del día o a la hora actual
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    let targetHour = START_HOUR;

    if (citas && citas.length > 0) {
      const earliestTime = Math.min(
        ...citas.map((c) => new Date(c.inicioEstimado).getHours())
      );
      if (earliestTime >= START_HOUR && earliestTime <= END_HOUR) {
        targetHour = earliestTime;
      }
    } else {
      const currentHour = new Date().getHours();
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        targetHour = currentHour;
      }
    }

    const hourOffsetPixels = (targetHour - START_HOUR) * 120; // 120px por franja horaria
    scrollContainerRef.current.scrollTop = Math.max(0, hourOffsetPixels - 20);
  }, [citas, selectedDate]);

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
    <div ref={scrollContainerRef} className="w-full flex-1 overflow-x-auto overflow-y-auto bg-background p-4">
      <div className={`${barberos.length === 1 ? 'w-full max-w-3xl mx-auto' : 'min-w-[768px]'} flex flex-col border border-border rounded-2xl bg-card shadow-sm overflow-hidden`}>
        
        {/* Header con Nombres de Barberos */}
        <div className="flex border-b border-border bg-secondary/40 sticky top-0 z-20">
          {/* Columna de Horas Vacía */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-border p-3 flex items-center justify-center font-semibold text-xs text-muted-foreground">
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
        <div className="relative flex-1 flex">
          
          {/* Columna Lateral con las Horas */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-border divide-y divide-border bg-secondary/10">
            {hoursArray.map((hour) => (
              <div
                key={hour}
                className="h-28 text-[11px] font-mono font-semibold text-muted-foreground p-2 flex items-start justify-center"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Columnas de los Barberos (Donde caen las Citas) */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-border relative">
            
            {/* Fondo de líneas horizontales para las horas */}
            <div className="absolute inset-0 flex flex-col pointer-events-none divide-y divide-border/50">
              {hoursArray.map((hour) => (
                <div key={hour} className="h-28 w-full" />
              ))}
            </div>

            {/* Indicador de la hora actual "NOW Line" */}
            {nowPercent !== null && (
              <div
                className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                style={{ top: `${nowPercent}%` }}
              >
                <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-background -ml-1.5 shadow-xs" />
                <div className="w-full h-0.5 bg-rose-500" />
              </div>
            )}

            {/* Columnas por Barbero */}
            {barberos.map((barbero) => {
              const citasBarbero = citas.filter((c) => c.barberoId === barbero.id);
              const esMiCita = barbero.id === currentUserId;
              const canEdit = currentUserRole === 'admin' || currentUserRole === 'recepcion' || esMiCita;

              return (
                <div key={barbero.id} className="relative h-[1440px] p-1.5">
                  {citasBarbero.map((cita) => (
                    <CitaCard
                      key={cita.id}
                      cita={cita}
                      onStatusChange={onStatusChange}
                      onCobrarClick={onCobrarClick}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
