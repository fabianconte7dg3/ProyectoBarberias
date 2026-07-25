'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  ArrowLeft, Settings, Scissors, Users, ShieldAlert, Plus, Edit2, Trash2,
  CheckCircle2, AlertTriangle, RefreshCw, Lock, Save, UserPlus, ShoppingBag, X, Clock, FileText, History, Calendar, Layers
} from 'lucide-react';
import { HorariosModal } from '@/components/admin/HorariosModal';
import { useTenant } from '@/lib/tenant-context';

interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioBase: string;
  activo: boolean;
}

interface Combo {
  id: string;
  nombre: string;
  precioTotal: string;
  duracionAjustadaMinutos: number | null;
  activo: boolean;
  servicios: { servicioId: string; orden: number; precioAsignado: string; servicio: Servicio }[];
}

interface UsuarioStaff {
  id: string;
  nombreCompleto: string;
  email?: string;
  rol: 'admin' | 'empleado' | 'recepcion';
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

interface BloqueoHistorial {
  id: string;
  tipo: string;
  inicio: string;
  fin: string;
  notas?: string;
  empleado?: {
    nombreCompleto: string;
    rol: string;
  };
}

export default function AdminConfiguracionPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaEmpleado, terminologiaServicio } = useTenant();

  const currentUser = useAdminStore((state) => state.user);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [staff, setStaff] = useState<UsuarioStaff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [historialBloqueos, setHistorialBloqueos] = useState<BloqueoHistorial[]>([]);
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

  // Formulario nuevo combo
  const [isNuevoComboOpen, setIsNuevoComboOpen] = useState(false);
  const [comboNombre, setComboNombre] = useState('');
  const [comboPrecioTotal, setComboPrecioTotal] = useState('');
  const [comboDuracion, setComboDuracion] = useState('');
  const [comboServiciosSel, setComboServiciosSel] = useState<Record<string, string>>({}); // servicioId -> precioAsignado

  // Formulario comisiones (Servicios & Productos)
  const [editingComisionUserId, setEditingComisionUserId] = useState<string | null>(null);
  const [comisionInput, setComisionInput] = useState<string>('');
  const [comisionProductoInput, setComisionProductoInput] = useState<string>('0');
  const [horariosModalEmpleado, setHorariosModalEmpleado] = useState<{ id: string; nombre: string } | null>(null);

  useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resServicios, resCombos, resStaff, resAudit, resBloqueos] = await Promise.all([
        fetchApi<Servicio[]>('/servicios'),
        fetchApi<Combo[]>('/combos'),
        fetchApi<UsuarioStaff[]>('/usuarios'),
        fetchApi<AuditLog[]>('/audit?limit=25'),
        fetchApi<BloqueoHistorial[]>('/horarios/bloqueos-historial'),
      ]);
      setServicios(resServicios || []);
      setCombos(resCombos || []);
      setStaff(resStaff || []);
      setAuditLogs(resAudit || []);
      setHistorialBloqueos(resBloqueos || []);
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

  // 2.5. Combos: alternar selección de servicio, crear, desactivar
  const toggleComboServicio = (servicioId: string, precioBase: string) => {
    setComboServiciosSel((prev) => {
      const next = { ...prev };
      if (servicioId in next) {
        delete next[servicioId];
      } else {
        next[servicioId] = precioBase;
      }
      return next;
    });
  };

  const handleCrearCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const serviciosSeleccionados = Object.entries(comboServiciosSel);
    if (serviciosSeleccionados.length < 2) {
      setError('Un combo necesita al menos 2 servicios.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi('/combos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: comboNombre,
          precioTotal: parseFloat(comboPrecioTotal),
          ...(comboDuracion && { duracionAjustadaMinutos: parseInt(comboDuracion, 10) }),
          servicios: serviciosSeleccionados.map(([servicioId, precioAsignado], idx) => ({
            servicioId,
            orden: idx,
            precioAsignado: parseFloat(precioAsignado),
          })),
        }),
      });

      setSuccessMsg('Combo creado con éxito.');
      setIsNuevoComboOpen(false);
      setComboNombre('');
      setComboPrecioTotal('');
      setComboDuracion('');
      setComboServiciosSel({});
      loadData();
    } catch (err: any) {
      console.error('Error creando combo:', err);
      setError(err.message || 'Error al crear el combo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDeleteCombo = async (id: string) => {
    if (!confirm('¿Seguro que deseas desactivar este combo?')) return;
    try {
      await fetchApi(`/combos/${id}`, { method: 'DELETE' });
      setSuccessMsg('Combo desactivado.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al desactivar el combo.');
    }
  };

  // 3. Actualizar comisiones (Servicios & Productos) de un empleado
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

  const now = new Date();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 shadow-xs">
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
              {terminologiaServicio}s · Inventario · Comisiones · Horarios & Vacaciones · Auditoría Inmutable
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
              <h2 className="text-base font-bold">Catálogo de {terminologiaServicio}s</h2>
            </div>

            <button
              onClick={() => setIsNuevoServicioOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              <span>Nuevo {terminologiaServicio}</span>
            </button>
          </div>

          {/* Formulario Modal Crear Servicio */}
          {isNuevoServicioOpen && (
            <form onSubmit={handleCrearServicio} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crear Nuevo {terminologiaServicio}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={`Nombre del ${terminologiaServicio} (ej. Barba Express)`}
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
                  Guardar {terminologiaServicio}
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

        {/* 2.5. SECCIÓN: Combos de Servicios (bundle rastreado — ver
             docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §2) */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-primary" />
              <div>
                <h2 className="text-base font-bold">Combos de {terminologiaServicio}s</h2>
                <p className="text-xs text-muted-foreground">
                  Agrupa {terminologiaServicio.toLowerCase()}s en un bloque con precio propio — cada uno se sigue
                  contabilizando por separado para reportes y comisión.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNuevoComboOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              <span>Nuevo Combo</span>
            </button>
          </div>

          {isNuevoComboOpen && (
            <form onSubmit={handleCrearCombo} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crear Nuevo Combo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nombre del combo (ej. Corte + Barba)"
                  required
                  value={comboNombre}
                  onChange={(e) => setComboNombre(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
                <input
                  type="number"
                  step="0.50"
                  placeholder="Precio Total del Combo ($)"
                  required
                  value={comboPrecioTotal}
                  onChange={(e) => setComboPrecioTotal(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                />
                <input
                  type="number"
                  placeholder="Duración ajustada (min, opcional)"
                  value={comboDuracion}
                  onChange={(e) => setComboDuracion(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                  Selecciona los {terminologiaServicio.toLowerCase()}s del combo (mínimo 2) y ajusta el precio asignado a cada uno:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {servicios.map((s) => {
                    const seleccionado = s.id in comboServiciosSel;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${seleccionado ? 'bg-primary/10 border-primary/40' : 'bg-background border-border'}`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleComboServicio(s.id, s.precioBase)}
                          className="shrink-0"
                        />
                        <span className="flex-1 truncate">{s.nombre}</span>
                        {seleccionado && (
                          <input
                            type="number"
                            step="0.50"
                            value={comboServiciosSel[s.id]}
                            onChange={(e) => setComboServiciosSel((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="w-20 px-2 py-1 bg-secondary/50 border border-border rounded-md font-mono text-right"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsNuevoComboOpen(false); setComboServiciosSel({}); }}
                  className="px-3 py-1.5 text-xs hover:bg-secondary rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Guardar Combo
                </button>
              </div>
            </form>
          )}

          {combos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Todavía no hay combos configurados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {combos.map((c) => (
                <div key={c.id} className="p-3 bg-secondary/20 border border-border rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.servicios.map((cs) => cs.servicio.nombre).join(' + ')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.duracionAjustadaMinutos ? `${c.duracionAjustadaMinutos} min · ` : ''}
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">${Number(c.precioTotal).toFixed(2)}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSoftDeleteCombo(c.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
                  Configura comisiones independientes por {terminologiaServicio.toLowerCase()} y venta de productos por {terminologiaEmpleado.toLowerCase()}.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {staff.map((u) => (
              <div key={u.id} className="p-4 bg-secondary/20 border border-border rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
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

                {u.rol === 'empleado' && (
                  <div className="flex items-center gap-3">
                    {editingComisionUserId === u.id ? (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{terminologiaServicio}s:</span>
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
                      <div className="flex items-center flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {u.porcentajeComision || '0'}% {terminologiaServicio}s
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
                          onClick={() => setHorariosModalEmpleado({ id: u.id, nombre: u.nombreCompleto })}
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

        {/* 5. SECCIÓN: Historial de Ausencias, Vacaciones y Licencias del Staff */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-blue-500" />
              <div>
                <h2 className="text-base font-bold">Historial de Ausencias, Vacaciones & Licencias del Staff</h2>
                <p className="text-xs text-muted-foreground">
                  Registro histórico de todos los permisos, días libres y vacaciones otorgados al personal.
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Refrescar historial"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border uppercase text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">{terminologiaEmpleado}</th>
                  <th className="py-2.5 px-3">Tipo Permiso</th>
                  <th className="py-2.5 px-3">Período Otorgado</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Motivo / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historialBloqueos.map((b) => {
                  const ini = new Date(b.inicio);
                  const fin = new Date(b.fin);

                  let estadoBadge = <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-secondary text-muted-foreground border border-border">PASADO</span>;
                  if (now >= ini && now <= fin) {
                    estadoBadge = <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">EN CURSO</span>;
                  } else if (ini > now) {
                    estadoBadge = <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">PROGRAMADO</span>;
                  }

                  return (
                    <tr key={b.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground">
                        {b.empleado?.nombreCompleto || `${terminologiaEmpleado} Staff`}
                      </td>
                      <td className="py-3 px-3 uppercase font-mono font-bold text-[11px] text-primary">
                        {b.tipo}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
                        {ini.toLocaleDateString()} {ini.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {fin.toLocaleDateString()} {fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {estadoBadge}
                      </td>
                      <td className="py-3 px-3 text-right italic text-muted-foreground">
                        {b.notas || 'Sin especificación'}
                      </td>
                    </tr>
                  );
                })}

                {historialBloqueos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground italic">
                      No hay registros históricos de vacaciones o permisos en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. SECCIÓN: Historial de Auditoría & Trazabilidad Inmutable */}
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

      {/* Modal Configuración Horario Empleado */}
      {horariosModalEmpleado && (
        <HorariosModal
          isOpen={!!horariosModalEmpleado}
          empleadoId={horariosModalEmpleado.id}
          empleadoNombre={horariosModalEmpleado.nombre}
          onClose={() => setHorariosModalEmpleado(null)}
        />
      )}
    </div>
  );
}
