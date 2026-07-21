'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  ArrowLeft, Settings, Scissors, Users, ShieldAlert, Plus, Edit2, Trash2, 
  CheckCircle2, AlertTriangle, RefreshCw, Lock, Save, UserPlus, ShoppingBag, X, Clock, FileText, History
} from 'lucide-react';
import { HorariosModal } from '@/components/admin/HorariosModal';

interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioBase: string;
  activo: boolean;
}

interface UsuarioStaff {
  id: string;
  nombreCompleto: string;
  email?: string;
  rol: 'admin' | 'barbero' | 'recepcion';
  porcentajeComision?: string;
  porcentajeComisionProducto?: string;
  activo: boolean;
}

interface AuditLog {
  id: string;
  accion: string;
  tablaAfectada: string;
  usuario?: {
    nombreCompleto: string;
    rol: string;
  };
  payloadAntes?: any;
  payloadDespues?: any;
  ipOrigen?: string;
  createdAt: string;
}

export default function AdminConfiguracionPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [staff, setStaff] = useState<UsuarioStaff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [killSwitchActivo, setKillSwitchActivo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario nuevo servicio
  const [isNuevoServicioOpen, setIsNuevoServicioOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDuracion, setNuevaDuracion] = useState('30');
  const [nuevoPrecio, setNuevoPrecio] = useState('15.00');

  // Formulario comisiones (Servicios & Productos)
  const [editingComisionUserId, setEditingComisionUserId] = useState<string | null>(null);
  const [comisionInput, setComisionInput] = useState<string>('');
  const [comisionProductoInput, setComisionProductoInput] = useState<string>('0');
  const [horariosModalBarbero, setHorariosModalBarbero] = useState<{ id: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    if (currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }

    loadData();
  }, [currentUser, tenantSlug, router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resServicios, resStaff, resAudit] = await Promise.all([
        fetchApi<Servicio[]>('/servicios'),
        fetchApi<UsuarioStaff[]>('/usuarios'),
        fetchApi<AuditLog[]>('/audit?limit=25'),
      ]);
      setServicios(resServicios || []);
      setStaff(resStaff || []);
      setAuditLogs(resAudit || []);
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
      setError(err.message || 'Error al conectar con la configuración.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Crear nuevo servicio
  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi('/servicios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevoNombre,
          duracionMinutos: parseInt(nuevaDuracion, 10),
          precioBase: parseFloat(nuevoPrecio),
        }),
      });

      setSuccessMsg('Servicio creado con éxito.');
      setIsNuevoServicioOpen(false);
      setNuevoNombre('');
      loadData();
    } catch (err: any) {
      console.error('Error creando servicio:', err);
      setError(err.message || 'Error al crear el servicio.');
    } finally {
      setSaving(false);
    }
  };

  // 2. Eliminar/Desactivar servicio
  const handleSoftDeleteServicio = async (id: string) => {
    if (!confirm('¿Seguro que deseas desactivar este servicio?')) return;
    try {
      await fetchApi(`/servicios/${id}`, { method: 'DELETE' });
      setSuccessMsg('Servicio desactivado.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al desactivar el servicio.');
    }
  };

  // 3. Actualizar comisiones (Servicios & Productos) de un barbero
  const handleSaveComision = async (usuarioId: string) => {
    const valServicio = parseFloat(comisionInput);
    const valProducto = parseFloat(comisionProductoInput || '0');

    if (isNaN(valServicio) || valServicio < 0 || valServicio > 100) {
      setError('El porcentaje de comisión de servicios debe estar entre 0% y 100%.');
      return;
    }

    if (isNaN(valProducto) || valProducto < 0 || valProducto > 100) {
      setError('El porcentaje de comisión de productos debe estar entre 0% y 100%.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi(`/usuarios/${usuarioId}/comision`, {
        method: 'PATCH',
        body: JSON.stringify({
          porcentajeComision: valServicio,
          porcentajeComisionProducto: valProducto,
        }),
      });

      setSuccessMsg('Porcentajes de comisión (servicios y productos) actualizados exitosamente.');
      setEditingComisionUserId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar comisión.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Toggle Kill-Switch Operativo
  const handleToggleKillSwitch = async (nuevoEstado: boolean) => {
    const accion = nuevoEstado ? 'ACTIVAR la pausa de emergencia' : 'DESACTIVAR la pausa y reanudar';
    if (!confirm(`¿Confirmas que deseas ${accion} en este local?`)) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetchApi<{ killSwitchActivo: boolean; message: string }>('/usuarios/configuracion/kill-switch', {
        method: 'POST',
        body: JSON.stringify({ activo: nuevoEstado }),
      });

      setKillSwitchActivo(res.killSwitchActivo);
      setSuccessMsg(res.message);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar Kill Switch.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando configuración del local...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Settings size={20} className="text-primary" />
              <span>Configuración del Local</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Servicios · Inventario · Comisiones · Horarios · Registro de Auditoría Inmutable
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
        >
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. SECCIÓN: Kill-Switch de Emergencia */}
        <div className="bg-card border border-rose-500/30 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-500" />
              <div>
                <h2 className="text-base font-bold">Pausa Operativa / Kill-Switch de Emergencia</h2>
                <p className="text-xs text-muted-foreground">
                  Detiene inmediatamente la agenda pública y mutaciones. El Admin **mantiene 100% el acceso** para reactivar.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggleKillSwitch(!killSwitchActivo)}
              disabled={saving}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                killSwitchActivo
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {killSwitchActivo ? 'REANUDAR OPERACIÓN' : 'ACTIVAR PAUSA DE EMERGENCIA'}
            </button>
          </div>
        </div>

        {/* 2. SECCIÓN: Catálogo de Servicios */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Scissors size={20} className="text-primary" />
              <h2 className="text-base font-bold">Catálogo de Servicios</h2>
            </div>

            <button
              onClick={() => setIsNuevoServicioOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          {/* Formulario Modal Crear Servicio */}
          {isNuevoServicioOpen && (
            <form onSubmit={handleCrearServicio} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crear Nuevo Servicio</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nombre del Servicio (ej. Barba Express)"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Duración (minutos)"
                  required
                  value={nuevaDuracion}
                  onChange={(e) => setNuevaDuracion(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
                <input
                  type="number"
                  step="0.50"
                  placeholder="Precio Base ($)"
                  required
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNuevoServicioOpen(false)}
                  className="px-3 py-1.5 text-xs hover:bg-secondary rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          )}

          {/* Lista de Servicios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {servicios.map((s) => (
              <div key={s.id} className="p-3 bg-secondary/20 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{s.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.duracionMinutos} min · <strong className="font-mono text-emerald-600 dark:text-emerald-400">${Number(s.precioBase).toFixed(2)}</strong>
                  </div>
                </div>

                <button
                  onClick={() => handleSoftDeleteServicio(s.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. SECCIÓN: Productos & Inventario Retail */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-emerald-500" />
              <div>
                <h2 className="text-base font-bold">Catálogo de Productos & Inventario Retail</h2>
                <p className="text-xs text-muted-foreground">
                  Gestiona los productos adicionales que vendes en el mostrador (pomadas, ceras, tónicos).
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/${tenantSlug}/admin/productos`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Plus size={16} />
              <span>Gestionar Productos</span>
            </button>
          </div>
        </div>

        {/* 4. SECCIÓN: Equipo & Porcentaje de Comisiones */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              <div>
                <h2 className="text-base font-bold">Equipo de Staff & Configuración de Comisiones</h2>
                <p className="text-xs text-muted-foreground">
                  Configura comisiones independientes para servicios de corte y venta de productos por barbero.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {staff.map((u) => (
              <div key={u.id} className="p-4 bg-secondary/20 border border-border rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{u.nombreCompleto}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-secondary border border-border">
                        {u.rol}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email || 'Acceso por PIN'}
                    </div>
                  </div>
                </div>

                {u.rol === 'barbero' && (
                  <div className="flex items-center gap-3">
                    {editingComisionUserId === u.id ? (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Servicios:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={comisionInput}
                            onChange={(e) => setComisionInput(e.target.value)}
                            className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                          />
                          <span className="text-xs font-bold">%</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Productos:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={comisionProductoInput}
                            onChange={(e) => setComisionProductoInput(e.target.value)}
                            className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                          />
                          <span className="text-xs font-bold">%</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSaveComision(u.id)}
                            disabled={saving}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            title="Guardar comisiones"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingComisionUserId(null)}
                            className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {u.porcentajeComision || '0'}% Servicios
                          </span>
                          {Number(u.porcentajeComisionProducto || 0) > 0 ? (
                            <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {u.porcentajeComisionProducto}% Productos
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic px-1">
                              (0% Productos)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingComisionUserId(u.id);
                            setComisionInput(u.porcentajeComision || '0');
                            setComisionProductoInput(u.porcentajeComisionProducto || '0');
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                          title="Editar comisiones"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => setHorariosModalBarbero({ id: u.id, nombre: u.nombreCompleto })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg transition-colors"
                          title="Configurar Horarios y Vacaciones"
                        >
                          <Clock size={14} className="text-primary" />
                          <span>Horarios</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. SECCIÓN: Historial de Auditoría & Trazabilidad Inmutable */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <History size={20} className="text-amber-500" />
              <div>
                <h2 className="text-base font-bold">Historial de Auditoría & Trazabilidad Inmutable</h2>
                <p className="text-xs text-muted-foreground">
                  Registro cronológico auditable de cambios en comisiones, cierres de caja, pausas de emergencia e IP de origen.
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Refrescar auditoría"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border uppercase text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Usuario / Admin</th>
                  <th className="py-2.5 px-3">Tabla Afectada</th>
                  <th className="py-2.5 px-3">IP Origen</th>
                  <th className="py-2.5 px-3 text-right">Detalle Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-primary/10 text-primary border border-primary/20">
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {log.usuario?.nombreCompleto || 'Sistema / Admin'}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {log.tablaAfectada}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {log.ipOrigen}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px]">
                      {log.payloadDespues ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {JSON.stringify(log.payloadDespues)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Sin payload</span>
                      )}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground italic">
                      No hay registros de auditoría almacenados para este local.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal Configuración Horario Barbero */}
      {horariosModalBarbero && (
        <HorariosModal
          isOpen={!!horariosModalBarbero}
          barberoId={horariosModalBarbero.id}
          barberoNombre={horariosModalBarbero.nombre}
          onClose={() => setHorariosModalBarbero(null)}
        />
      )}
    </div>
  );
}
