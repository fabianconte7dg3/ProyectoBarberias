'use client';

import { useEffect, useState } from 'react';
import { ServiceSelection } from '@/components/booking/ServiceSelection';
import { BarberSelection } from '@/components/booking/BarberSelection';
import { BarberProfileCard } from '@/components/booking/BarberProfileCard';
import { BottomAction } from '@/components/ui/BottomAction';
import { Servicio, Barbero, reservaSeleccionSchema } from '@/lib/types';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';
import { fetchPublic } from '@/lib/api';

export default function ReservarPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const isHydrated = useHydration();
  
  // Estado global
  const servicioIdStore = useBookingStore(state => state.servicioId);
  const barberoIdStore = useBookingStore(state => state.barberoId);
  const setServicioYBarbero = useBookingStore(state => state.setServicioYBarbero);

  // Datos reales de la API
  const [serviciosList, setServiciosList] = useState<Servicio[]>([]);
  const [barberosList, setBarberosList] = useState<Barbero[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado local para la interfaz rápida, inicializado con el store
  const [servicioId, setServicioId] = useState<string | undefined>();
  const [barberoId, setBarberoId] = useState<string | null | undefined>(); 

  // Cargar Servicios y Barberos en vivo desde el Backend
  useEffect(() => {
    async function loadPublicCatalog() {
      setLoadingData(true);
      try {
        const [serviciosData, staffData] = await Promise.all([
          fetchPublic<Servicio[]>(`/servicios/publico/${tenantSlug}`),
          fetchPublic<Array<{ id: string; nombreCompleto: string; rol: string }>>(`/auth/staff/${tenantSlug}`)
        ]);

        setServiciosList(serviciosData || []);

        // Filtrar solo los integrantes activos con rol 'barbero' o 'admin'
        const barberosMapped: Barbero[] = (staffData || [])
          .filter(s => s.rol === 'barbero' || s.rol === 'admin')
          .map(s => ({
            id: s.id,
            nombre: s.nombreCompleto,
            fotoUrl: null,
          }));

        setBarberosList(barberosMapped);

        // Si es Solo-preneur (1 solo profesional activo), se selecciona automáticamente
        if (barberosMapped.length === 1) {
          setBarberoId(barberosMapped[0].id);
        }
      } catch (err) {
        console.error('Error cargando catálogo público de la barbería:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadPublicCatalog();
  }, [tenantSlug]);

  // Sincronizar estado local con el global cuando la página carga e hidrata
  useEffect(() => {
    if (isHydrated) {
      setServicioId(servicioIdStore);
      if (barberosList.length > 1) {
        setBarberoId(barberoIdStore);
      }
    }
  }, [isHydrated, servicioIdStore, barberoIdStore, barberosList.length]);

  // Si pasa a tener 1 solo barbero, asegurar selección
  useEffect(() => {
    if (barberosList.length === 1) {
      setBarberoId(barberosList[0].id);
    }
  }, [barberosList]);
  
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
  if (!isHydrated || loadingData) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <RefreshCw className="animate-spin text-primary" size={24} />
        <span className="text-xs font-semibold">Cargando catálogo de la barbería...</span>
      </div>
    );
  }

  const isSoloPreneur = barberosList.length === 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Paso 1: Selección de Servicio */}
      <ServiceSelection 
        servicios={serviciosList} 
        selectedId={servicioId} 
        onSelect={setServicioId} 
      />

      {/* Paso 2: Tarjeta de Perfil para Solo-preneur vs Selector Multibarbero */}
      <div className={`transition-opacity duration-500 ${servicioId ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        {isSoloPreneur && barberosList[0] ? (
          <BarberProfileCard barbero={barberosList[0]} />
        ) : (
          <BarberSelection 
            barberos={barberosList} 
            selectedId={barberoId} 
            onSelect={setBarberoId} 
          />
        )}
      </div>

      {/* Acción Flotante */}
      <BottomAction disabled={!isValid} onClick={handleContinue}>
        <span>Continuar a Fecha y Hora</span>
        <ArrowRight className="ml-2" size={20} />
      </BottomAction>
    </div>
  );
}
