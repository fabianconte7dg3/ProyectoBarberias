'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInMinutes } from 'date-fns';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTenant } from '@/lib/tenant-context';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CitaAgenda } from '@/components/admin/CitaCard';
import { QuickWalkInModal } from '@/components/admin/QuickWalkInModal';
import { CobrarCitaModal } from '@/components/admin/CobrarCitaModal';
import { MiDesempenoModal } from '@/components/admin/MiDesempenoModal';
import {
  Scissors, DollarSign, HandCoins, Timer, Play, CheckCircle2,
  Phone, Plus, MoreVertical, AlertTriangle, XCircle, Users,
} from 'lucide-react';

interface MiDesempenoHoy {
  totalCitas: number;
  comisionTotal: number;
  propinaTotal: number;
}

export default function MiSillaPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaServicio, terminologiaCliente } = useTenant();

  const { currentUser } = useAdminAuth({ tenantSlug, requiredRole: 'empleado' });
  const logout = useAdminStore((state) => state.logout);

  const [citas, setCitas] = useState<CitaAgenda[]>([]);
  const [desempeno, setDesempeno] = useState<MiDesempenoHoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [citaParaCobrar, setCitaParaCobrar] = useState<CitaAgenda | null>(null);
  const [isMiDesempenoOpen, setIsMiDesempenoOpen] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const hoyStr = format(new Date(), 'yyyy-MM-dd');
      const [citasData, desempenoData] = await Promise.all([
        fetchApi<CitaAgenda[]>(`/citas?fecha=${hoyStr}`),
        fetchApi<MiDesempenoHoy>(`/reportes/mi-desempeno?desde=${hoyStr}&hasta=${hoyStr}`),
      ]);
      setCitas(citasData);
      setDesempeno(desempenoData);
    } catch (err) {
      console.error('Error cargando Mi Silla:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Mismo patrón de polling que la agenda operativa: refresca cada 30s
    // solo si la pestaña está visible.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  const handleStatusChange = async (citaId: string, nuevoEstado: CitaAgenda['estado']) => {
    const estadoAnterior = citas.find((c) => c.id === citaId)?.estado;
    if (!estadoAnterior) return;

    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)));
    setMenuAbierto(null);

    try {
      await fetchApi(`/citas/${citaId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
    } catch (err: any) {
      console.error('Error al cambiar estado de cita:', err);
      alert(err.message || 'Error al cambiar estado');
      setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado: estadoAnterior } : c)));
    }
  };

  const handleWhatsapp = (telefono: string) => {
    if (!telefono) return;
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}`, '_blank');
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
        Cargando Mi Silla...
      </div>
    );
  }

  const citasActivas = [...citas]
    .filter((c) => c.estado !== 'cancelada')
    .sort((a, b) => new Date(a.inicioEstimado).getTime() - new Date(b.inicioEstimado).getTime());

  const enSilla = citasActivas.find((c) => c.estado === 'en_curso');
  const pendientes = citasActivas.filter((c) => c.estado === 'programada');
  const completadas = citasActivas.filter((c) => c.estado === 'completada');
  const otras = citasActivas.filter((c) => c.estado === 'ausente_strike');

  const tiempoPromedioMin = completadas.length > 0
    ? Math.round(
        completadas.reduce(
          (sum, c) => sum + differenceInMinutes(new Date(c.finEstimado), new Date(c.inicioEstimado)),
          0
        ) / completadas.length
      )
    : 0;

  const ahora = new Date();
  const progresoEnSilla = enSilla
    ? Math.min(
        100,
        Math.max(
          0,
          (differenceInMinutes(ahora, new Date(enSilla.inicioEstimado)) /
            Math.max(1, differenceInMinutes(new Date(enSilla.finEstimado), new Date(enSilla.inicioEstimado)))) *
            100
        )
      )
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AdminHeader
        tenantSlug={tenantSlug}
        userName={currentUser.nombreCompleto}
        userRole={currentUser.rol}
        onLogout={handleLogout}
        onNewCitaClick={() => setIsWalkInOpen(true)}
        onMiDesempenoClick={() => setIsMiDesempenoOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Encabezado de página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Hoy</span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Mi Silla</h1>
          </div>
          <button
            onClick={() => setIsWalkInOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl shadow-xs hover:opacity-90 transition-opacity self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Añadir Walk-in</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">{terminologiaServicio}s</span>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Scissors size={14} /></div>
            </div>
            <div className="text-2xl font-extrabold font-mono text-foreground">{desempeno?.totalCitas ?? 0}</div>
          </div>

          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Comisiones</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><DollarSign size={14} /></div>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              ${(desempeno?.comisionTotal ?? 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Propinas</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><HandCoins size={14} /></div>
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-500">
              ${(desempeno?.propinaTotal ?? 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Tiempo Promedio</span>
              <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary"><Timer size={14} /></div>
            </div>
            <div className="text-2xl font-extrabold font-mono text-foreground">
              {tiempoPromedioMin > 0 ? `${tiempoPromedioMin} min` : '—'}
            </div>
          </div>
        </div>

        {/* Cola de Clientes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span>Cola de {terminologiaCliente}s</span>
            </h2>
            {pendientes.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
                {pendientes.length} Pendiente{pendientes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!enSilla && pendientes.length === 0 && completadas.length === 0 && otras.length === 0 && (
            <div className="py-10 px-4 text-center text-muted-foreground text-xs font-semibold bg-card border border-dashed border-border rounded-2xl">
              No tienes citas agendadas para hoy. Usa &quot;Añadir Walk-in&quot; para registrar una.
            </div>
          )}

          {/* Tarjeta destacada: cita actualmente en silla */}
          {enSilla && (
            <div className="border-2 border-primary bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-pulse-slow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-extrabold text-foreground truncate">{enSilla.clienteNombre}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                      En Silla
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
                    <Scissors size={12} className="opacity-70" />
                    <span>{enSilla.comboNombre || enSilla.servicioNombre}</span>
                    {enSilla.pacienteNombre && <span className="text-muted-foreground/80">· {enSilla.pacienteNombre}</span>}
                    <span className="text-muted-foreground/60">
                      · {format(new Date(enSilla.inicioEstimado), 'hh:mm a')} - {format(new Date(enSilla.finEstimado), 'hh:mm a')}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {enSilla.clienteTelefono && (
                    <button
                      onClick={() => handleWhatsapp(enSilla.clienteTelefono)}
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <Phone size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setCitaParaCobrar(enSilla)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle2 size={15} />
                    <span>Finalizar</span>
                  </button>
                </div>
              </div>

              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progresoEnSilla}%` }}
                />
              </div>
            </div>
          )}

          {/* Siguientes pendientes */}
          {pendientes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pendientes.map((cita, idx) => (
                <div
                  key={cita.id}
                  className="relative bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase text-primary">
                      {idx === 0 && !enSilla ? 'Siguiente' : 'Pendiente'} · {format(new Date(cita.inicioEstimado), 'hh:mm a')}
                    </span>
                    <p className="text-sm font-bold text-foreground truncate">{cita.clienteNombre}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{cita.comboNombre || cita.servicioNombre}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 relative">
                    {!enSilla && idx === 0 && (
                      <button
                        onClick={() => handleStatusChange(cita.id, 'en_curso')}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Pasar a Silla"
                      >
                        <Play size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === cita.id ? null : cita.id)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Opciones"
                    >
                      <MoreVertical size={15} />
                    </button>

                    {menuAbierto === cita.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />
                        <div className="absolute right-0 top-9 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1.5 w-48 animate-in fade-in zoom-in-95">
                          <button
                            onClick={() => handleStatusChange(cita.id, 'ausente_strike')}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <AlertTriangle size={14} />
                            <span>Marcar Ausente</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(cita.id, 'cancelada')}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            <XCircle size={14} />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Servicios de Hoy (Completados) */}
        {completadas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>{terminologiaServicio}s de Hoy (Completados)</span>
            </h2>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border font-bold uppercase text-muted-foreground text-[10px]">
                    <th className="py-2.5 px-4">{terminologiaCliente}</th>
                    <th className="py-2.5 px-4">{terminologiaServicio}</th>
                    <th className="py-2.5 px-4">Hora</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {completadas.map((c) => (
                    <tr key={c.id} className="hover:bg-secondary/30">
                      <td className="py-2.5 px-4 font-semibold">{c.clienteNombre}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{c.comboNombre || c.servicioNombre}</td>
                      <td className="py-2.5 px-4 font-mono">{format(new Date(c.inicioEstimado), 'hh:mm a')}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        ${Number(c.comboPrecio ?? c.servicioPrecio ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                          Pagado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Registro Rápido Walk-in (bloqueado a mi propio usuario) */}
      <QuickWalkInModal
        tenantSlug={tenantSlug}
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={loadData}
        empleados={[{ id: currentUser.id, nombreCompleto: currentUser.nombreCompleto }]}
        initialDate={new Date()}
      />

      {/* Modal de Cobro */}
      <CobrarCitaModal
        cita={citaParaCobrar}
        citasDelGrupo={
          citaParaCobrar?.grupoReservaId
            ? citas.filter((c) => c.grupoReservaId === citaParaCobrar.grupoReservaId)
            : undefined
        }
        isOpen={!!citaParaCobrar}
        onClose={() => setCitaParaCobrar(null)}
        onSuccess={loadData}
      />

      {/* Modal de Desempeño histórico (30 días) */}
      <MiDesempenoModal
        isOpen={isMiDesempenoOpen}
        onClose={() => setIsMiDesempenoOpen(false)}
      />
    </div>
  );
}
