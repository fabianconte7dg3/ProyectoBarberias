'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { TimelineGrid } from '@/components/admin/TimelineGrid';
import { CitaAgenda } from '@/components/admin/CitaCard';
import { QuickWalkInModal } from '@/components/admin/QuickWalkInModal';
import { CobrarCitaModal } from '@/components/admin/CobrarCitaModal';

interface Barbero {
  id: string;
  nombreCompleto: string;
  rol: string;
}

export default function AdminAgendaPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const logout = useAdminStore((state) => state.logout);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [citas, setCitas] = useState<CitaAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [citaParaCobrar, setCitaParaCobrar] = useState<CitaAgenda | null>(null);

  // 1. Verificar sesión activa contra el backend
  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    fetchApi('/auth/me')
      .catch(() => {
        logout();
        router.push(`/${tenantSlug}/admin/login`);
      });
  }, [currentUser, tenantSlug, router, logout]);

  // 2. Cargar lista de barberos
  useEffect(() => {
    async function loadBarberos() {
      try {
        const data = await fetchApi<Barbero[]>(`/auth/staff/${tenantSlug}`);
        setBarberos(data);
      } catch (err) {
        console.error('Error cargando barberos:', err);
      }
    }
    loadBarberos();
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

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      logout();
      router.push(`/${tenantSlug}/admin/login`);
    }
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Cargando Agenda Operativa...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header con Controles */}
      <AdminHeader
        tenantSlug={tenantSlug}
        userName={currentUser.nombreCompleto}
        userRole={currentUser.rol}
        selectedDate={selectedDate}
        onDateChange={(date) => setSelectedDate(date)}
        onLogout={handleLogout}
        onNewCitaClick={() => setIsWalkInOpen(true)}
      />

      {/* Main Timeline Grid */}
      <main className="flex-1 flex flex-col">
        <TimelineGrid
          barberos={barberos}
          citas={citas}
          selectedDate={selectedDate}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.rol}
          onStatusChange={handleStatusChange}
          onCobrarClick={(cita) => setCitaParaCobrar(cita)}
        />
      </main>

      {/* Modal de Registro Rápido Walk-in */}
      <QuickWalkInModal
        tenantSlug={tenantSlug}
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={loadCitas}
        barberos={barberos}
      />

      {/* Modal de Cobro de Citas */}
      <CobrarCitaModal
        cita={citaParaCobrar}
        isOpen={!!citaParaCobrar}
        onClose={() => setCitaParaCobrar(null)}
        onSuccess={loadCitas}
      />
    </div>
  );
}
