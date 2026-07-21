'use client';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  tenantSlug: string;
  // Para un deep-link a WhatsApp si tuviéramos los datos guardados en URL o DB
}

export function SuccessView({ tenantSlug }: Props) {
  // Simulamos un teléfono fijo del local para el deep link
  const localWhatsApp = "50761234567";
  const whatsappMsg = encodeURIComponent("¡Hola! Acabo de hacer una reserva mediante BarberOS.");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in-95 duration-500 fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Confirmada!</h2>
      <p className="text-gray-500 mb-8 max-w-[280px]">
        Te esperamos en la barbería. Si necesitas cancelar, por favor avísanos con tiempo.
      </p>

      <div className="space-y-3 w-full">
        <a 
          href={`https://wa.me/${localWhatsApp}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full p-4 bg-[#25D366] text-white rounded-xl font-bold text-lg transition-all active:scale-95 shadow-sm"
        >
          <MessageCircle size={20} className="mr-2" />
          Avisar por WhatsApp
        </a>

        <Link 
          href={`/${tenantSlug}/reservar`}
          className="flex items-center justify-center w-full p-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg transition-all active:scale-95"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
