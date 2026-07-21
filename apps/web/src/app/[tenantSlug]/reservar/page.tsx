'use client';
import { useEffect, useState } from 'react';
import { ServiceSelection } from '@/components/booking/ServiceSelection';
import { BarberSelection } from '@/components/booking/BarberSelection';
import { BottomAction } from '@/components/ui/BottomAction';
import { Servicio, Barbero, reservaSeleccionSchema } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';

// Mock Data (En el futuro provendrá de React Query / API real)
const MOCK_SERVICIOS: Servicio[] = [
  { id: '123e4567-e89b-12d3-a456-426614174000', nombre: 'Corte Clásico', duracionMinutos: 30, precioBase: '15.00' },
  { id: '123e4567-e89b-12d3-a456-426614174001', nombre: 'Corte + Barba', duracionMinutos: 45, precioBase: '22.00' },
  { id: '123e4567-e89b-12d3-a456-426614174002', nombre: 'Perfilado de Barba', duracionMinutos: 15, precioBase: '10.00' },
];

const MOCK_BARBEROS: Barbero[] = [
  { id: '123e4567-e89b-12d3-a456-426614174003', nombre: 'Carlos', fotoUrl: 'https://i.pravatar.cc/150?u=carlos' },
  { id: '123e4567-e89b-12d3-a456-426614174004', nombre: 'Juan', fotoUrl: 'https://i.pravatar.cc/150?u=juan' },
  { id: '123e4567-e89b-12d3-a456-426614174005', nombre: 'Pedro', fotoUrl: null }, // Sin foto, debe mostrar inicial
];

export default function ReservarPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const isHydrated = useHydration();
  
  // Estado global
  const servicioIdStore = useBookingStore(state => state.servicioId);
  const barberoIdStore = useBookingStore(state => state.barberoId);
  const setServicioYBarbero = useBookingStore(state => state.setServicioYBarbero);

  // Estado local para la interfaz rápida, inicializado con el store
  const [servicioId, setServicioId] = useState<string | undefined>();
  const [barberoId, setBarberoId] = useState<string | null | undefined>(); 

  // Sincronizar estado local con el global cuando la página carga e hidrata
  useEffect(() => {
    if (isHydrated) {
      setServicioId(servicioIdStore);
      setBarberoId(barberoIdStore);
    }
  }, [isHydrated, servicioIdStore, barberoIdStore]);
  
  // Zod Validation (Estado derivado sincrónico)
  const isValid = reservaSeleccionSchema.safeParse({ servicioId, barberoId }).success;

  const handleContinue = () => {
    if (!isValid || !servicioId || barberoId === undefined) return;
    
    // Guardamos en estado global
    setServicioYBarbero(servicioId, barberoId);
    
    // Navegamos al siguiente paso
    router.push(`/${tenantSlug}/reservar/fecha`);
  };

  // Prevenir desajuste de hidratación UI
  if (!isHydrated) {
    return <div className="min-h-[50vh] flex items-center justify-center opacity-50">Cargando...</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Paso 1: Selección de Servicio */}
      <ServiceSelection 
        servicios={MOCK_SERVICIOS} 
        selectedId={servicioId} 
        onSelect={setServicioId} 
      />

      {/* Paso 2: Selección de Barbero (Visible opacado si no hay servicio seleccionado) */}
      <div className={`transition-opacity duration-500 ${servicioId ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        <BarberSelection 
          barberos={MOCK_BARBEROS} 
          selectedId={barberoId} 
          onSelect={setBarberoId} 
        />
      </div>

      {/* Acción Flotante */}
      <BottomAction disabled={!isValid} onClick={handleContinue}>
        <span>Continuar</span>
        <ArrowRight className="ml-2" size={20} />
      </BottomAction>
    </div>
  );
}
