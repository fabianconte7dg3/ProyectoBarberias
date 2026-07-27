'use client';
import { Calendar, Clock, Scissors, User } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTenant } from '@/lib/tenant-context';

interface Props {
  servicioNombre?: string;
  duracionMinutos?: number;
  precio?: string;
  /** undefined = aún no elegido, null = "Cualquiera", string = nombre elegido */
  empleadoNombre?: string | null;
  fecha?: string; // 'yyyy-MM-dd'
  hora?: string; // 'HH:mm'
}

export function BookingSidebarSummary({ servicioNombre, duracionMinutos, precio, empleadoNombre, fecha, hora }: Props) {
  const { terminologiaServicio, terminologiaEmpleado } = useTenant();

  let fechaHoraTexto: string | null = null;
  if (fecha && hora) {
    const dateObj = parse(fecha, 'yyyy-MM-dd', new Date());
    const timeObj = parse(hora, 'HH:mm', new Date());
    fechaHoraTexto = `${format(dateObj, "EEEE d 'de' MMMM", { locale: es })} · ${format(timeObj, 'hh:mm a')}`;
  }

  return (
    <div className="sticky top-24 bg-card rounded-2xl border-2 border-border p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-foreground border-b border-border pb-3">Resumen de tu cita</h3>

      {/* Servicio o Combo */}
      {servicioNombre ? (
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-xl">
          <Scissors className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div className="w-full min-w-0">
            <p className="font-medium text-foreground truncate">{servicioNombre}</p>
            <p className="text-xs text-muted-foreground">
              {duracionMinutos ? `${duracionMinutos} minutos` : terminologiaServicio}
            </p>
            {precio && <p className="font-bold text-primary font-mono mt-1">${Number(precio).toFixed(2)}</p>}
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground italic">Selecciona un {terminologiaServicio.toLowerCase()}...</p>
        </div>
      )}

      {/* Profesional */}
      {empleadoNombre !== undefined ? (
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">
              {empleadoNombre || `Cualquier ${terminologiaEmpleado.toLowerCase()} disponible`}
            </p>
            <p className="text-xs text-muted-foreground">{terminologiaEmpleado}</p>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground italic">Elige un {terminologiaEmpleado.toLowerCase()}...</p>
        </div>
      )}

      {/* Fecha y Hora */}
      {fechaHoraTexto ? (
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground capitalize">{fechaHoraTexto}</p>
            <p className="text-xs text-muted-foreground">Fecha y hora de tu cita</p>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-border rounded-xl flex items-start gap-3">
          <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground italic">Aún no seleccionas día y hora...</p>
        </div>
      )}

      {/* Total */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Total</span>
        <span className="text-lg font-bold text-primary font-mono">
          {precio ? `$${Number(precio).toFixed(2)}` : '—'}
        </span>
      </div>
    </div>
  );
}
