'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DateNavigator } from '@/components/admin/DateNavigator';
import { TimelineGrid } from '@/components/admin/TimelineGrid';
import { ListaTurnosView } from '@/components/admin/ListaTurnosView';
import { CitaAgenda } from '@/components/admin/CitaCard';
import { QuickWalkInModal } from '@/components/admin/QuickWalkInModal';
import { CobrarCitaModal } from '@/components/admin/CobrarCitaModal';
import { MiDesempenoModal } from '@/components/admin/MiDesempenoModal';
import { VentaMostradorModal } from '@/components/admin/VentaMostradorModal';
import { User, Users, Filter, LayoutGrid, List, Plus, Award, ShoppingBag } from 'lucide-react';

interface Empleado {
  id: string;
  nombreCompleto: string;
  rol: string;
}

export default function AdminAgendaPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [citas, setCitas] = useState<CitaAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [citaParaCobrar, setCitaParaCobrar] = useState<CitaAgenda | null>(null);
  const [isMiDesempenoOpen, setIsMiDesempenoOpen] = useState(false);
  const [isVentaMostradorOpen, setIsVentaMostradorOpen] = useState(false);

  // Filtros de visualización para la agenda
  const [soloMisCitas, setSoloMisCitas] = useState(false);
  const [tipoVistaGrid, setTipoVistaGrid] = useState<'parrilla' | 'lista'>('parrilla');

  // Detección de Solo-preneur (1 solo profesional activo con rol admin/empleado)
  const activeBarbers = empleados.filter((b) => b.rol === 'empleado' || b.rol === 'admin');
  const isSoloPreneur = activeBarbers.length === 1;

  // 1. Verificar sesión activa contra el backend — delegado al hook compartido
  //    useAdminAuth, que ya resuelve la carrera de hidratación de Zustand
  //    (no redirige a login solo porque `currentUser` llegue null en el primer
  //    render de una recarga dura; valida contra /auth/me antes de decidir).
  useAdminAuth({ tenantSlug });

  // 2. Cargar lista de empleados
  useEffect(() => {
    async function loadEmpleados() {
      try {
        const data = await fetchApi<Empleado[]>(`/auth/staff/${tenantSlug}`);
        setEmpleados(data || []);
        
        // Si es solo-preneur, iniciar por defecto en la vista limpia de Lista de Turnos
        const staffBarbers = (data || []).filter((b) => b.rol === 'empleado' || b.rol === 'admin');
        if (staffBarbers.length === 1) {
          setTipoVistaGrid('lista');
        }
      } catch (err) {
        console.error('Error cargando empleados:', err);
      }
    }
    loadEmpleados();
  }, [tenantSlug]);

  // 3. Cargar citas con soporte de Polling de 30s + Page Visibility API
  const loadCitas = useCallback(async () => {
    try {
      const fechaStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await fetchApi<CitaAgenda[]>(`/citas?fecha=${fechaStr}`);
      setCitas(data);
    } catch (err) {
      console.error('Error cargando citas de agenda:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCitas();

    // Auto-polling cada 30s sólo si la pestaña está visible (Page Visibility API)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCitas();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCitas();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCitas]);

  // 4. Cambiar estado de cita con Optimistic UI + Rollback
  const handleStatusChange = async (citaId: string, nuevoEstado: CitaAgenda['estado']) => {
    const estadoAnterior = citas.find((c) => c.id === citaId)?.estado;
    if (!estadoAnterior) return;

    // Actualización optimista
    setCitas((prev) =>
      prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c))
    );

    try {
      await fetchApi(`/citas/${citaId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
    } catch (err: any) {
      console.error('Error al cambiar estado de cita:', err);
      alert(err.message || 'Error al cambiar estado');
      
      // Rollback visual si el backend falla o rechaza la acción
      setCitas((prev) =>
        prev.map((c) => (c.id === citaId ? { ...c, estado: estadoAnterior } : c))
      );
    }
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Cargando Agenda Operativa...
      </div>
    );
  }

  // Filtrar columnas de empleados
  const empleadosFiltrados = (currentUser.rol === 'empleado' && soloMisCitas)
    ? empleados.filter((b) => b.id === currentUser.id)
    : empleados;

  // Filtrar citas si está en "Solo Mis Citas"
  const citasFiltradas = (currentUser.rol === 'empleado' && soloMisCitas)
    ? citas.filter((c) => c.empleadoId === currentUser.id)
    : citas;

  // Encontrar próxima cita pendiente/en curso del día
  const proximaCita = [...citasFiltradas]
    .filter((c) => c.estado === 'programada' || c.estado === 'en_curso')
    .sort((a, b) => new Date(a.inicioEstimado).getTime() - new Date(b.inicioEstimado).getTime())[0];

  const primerNombre = currentUser.nombreCompleto.split(' ')[0];
  const horaProximaFormateada = proximaCita ? format(new Date(proximaCita.inicioEstimado), 'hh:mm a') : '';

  return (
    <div className="min-h-screen min-w-0 flex flex-col bg-background text-foreground">
      <AdminPageHeader title="Agenda" description="Vista operativa de citas del día">
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <button
          onClick={() => setIsMiDesempenoOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-extrabold rounded-xl transition-colors shadow-xs"
          title="Ver mis comisiones e ingresos"
        >
          <Award size={15} />
          <span>Mi Desempeño</span>
        </button>
        <button
          onClick={() => setIsVentaMostradorOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          title="Venta rápida de productos de mostrador"
        >
          <ShoppingBag size={15} />
          <span>Venta Mostrador</span>
        </button>
        <button
          onClick={() => setIsWalkInOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          <span>Nueva Cita</span>
        </button>
      </AdminPageHeader>

      {/* Banner de Bienvenida Personalizado (Solo-preneur / Personalizado) */}
      <div className="bg-gradient-to-r from-primary/10 via-card to-background border-b border-border px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center shadow-xs border border-primary-foreground/20 shrink-0">
            {primerNombre.charAt(0)}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-1.5">
              <span>¡Buen día, {primerNombre}!</span>
              <span className="text-base">👋</span>
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {citasFiltradas.length === 0 ? (
                <span>No tienes citas agendadas para esta fecha.</span>
              ) : (
                <>
                  Tienes <strong className="text-primary font-bold">{citasFiltradas.length} {citasFiltradas.length === 1 ? 'cita' : 'citas'}</strong> agendadas.
                  {proximaCita && (
                    <span className="ml-1 hidden sm:inline text-foreground font-semibold">
                      • Próxima: <strong className="text-primary">{horaProximaFormateada}</strong> ({proximaCita.clienteNombre})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-header de Filtros y Alternador de Vista */}
      <div className="bg-card/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Filtro Equipo (Solo se muestra si hay MÁS de 1 profesional en el local) */}
        {!isSoloPreneur && currentUser.rol === 'empleado' ? (
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border">
            <button
              onClick={() => setSoloMisCitas(true)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
                soloMisCitas
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={14} />
              <span>Solo Mis Citas</span>
            </button>
            <button
              onClick={() => setSoloMisCitas(false)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
                !soloMisCitas
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={14} />
              <span>Ver Todo el Equipo</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground font-semibold">
            <Filter size={14} className="text-primary" />
            <span>{isSoloPreneur ? 'Mi Agenda Personal' : 'Vista Operativa de Citas'}</span>
          </div>
        )}

        {/* Alternador Parrilla vs Lista Compacta */}
        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border">
          <button
            onClick={() => setTipoVistaGrid('parrilla')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
              tipoVistaGrid === 'parrilla'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista de parrilla por horas"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Parrilla Horaria</span>
          </button>

          <button
            onClick={() => setTipoVistaGrid('lista')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
              tipoVistaGrid === 'lista'
                ? 'bg-card text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista de lista secuencial de turnos"
          >
            <List size={14} />
            <span>Lista de Turnos</span>
          </button>
        </div>

      </div>

      {/* Main Content View (Parrilla o Lista) */}
      <main className="flex-1 min-w-0 flex flex-col">
        {tipoVistaGrid === 'parrilla' ? (
          <TimelineGrid
            empleados={empleadosFiltrados}
            citas={citasFiltradas}
            selectedDate={selectedDate}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.rol}
            onStatusChange={handleStatusChange}
            onCobrarClick={(cita) => setCitaParaCobrar(cita)}
          />
        ) : (
          <ListaTurnosView
            empleados={empleadosFiltrados}
            citas={citasFiltradas}
            selectedDate={selectedDate}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.rol}
            onStatusChange={handleStatusChange}
            onCobrarClick={(cita) => setCitaParaCobrar(cita)}
          />
        )}
      </main>

      {/* Modal de Registro Rápido Walk-in */}
      <QuickWalkInModal
        tenantSlug={tenantSlug}
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={loadCitas}
        empleados={empleados}
        initialDate={selectedDate}
      />

      {/* Modal de Cobro de Citas */}
      <CobrarCitaModal
        cita={citaParaCobrar}
        citasDelGrupo={
          citaParaCobrar?.grupoReservaId
            ? citas.filter((c) => c.grupoReservaId === citaParaCobrar.grupoReservaId)
            : undefined
        }
        isOpen={!!citaParaCobrar}
        onClose={() => setCitaParaCobrar(null)}
        onSuccess={loadCitas}
      />

      {/* Modal de Desempeño y Comisiones del Empleado */}
      <MiDesempenoModal
        isOpen={isMiDesempenoOpen}
        onClose={() => setIsMiDesempenoOpen(false)}
      />

      {/* Modal de Venta Mostrador (POS Productos) */}
      <VentaMostradorModal
        isOpen={isVentaMostradorOpen}
        onClose={() => setIsVentaMostradorOpen(false)}
        onSuccess={loadCitas}
      />
    </div>
  );
}
