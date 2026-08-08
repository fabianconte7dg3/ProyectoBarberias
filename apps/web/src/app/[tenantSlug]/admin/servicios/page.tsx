'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTenant } from '@/lib/tenant-context';
import {
  Plus, RefreshCw, AlertTriangle, CheckCircle2, Edit, X, Clock, Layers, Trash2, Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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

type SortKey = 'nombre' | 'precioDesc' | 'precioAsc' | 'duracion';

export default function AdminServiciosPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaServicio } = useTenant();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtro de visibilidad (real: basado en el campo activo)
  const [mostrarActivos, setMostrarActivos] = useState(true);
  const [mostrarInactivos, setMostrarInactivos] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('nombre');

  // Modal Crear/Editar Servicio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDuracion, setFormDuracion] = useState('30');
  const [formPrecio, setFormPrecio] = useState('15.00');

  // Formulario nuevo combo
  const [isNuevoComboOpen, setIsNuevoComboOpen] = useState(false);
  const [comboNombre, setComboNombre] = useState('');
  const [comboPrecioTotal, setComboPrecioTotal] = useState('');
  const [comboDuracion, setComboDuracion] = useState('');
  const [comboServiciosSel, setComboServiciosSel] = useState<Record<string, string>>({});

  useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resServicios, resCombos] = await Promise.all([
        fetchApi<Servicio[]>('/servicios'),
        fetchApi<Combo[]>('/combos'),
      ]);
      setServicios(resServicios || []);
      setCombos(resCombos || []);
    } catch (err: any) {
      console.error('Error cargando catálogo de servicios:', err);
      setError(err.message || 'Error al conectar con la API de servicios.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (servicio?: Servicio) => {
    if (servicio) {
      setEditingId(servicio.id);
      setFormNombre(servicio.nombre);
      setFormDuracion(servicio.duracionMinutos.toString());
      setFormPrecio(Number(servicio.precioBase).toFixed(2));
    } else {
      setEditingId(null);
      setFormNombre('');
      setFormDuracion('30');
      setFormPrecio('15.00');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const body = {
        nombre: formNombre,
        duracionMinutos: parseInt(formDuracion, 10),
        precioBase: parseFloat(formPrecio),
      };

      if (editingId) {
        await fetchApi(`/servicios/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
        setSuccessMsg(`${terminologiaServicio} actualizado con éxito.`);
      } else {
        await fetchApi('/servicios', { method: 'POST', body: JSON.stringify(body) });
        setSuccessMsg(`${terminologiaServicio} creado con éxito.`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || `Error al guardar el ${terminologiaServicio.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (servicio: Servicio) => {
    try {
      await fetchApi(`/servicios/${servicio.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !servicio.activo }),
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado.');
    }
  };

  // Combos: alternar selección, crear, desactivar (migrado verbatim desde
  // configuracion/page.tsx — sin cambios de lógica, solo de ubicación)
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

  const serviciosActivos = servicios.filter((s) => s.activo);
  const serviciosInactivos = servicios.filter((s) => !s.activo);

  const serviciosVisibles = servicios
    .filter((s) => (s.activo ? mostrarActivos : mostrarInactivos))
    .sort((a, b) => {
      switch (sortKey) {
        case 'precioDesc':
          return Number(b.precioBase) - Number(a.precioBase);
        case 'precioAsc':
          return Number(a.precioBase) - Number(b.precioBase);
        case 'duracion':
          return b.duracionMinutos - a.duracionMinutos;
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground flex flex-col font-sans">

      <AdminPageHeader
        title="Catálogo de Servicios"
        description={`Gestiona tu oferta de ${terminologiaServicio.toLowerCase()}s y combos.`}
      >
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          <span>Nuevo {terminologiaServicio}</span>
        </button>
      </AdminPageHeader>

      <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel de Filtro: Estado de Visibilidad (real — basado en s.activo) */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado de Visibilidad</h3>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={mostrarActivos}
                  onChange={(e) => setMostrarActivos(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  Activos ({serviciosActivos.length})
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-sm group-hover:text-primary transition-colors">
                  Inactivos ({serviciosInactivos.length})
                </span>
              </label>
            </div>
            <button
              onClick={loadData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-colors border border-border"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </aside>

          {/* Canvas: Grid de Servicios */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border overflow-x-auto">
              {([
                ['nombre', 'Nombre (A-Z)'],
                ['precioDesc', 'Precio: Mayor a Menor'],
                ['precioAsc', 'Precio: Menor a Mayor'],
                ['duracion', 'Duración'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    sortKey === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {serviciosVisibles.map((s) => (
                <article key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sparkles size={18} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        s.activo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm text-foreground">{s.nombre}</h4>
                      <span className="text-primary font-bold text-base whitespace-nowrap">${Number(s.precioBase).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-auto pt-3">
                      <Clock size={14} />
                      <span>{s.duracionMinutos} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-5 pb-5 pt-1">
                    <button
                      onClick={() => handleOpenModal(s)}
                      className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleToggleActivo(s)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        s.activo ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      }`}
                    >
                      {s.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              ))}

              {/* Tarjeta Añadir Nuevo */}
              <button
                onClick={() => handleOpenModal()}
                className="bg-secondary/30 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 group hover:border-primary hover:bg-primary/5 transition-all min-h-[176px]"
              >
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs">
                  <Plus size={22} />
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  Nuevo {terminologiaServicio}
                </h4>
              </button>

              {serviciosVisibles.length === 0 && !loading && servicios.length > 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No hay {terminologiaServicio.toLowerCase()}s que coincidan con el filtro de visibilidad.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Combos de Servicios (bundle rastreado — ver
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
                  {serviciosActivos.map((s) => {
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
                  className="px-3 py-1.5 text-xs hover:bg-secondary hover:text-secondary-foreground rounded-lg"
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

      </main>

      {/* Modal Crear / Editar Servicio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-bold text-base">
                {editingId ? `Editar ${terminologiaServicio}` : `Nuevo ${terminologiaServicio}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder={`ej. Corte Fade + Barba`}
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min={5}
                    required
                    value={formDuracion}
                    onChange={(e) => setFormDuracion(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Precio Base ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    min={0}
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  {saving ? 'Guardando...' : `Guardar ${terminologiaServicio}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
