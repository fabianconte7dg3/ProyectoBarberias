'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';
import { DaySelector } from '@/components/booking/DaySelector';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { BottomAction } from '@/components/ui/BottomAction';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { reservaFechaHoraSchema } from '@/lib/types';

export default function FechaPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const isHydrated = useHydration();

  // Estado Global
  const servicioId = useBookingStore(state => state.servicioId);
  const fechaStore = useBookingStore(state => state.fecha);
  const horaStore = useBookingStore(state => state.hora);
  const setFechaYHora = useBookingStore(state => state.setFechaYHora);

  // Estado Local (inicializado con store si existe, sino 'Hoy')
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  // Sincronización e Hidratación
  useEffect(() => {
    if (isHydrated) {
      if (!servicioId) {
        // Redirección de seguridad: no se puede agendar hora sin servicio
        router.replace(`/${tenantSlug}/reservar`);
        return;
      }
      setSelectedDate(fechaStore || format(new Date(), 'yyyy-MM-dd'));
      setSelectedTime(horaStore);
    }
  }, [isHydrated, servicioId, fechaStore, horaStore, router, tenantSlug]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    // Buena UX: Si cambias de día, se limpia la hora seleccionada
    setSelectedTime(undefined);
  };

  // Zod Validation (En vivo)
  const isValid = reservaFechaHoraSchema.safeParse({ 
    fecha: selectedDate, 
    hora: selectedTime 
  }).success;

  const handleContinue = () => {
    if (!isValid || !selectedDate || !selectedTime) return;
    
    setFechaYHora(selectedDate, selectedTime);
    router.push(`/${tenantSlug}/reservar/confirmar`);
  };

  if (!isHydrated || !servicioId) {
    return <div className="min-h-[50vh] flex items-center justify-center opacity-50">Cargando...</div>;
  }

  // MOCK: En un entorno real, la duración provendría del servicio seleccionado (React Query)
  const mockDuracionMinutos = 45; // Asumimos 45 min para mostrar la UX de cálculo

  return (
    <div className="animate-in slide-in-from-right-8 fade-in duration-500 relative">
      {/* Botón Volver (Estilo nativo App) */}
      <button 
        onClick={() => router.back()}
        className="mb-2 flex items-center text-sm font-medium text-gray-500 hover:text-foreground active:scale-95 transition-all"
      >
        <ArrowLeft size={16} className="mr-1" />
        Volver a servicios
      </button>

      <DaySelector 
        selectedDate={selectedDate} 
        onSelect={handleDateSelect} 
      />

      {selectedDate && (
        <TimeSlotGrid 
          selectedDate={selectedDate} 
          selectedTime={selectedTime} 
          onSelect={setSelectedTime}
          duracionMinutos={mockDuracionMinutos}
        />
      )}

      <BottomAction disabled={!isValid} onClick={handleContinue}>
        <span>Confirmar Fecha</span>
        <ArrowRight className="ml-2" size={20} />
      </BottomAction>
    </div>
  );
}
