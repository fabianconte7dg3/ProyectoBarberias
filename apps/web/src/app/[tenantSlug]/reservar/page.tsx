'use client';

import { useEffect, useState } from 'react';
import { ServiceSelection } from '@/components/booking/ServiceSelection';
import { BarberSelection } from '@/components/booking/BarberSelection';
import { BarberProfileCard } from '@/components/booking/BarberProfileCard';
import { BottomAction } from '@/components/ui/BottomAction';
import { Servicio, Empleado, ComboPublico, reservaSeleccionSchema } from '@/lib/types';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useBookingStore } from '@/lib/store';
import { useHydration } from '@/hooks/useHydration';
import { fetchPublic } from '@/lib/api';
import { useTenant } from '@/lib/tenant-context';

export default function ReservarPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const tenant = useTenant();
  const isHydrated = useHydration();
  
  // Estado global
  const servicioIdStore = useBookingStore(state => state.servicioId);
  const comboIdStore = useBookingStore(state => state.comboId);
  const empleadoIdStore = useBookingStore(state => state.empleadoId);
  const setServicioYEmpleado = useBookingStore(state => state.setServicioYEmpleado);
  const setComboYEmpleado = useBookingStore(state => state.setComboYEmpleado);

  // Datos reales de la API
  const [serviciosList, setServiciosList] = useState<Servicio[]>([]);
  const [combosList, setCombosList] = useState<ComboPublico[]>([]);
  const [empleadosList, setEmpleadosList] = useState<Empleado[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado local para la interfaz rápida, inicializado con el store
  const [servicioId, setServicioId] = useState<string | undefined>();
  const [comboId, setComboId] = useState<string | undefined>();
  const [empleadoId, setEmpleadoId] = useState<string | null | undefined>();

  // Cargar Servicios, Combos y Empleados en vivo desde el Backend
  useEffect(() => {
    async function loadPublicCatalog() {
      setLoadingData(true);
      try {
        const [serviciosData, combosData, staffData] = await Promise.all([
          fetchPublic<Servicio[]>(`/servicios/publico/${tenantSlug}`),
          fetchPublic<ComboPublico[]>(`/combos/publico/${tenantSlug}`),
          fetchPublic<Array<{ id: string; nombreCompleto: string; rol: string }>>(`/auth/staff/${tenantSlug}`)
        ]);

        setServiciosList(serviciosData || []);
        setCombosList(combosData || []);

        // Filtrar solo los integrantes activos con rol 'empleado' o 'admin'
        const empleadosMapped: Empleado[] = (staffData || [])
          .filter(s => s.rol === 'empleado' || s.rol === 'admin')
          .map(s => ({
            id: s.id,
            nombre: s.nombreCompleto,
            fotoUrl: null,
          }));

        setEmpleadosList(empleadosMapped);

        // Si es Solo-preneur (1 solo profesional activo), se selecciona automáticamente
        if (empleadosMapped.length === 1) {
          setEmpleadoId(empleadosMapped[0].id);
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
      setComboId(comboIdStore);
      if (empleadosList.length > 1) {
        setEmpleadoId(empleadoIdStore);
      }
    }
  }, [isHydrated, servicioIdStore, comboIdStore, empleadoIdStore, empleadosList.length]);

  // Si pasa a tener 1 solo empleado, asegurar selección
  useEffect(() => {
    if (empleadosList.length === 1) {
      setEmpleadoId(empleadosList[0].id);
    }
  }, [empleadosList]);
  
  // Zod Validation (Estado derivado sincrónico)
  const isValid = reservaSeleccionSchema.safeParse({ servicioId, comboId, empleadoId }).success;

  const handleSelectServicio = (id: string) => {
    setServicioId(id);
    setComboId(undefined);
  };

  const handleSelectCombo = (id: string) => {
    setComboId(id);
    setServicioId(undefined);
  };

  const handleContinue = () => {
    if (!isValid || empleadoId === undefined) return;

    // Guardamos en estado global (incluyendo la duración real, necesaria para
    // calcular los horarios disponibles en el siguiente paso)
    if (comboId) {
      const combo = combosList.find((c) => c.id === comboId);
      const duracion = combo?.duracionAjustadaMinutos
        ?? combo?.servicios.reduce((total, cs) => total + cs.servicio.duracionMinutos, 0)
        ?? 30;
      setComboYEmpleado(comboId, empleadoId, duracion);
    } else if (servicioId) {
      const servicio = serviciosList.find((s) => s.id === servicioId);
      setServicioYEmpleado(servicioId, empleadoId, servicio?.duracionMinutos ?? 30);
    } else {
      return;
    }

    // Navegamos al siguiente paso
    router.push(`/${tenantSlug}/reservar/fecha`);
  };

  // Prevenir desajuste de hidratación UI
  if (!isHydrated || loadingData) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <RefreshCw className="animate-spin text-primary" size={24} />
        <span className="text-xs font-semibold">Cargando catálogo de {tenant.nombreComercial}...</span>
      </div>
    );
  }

  const isSoloPreneur = empleadosList.length === 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Paso 1: Selección de Servicio o Combo */}
      <ServiceSelection
        servicios={serviciosList}
        combos={combosList}
        selectedServicioId={servicioId}
        selectedComboId={comboId}
        onSelectServicio={handleSelectServicio}
        onSelectCombo={handleSelectCombo}
      />

      {/* Paso 2: Tarjeta de Perfil para Solo-preneur vs Selector Multiempleado */}
      <div className={`transition-opacity duration-500 ${(servicioId || comboId) ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        {isSoloPreneur && empleadosList[0] ? (
          <BarberProfileCard empleado={empleadosList[0]} />
        ) : (
          <BarberSelection 
            empleados={empleadosList} 
            selectedId={empleadoId} 
            onSelect={setEmpleadoId} 
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
