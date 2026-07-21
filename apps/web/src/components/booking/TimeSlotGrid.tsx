'use client';
import { useMemo } from 'react';
import { parse, format, addMinutes, isPast, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';

interface Props {
  selectedDate: string;
  selectedTime?: string;
  onSelect: (time: string) => void;
  duracionMinutos: number; // Para calcular y mostrar el fin
}

// MOCK: Horarios generados cada 30 min. 
// En Hito futuro, esto vendrá del Backend basado en el barbero y servicio.
const MOCK_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', 
  '15:30', '16:00', '16:30', '17:00'
];

export function TimeSlotGrid({ selectedDate, selectedTime, onSelect, duracionMinutos }: Props) {
  const availableSlots = useMemo(() => {
    const today = new Date();
    const dateObj = parse(selectedDate, 'yyyy-MM-dd', today);
    const isTodaySelection = isSameDay(dateObj, today);

    return MOCK_SLOTS.filter(slot => {
      // 1. Filtrar horas pasadas si es hoy
      if (isTodaySelection) {
        const slotDate = parse(`${selectedDate} ${slot}`, 'yyyy-MM-dd HH:mm', new Date());
        if (isPast(slotDate)) return false;
      }
      
      // 2. Aquí también se podría filtrar si el slot + duracion sobrepasa el cierre del local.
      return true;
    });
  }, [selectedDate]);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mt-6 mb-28">
        <p className="text-gray-500 font-medium">No hay horarios disponibles para este día.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8 mb-28">
      <h2 className="text-lg font-semibold px-1">2. ¿A qué hora?</h2>
      <div className="grid grid-cols-2 gap-3 px-1">
        {availableSlots.map((time) => {
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
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              aria-pressed={isSelected}
            >
              <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {displayStart}
              </span>
              <span className="text-xs text-gray-500 mt-1">
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
}
