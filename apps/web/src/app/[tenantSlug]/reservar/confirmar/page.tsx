'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { ClientForm } from '@/components/booking/ClientForm';
import { SuccessView } from '@/components/booking/SuccessView';
import { BottomAction } from '@/components/ui/BottomAction';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { reservaClienteSchema } from '@/lib/types';

// MOCK DATA (En el futuro vendrá de React Query cache)
const MOCK_SERVICIOS: Record<string, { nombre: string; precio: string }> = {
  '123e4567-e89b-12d3-a456-426614174000': { nombre: 'Corte Clásico', precio: '15.00' },
  '123e4567-e89b-12d3-a456-426614174001': { nombre: 'Corte + Barba', precio: '22.00' },
  '123e4567-e89b-12d3-a456-426614174002': { nombre: 'Perfilado de Barba', precio: '10.00' },
};

const MOCK_BARBEROS: Record<string, string> = {
  '123e4567-e89b-12d3-a456-426614174003': 'Carlos',
  '123e4567-e89b-12d3-a456-426614174004': 'Juan',
  '123e4567-e89b-12d3-a456-426614174005': 'Pedro',
};

type FormStatus = 'idle' | 'loading' | 'error' | 'success';

function ConfirmarContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const isSuccessQuery = searchParams.get('status') === 'success';
  const isHydrated = useHydration();

  // Global State
  const { servicioId, barberoId, fecha, hora, reset } = useBookingStore();

  // Local State
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [status, setStatus] = useState<FormStatus>(isSuccessQuery ? 'success' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Protección de ruta (Si faltan datos y no estamos en success)
  useEffect(() => {
    if (isHydrated && status !== 'success') {
      if (!servicioId || !fecha || !hora) {
        router.replace(`/${tenantSlug}/reservar`);
      }
    }
  }, [isHydrated, status, servicioId, fecha, hora, router, tenantSlug]);

  const isValid = reservaClienteSchema.safeParse({ nombre, telefono }).success;

  const handleConfirm = async () => {
    // Evitar doble submit localmente
    if (!isValid || status === 'loading') return;
    
    setStatus('loading');
    setErrorMessage('');

    try {
      // MOCK: Simular latencia de red y backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulamos que 1 de cada 10 veces ocurre una race condition o fallo de red
      // if (Math.random() > 0.9) throw new Error("El horario seleccionado acaba de ser ocupado. Por favor, elige otro.");

      // Analytics: track event (Mock)
      console.log('trackEvent: booking_confirmed', { 
        tenant: tenantSlug, servicioId, barberoId, fecha, hora, nombre, telefono 
      });

      // Éxito: Limpiar store para que el botón "Atrás" no reviva un formulario, 
      // y mutar la URL usando replace (sin agregar al historial).
      reset();
      router.replace(`/${tenantSlug}/reservar/confirmar?status=success`);
      setStatus('success');

    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Error al confirmar la reserva. Revisa tu conexión.');
    }
  };

  const handleFormChange = (field: 'nombre' | 'telefono', value: string) => {
    if (field === 'nombre') setNombre(value);
    if (field === 'telefono') setTelefono(value);
  };

  if (!isHydrated) {
    return <div className="min-h-[50vh] flex items-center justify-center opacity-50">Cargando...</div>;
  }

  // VISTA 1: ÉXITO
  if (status === 'success') {
    return <SuccessView tenantSlug={tenantSlug} />;
  }

  // VISTA 2: FORMULARIO PRINCIPAL
  // Renderizado seguro por si useEffect tarda en redirigir
  if (!servicioId || !fecha || !hora) return null;

  const servicioMock = MOCK_SERVICIOS[servicioId];
  const barberoMockNombre = barberoId ? MOCK_BARBEROS[barberoId] : 'Cualquier Barbero';

  return (
    <div className="animate-in slide-in-from-right-8 fade-in duration-500 relative pb-4">
      {/* Botón Volver */}
      <button 
        onClick={() => router.back()}
        className="mb-4 flex items-center text-sm font-medium text-gray-500 hover:text-foreground active:scale-95 transition-all"
        disabled={status === 'loading'}
      >
        <ArrowLeft size={16} className="mr-1" />
        Volver a fecha
      </button>

      {status === 'error' && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start text-sm">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <BookingSummary 
        servicioNombre={servicioMock?.nombre || 'Servicio'}
        barberoNombre={barberoMockNombre || 'Barbero'}
        fecha={fecha}
        hora={hora}
        precio={servicioMock?.precio || '0.00'}
      />

      <ClientForm 
        nombre={nombre} 
        telefono={telefono} 
        onChange={handleFormChange} 
      />

      <BottomAction disabled={!isValid || status === 'loading'} onClick={handleConfirm}>
        {status === 'loading' ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            <span>Confirmando...</span>
          </>
        ) : (
          <span>Confirmar Reserva</span>
        )}
      </BottomAction>
    </div>
  );
}

// Necesario envolver en Suspense porque usamos useSearchParams en Next.js (App Router)
export default function ConfirmarPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center opacity-50">Cargando...</div>}>
      <ConfirmarContent />
    </Suspense>
  );
}
