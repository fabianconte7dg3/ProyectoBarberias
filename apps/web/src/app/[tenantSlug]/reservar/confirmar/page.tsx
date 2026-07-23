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
import { fetchPublic } from '@/lib/api';

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
    if (!isValid || status === 'loading') return;
    
    setStatus('loading');
    setErrorMessage('');

    try {
      // 1. Obtener o crear Cliente por número de WhatsApp en la API Pública
      let clienteId = '';
      try {
        const nuevoCliente = await fetchPublic<{ id: string }>('/clientes/publico', {
          method: 'POST',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
          body: JSON.stringify({
            nombreCompleto: nombre.trim(),
            telefonoWhatsapp: telefono.trim(),
          })
        });
        clienteId = nuevoCliente.id;
      } catch (err: any) {
        console.error('Error asociando cliente en reserva pública:', err);
        throw new Error(err.message || 'No se pudo asociar la ficha del cliente.');
      }

      // 2. Crear Cita Real en Backend (`POST /citas/publica`)
      const inicioEstimado = `${fecha}T${hora}:00`;
      const citaPayload: Record<string, unknown> = {
        servicioId,
        clienteId,
        inicioEstimado,
        origen: 'web_publica',
      };
      // Solo incluir barberoId si es un UUID válido.
      // Para Solo-preneur el backend auto-asigna al único barbero activo.
      if (barberoId && barberoId.trim().length > 0) {
        citaPayload.barberoId = barberoId;
      }
      await fetchPublic('/citas/publica', {
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(citaPayload)
      });

      // 3. Limpiar estado de reserva global
      reset();
      router.replace(`/${tenantSlug}/reservar/confirmar?status=success`);
      setStatus('success');

    } catch (error: any) {
      console.error('Error al confirmar reserva:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Error al guardar la reserva en el calendario. Por favor intenta nuevamente.');
    }
  };

  const handleFormChange = (field: 'nombre' | 'telefono', value: string) => {
    if (field === 'nombre') setNombre(value);
    if (field === 'telefono') setTelefono(value);
  };

  if (!isHydrated) {
    return <div className="min-h-[50vh] flex items-center justify-center opacity-50 font-semibold text-xs">Cargando...</div>;
  }

  // VISTA 1: ÉXITO
  if (status === 'success') {
    return <SuccessView tenantSlug={tenantSlug} />;
  }

  // VISTA 2: FORMULARIO DE CONFIRMACIÓN
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header flotante */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-foreground">Confirmar Reserva</h1>
          <p className="text-[11px] text-muted-foreground">Paso 3 de 3 — Datos de contacto</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Banner Error */}
        {status === 'error' && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-medium space-y-1">
              <p className="font-bold">No se pudo procesar la reserva</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Resumen de Servicio y Fecha */}
        <BookingSummary
          servicioNombre="Servicio Seleccionado"
          barberoNombre="Barbero Asignado"
          fecha={fecha || '2026-07-21'}
          hora={hora || '12:00'}
          precio="15.00"
        />

        {/* Formulario Cliente */}
        <ClientForm
          nombre={nombre}
          telefono={telefono}
          onChange={handleFormChange}
        />
      </main>

      {/* Acción fija inferior */}
      <BottomAction
        onClick={handleConfirm}
        disabled={!isValid || status === 'loading'}
      >
        {status === 'loading' ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Guardando Cita en Calendario...</span>
          </span>
        ) : (
          <span>Confirmar Reserva</span>
        )}
      </BottomAction>
    </div>
  );
}

export default function ConfirmarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-bold text-muted-foreground">Cargando...</div>}>
      <ConfirmarContent />
    </Suspense>
  );
}
