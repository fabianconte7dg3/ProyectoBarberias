'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';
import { DaySelector } from '@/components/booking/DaySelector';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { BottomAction } from '@/components/ui/BottomAction';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { reservaFechaHoraSchema } from '@/lib/types';
import { fetchPublic, API_URL } from '@/lib/api';
import { calcularSlotsDisponibles, DisponibilidadDia } from '@/lib/disponibilidad';

export default function FechaPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const isHydrated = useHydration();

  // Estado Global
  const servicioId = useBookingStore(state => state.servicioId);
  const comboId = useBookingStore(state => state.comboId);
  const empleadoIdStore = useBookingStore(state => state.empleadoId);
  const duracionMinutos = useBookingStore(state => state.duracionMinutos) || 30;
  const fechaStore = useBookingStore(state => state.fecha);
  const horaStore = useBookingStore(state => state.hora);
  const setFechaYHora = useBookingStore(state => state.setFechaYHora);

  // Estado Local (inicializado con store si existe, sino 'Hoy')
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const eventSourcesRef = useRef<EventSource[]>([]);

  // Sincronización e Hidratación
  useEffect(() => {
    if (isHydrated) {
      if (!servicioId && !comboId) {
        // Redirección de seguridad: no se puede agendar hora sin servicio/combo.
        // (Bug encontrado y corregido en esta fase: antes solo miraba servicioId,
        // así que reservar un combo rebotaba de inmediato a este mismo paso.)
        router.replace(`/${tenantSlug}/reservar`);
        return;
      }
      setSelectedDate(fechaStore || format(new Date(), 'yyyy-MM-dd'));
      setSelectedTime(horaStore);
    }
  }, [isHydrated, servicioId, comboId, fechaStore, horaStore, router, tenantSlug]);

  const cargarSlots = useCallback(async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    try {
      if (empleadoIdStore) {
        // Empleado específico
        const disp = await fetchPublic<DisponibilidadDia>(`/horarios/disponibilidad?empleadoId=${empleadoIdStore}&fecha=${selectedDate}`);
        setSlots(calcularSlotsDisponibles(selectedDate, duracionMinutos, disp));
      } else {
        // "Cualquiera": unión de los horarios libres de todo el staff activo
        const staffData = await fetchPublic<Array<{ id: string; rol: string }>>(`/auth/staff/${tenantSlug}`);
        const empleados = (staffData || []).filter((s) => s.rol === 'empleado' || s.rol === 'admin');
        const disponibilidades = await Promise.all(
          empleados.map((e) => fetchPublic<DisponibilidadDia>(`/horarios/disponibilidad?empleadoId=${e.id}&fecha=${selectedDate}`))
        );
        const union = new Set<string>();
        disponibilidades.forEach((d) => calcularSlotsDisponibles(selectedDate, duracionMinutos, d).forEach((s) => union.add(s)));
        setSlots(Array.from(union).sort());
      }
    } catch (err) {
      console.error('Error cargando disponibilidad:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, empleadoIdStore, duracionMinutos, tenantSlug]);

  useEffect(() => {
    cargarSlots();
  }, [cargarSlots]);

  // Calendario en tiempo real (ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §1):
  // además del fetch de arriba, escucha el stream SSE del/los empleado(s) relevantes
  // y vuelve a pedir disponibilidad cuando algo cambia (nueva cita, cancelación, bloqueo).
  useEffect(() => {
    eventSourcesRef.current.forEach((es) => es.close());
    eventSourcesRef.current = [];

    if (!selectedDate) return;

    let cancelado = false;

    async function conectar() {
      let empleadoIds: string[] = [];
      if (empleadoIdStore) {
        empleadoIds = [empleadoIdStore];
      } else {
        try {
          const staffData = await fetchPublic<Array<{ id: string; rol: string }>>(`/auth/staff/${tenantSlug}`);
          empleadoIds = (staffData || []).filter((s) => s.rol === 'empleado' || s.rol === 'admin').map((s) => s.id);
        } catch {
          return;
        }
      }

      if (cancelado) return;

      empleadoIds.forEach((empleadoId) => {
        const es = new EventSource(`${API_URL}/horarios/disponibilidad/stream?empleadoId=${empleadoId}&fecha=${selectedDate}`);
        es.onmessage = () => cargarSlots();
        eventSourcesRef.current.push(es);
      });
    }

    conectar();

    return () => {
      cancelado = true;
      eventSourcesRef.current.forEach((es) => es.close());
      eventSourcesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, empleadoIdStore, tenantSlug]);

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

  if (!isHydrated || (!servicioId && !comboId)) {
    return <div className="min-h-[50vh] flex items-center justify-center opacity-50">Cargando...</div>;
  }

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
          slots={slots}
          selectedTime={selectedTime}
          onSelect={setSelectedTime}
          duracionMinutos={duracionMinutos}
          loading={loadingSlots}
        />
      )}

      <BottomAction disabled={!isValid} onClick={handleContinue}>
        <span>Confirmar Fecha</span>
        <ArrowRight className="ml-2" size={20} />
      </BottomAction>
    </div>
  );
}
