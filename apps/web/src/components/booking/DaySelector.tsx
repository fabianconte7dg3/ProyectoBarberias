'use client';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface Props {
  selectedDate?: string;
  onSelect: (date: string) => void;
}

export function DaySelector({ selectedDate, onSelect }: Props) {
  // Generar los próximos 14 días (Mock)
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => addDays(today, i));
  }, []);

  return (
    <div className="space-y-3 mt-4">
      <h2 className="text-lg font-semibold px-1">1. ¿Qué día prefieres?</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x px-1 no-scrollbar">
        {days.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateStr;
          const isToday = isSameDay(date, new Date());
          const dayName = isToday ? 'Hoy' : format(date, 'EEE', { locale: es }).toUpperCase();
          const dayNumber = format(date, 'dd');

          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className={`snap-start flex-shrink-0 w-20 flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${
                isSelected 
                  ? 'border-primary bg-primary text-primary-foreground shadow-md' 
                  : 'border-gray-200 bg-white hover:border-primary/50 text-foreground'
              }`}
              aria-pressed={isSelected}
            >
              <span className={`text-xs font-semibold mb-1 ${isSelected ? 'text-primary-foreground/80' : 'text-gray-500'}`}>
                {dayName}
              </span>
              <span className="text-2xl font-bold">{dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
