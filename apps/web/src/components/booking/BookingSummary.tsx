'use client';
import { Calendar, Clock, Scissors, User } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTenant } from '@/lib/tenant-context';

interface Props {
  servicioNombre: string;
  empleadoNombre: string;
  fecha: string; // 'yyyy-MM-dd'
  hora: string; // 'HH:mm'
  precio: string;
}

export function BookingSummary({ servicioNombre, empleadoNombre, fecha, hora, precio }: Props) {
  const { terminologiaServicio, terminologiaEmpleado } = useTenant();
  const dateObj = parse(fecha, 'yyyy-MM-dd', new Date());
  const formattedDate = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
  const timeObj = parse(hora, 'HH:mm', new Date());
  const formattedTime = format(timeObj, 'hh:mm a');

  return (
    <div className="bg-card rounded-2xl border-2 border-border p-5 shadow-sm mb-6">
      <h3 className="font-semibold text-foreground mb-4 border-b border-border pb-3">Resumen de tu cita</h3>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground capitalize">{formattedDate}</p>
            <p className="text-sm text-muted-foreground">Fecha seleccionada</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">{formattedTime}</p>
            <p className="text-sm text-muted-foreground">Hora de inicio</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Scissors className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div className="w-full min-w-0">
            <div className="flex justify-between items-center w-full gap-4">
              <p className="font-medium text-foreground truncate">{servicioNombre}</p>
              <p className="font-bold text-primary font-mono shrink-0">${Number(precio).toFixed(2)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{terminologiaServicio}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">{empleadoNombre}</p>
            <p className="text-sm text-muted-foreground">{terminologiaEmpleado}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
