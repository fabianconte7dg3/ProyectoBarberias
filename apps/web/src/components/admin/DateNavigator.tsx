import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const isSelectedToday = isToday(selectedDate);

  return (
    <div className="flex items-center justify-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner text-xs sm:text-sm">
      <button
        onClick={() => onDateChange(subDays(selectedDate, 1))}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors"
        title="Día anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1.5 px-2 sm:px-3">
        <CalendarIcon size={14} className="text-primary shrink-0" />
        <span className="text-xs sm:text-sm font-bold capitalize whitespace-nowrap">
          {format(selectedDate, "EEE d 'de' MMM", { locale: es })}
        </span>
      </div>

      <button
        onClick={() => onDateChange(addDays(selectedDate, 1))}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors"
        title="Día siguiente"
      >
        <ChevronRight size={16} />
      </button>

      {!isSelectedToday && (
        <button
          onClick={() => onDateChange(new Date())}
          className="text-[11px] font-bold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-0.5"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
