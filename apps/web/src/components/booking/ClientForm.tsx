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
      <h3 className="font-semibold text-foreground px-1">Tus Datos</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-muted-foreground mb-1 ml-1">
            Nombre y Apellido
          </label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => onChange('nombre', e.target.value)}
            placeholder="Ej. Juan Pérez"
            // CSS capitalize, pero guardamos el original
            className="w-full p-4 bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors capitalize text-foreground"
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-muted-foreground mb-1 ml-1">
            WhatsApp
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              +507
            </span>
            <input
              type="tel"
              id="telefono"
              inputMode="tel"
              value={telefono}
              onChange={(e) => onChange('telefono', e.target.value)}
              placeholder="6123 4567"
              className={`w-full py-4 pr-4 pl-14 bg-card border-2 rounded-xl focus:ring-0 outline-none transition-colors text-foreground ${
                telefono.length > 0 && !isPhoneValid
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
          </div>
          {telefono.length > 0 && !isPhoneValid && (
            <p className="text-destructive text-xs mt-1.5 ml-1 flex items-center">
              <Info size={12} className="mr-1" />
              Verifica el número ingresado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
