'use client';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { Info } from 'lucide-react';

interface Props {
  nombre: string;
  telefono: string;
  onChange: (field: 'nombre' | 'telefono', value: string) => void;
}

export function ClientForm({ nombre, telefono, onChange }: Props) {
  // Simple validador visual
  let isPhoneValid = true;
  if (telefono.length > 0) {
    try {
      isPhoneValid = parsePhoneNumberWithError(telefono, 'PA').isValid();
    } catch (e) {
      isPhoneValid = false;
    }
  }

  return (
    <div className="space-y-4 mb-28">
      <h3 className="font-semibold text-gray-800 px-1">Tus Datos</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
            Nombre y Apellido
          </label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => onChange('nombre', e.target.value)}
            placeholder="Ej. Juan Pérez"
            // CSS capitalize, pero guardamos el original
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors capitalize"
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
            WhatsApp
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              +507
            </span>
            <input
              type="tel"
              id="telefono"
              inputMode="tel"
              value={telefono}
              onChange={(e) => onChange('telefono', e.target.value)}
              placeholder="6123 4567"
              className={`w-full py-4 pr-4 pl-14 bg-white border-2 rounded-xl focus:ring-0 outline-none transition-colors ${
                telefono.length > 0 && !isPhoneValid 
                  ? 'border-red-400 focus:border-red-500' 
                  : 'border-gray-200 focus:border-primary'
              }`}
            />
          </div>
          {telefono.length > 0 && !isPhoneValid && (
            <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center">
              <Info size={12} className="mr-1" />
              Verifica el número ingresado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
