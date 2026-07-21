import { Calendar, Clock, Scissors, User } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  servicioNombre: string;
  barberoNombre: string;
  fecha: string; // 'yyyy-MM-dd'
  hora: string; // 'HH:mm'
  precio: string;
}

export function BookingSummary({ servicioNombre, barberoNombre, fecha, hora, precio }: Props) {
  const dateObj = parse(fecha, 'yyyy-MM-dd', new Date());
  const formattedDate = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
  const timeObj = parse(hora, 'HH:mm', new Date());
  const formattedTime = format(timeObj, 'hh:mm a');

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm mb-6">
      <h3 className="font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">Resumen de tu cita</h3>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3 text-gray-600">
          <Calendar className="w-5 h-5 mt-0.5 text-primary" />
          <div>
            <p className="font-medium text-gray-900 capitalize">{formattedDate}</p>
            <p className="text-sm text-gray-500">Fecha seleccionada</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-gray-600">
          <Clock className="w-5 h-5 mt-0.5 text-primary" />
          <div>
            <p className="font-medium text-gray-900">{formattedTime}</p>
            <p className="text-sm text-gray-500">Hora de inicio</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-gray-600">
          <Scissors className="w-5 h-5 mt-0.5 text-primary" />
          <div className="w-full">
            <div className="flex justify-between items-center w-full gap-8">
              <p className="font-medium text-gray-900">{servicioNombre}</p>
              <p className="font-bold text-primary">${precio}</p>
            </div>
            <p className="text-sm text-gray-500">Servicio</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-gray-600">
          <User className="w-5 h-5 mt-0.5 text-primary" />
          <div>
            <p className="font-medium text-gray-900">{barberoNombre}</p>
            <p className="text-sm text-gray-500">Barbero</p>
          </div>
        </div>
      </div>
    </div>
  );
}
