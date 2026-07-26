'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Store, Search, RefreshCw, ExternalLink, Power } from 'lucide-react';
import CrearNegocioModal from '@/components/super-admin/CrearNegocioModal';

interface TenantSummary {
  id: string;
  nombreComercial: string;
  slug: string;
  planSuscripcion: 'independiente' | 'basico' | 'premium';
  estadoBarberia: 'activo' | 'suspendido_pago' | 'cancelado';
  bloqueadoPorPlataforma: boolean;
  adminEmail: string;
  adminNombre: string;
  createdAt: string;
  totalEmpleados: number;
  totalCitasMes: number;
  totalFacturadoMes: number;
}

export default function SuperAdminTenantsPage() {
  const router = useRouter();

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'todos' | 'activo' | 'suspendido_pago' | 'bloqueado_plataforma'>('todos');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<TenantSummary[]>('/super-admin/tenants');
      setTenants(data || []);
    } catch (err: any) {
      console.error('Error cargando negocios:', err);
      if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('Token')) {
        router.push('/super-admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCambiarEstado = async (tenantId: string, nuevoEstado: 'activo' | 'suspendido_pago' | 'cancelado') => {
    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      await loadTenants();
    } catch (err: any) {
      alert('Error cambiando estado: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCambiarPlan = async (tenantId: string, nuevoPlan: 'independiente' | 'basico' | 'premium') => {
    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: nuevoPlan }),
      });
      await loadTenants();
    } catch (err: any) {
      alert('Error cambiando plan: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleKillSwitch = async (tenantId: string, bloqueadoActual: boolean) => {
    const confirmMsg = bloqueadoActual
      ? '¿Deseas DESCONGELAR el negocio en la plataforma?'
      : '⚠️ ¿ACTIVAR KILL-SWITCH PREVENTIVO? Esta acción congelará inmediatamente la cuenta por motivos de seguridad.';

    if (!confirm(confirmMsg)) return;

    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/kill-switch`, {
        method: 'POST',
        body: JSON.stringify({ bloqueado: !bloqueadoActual }),
      });
      await loadTenants();
    } catch (err: any) {
      alert('Error ejecutando Kill Switch: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const tenantsFiltrados = tenants.filter((t) => {
    const matchSearch =
      t.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterState === 'activo') return t.estadoBarberia === 'activo' && !t.bloqueadoPorPlataforma;
    if (filterState === 'suspendido_pago') return t.estadoBarberia === 'suspendido_pago';
    if (filterState === 'bloqueado_plataforma') return t.bloqueadoPorPlataforma;

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Encabezado de página */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Negocios</h1>
          <p className="text-sm text-muted-foreground mt-1">Directorio de tenants y gestión de suscripciones SaaS.</p>
        </div>
        <button
          onClick={() => setModalCrearOpen(true)}
          className="px-4 py-2.5 bg-primary hover:opacity-90 text-primary-foreground text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Store size={16} />
          <span>+ Crear Negocio</span>
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por negocio, slug o email..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterState('todos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterState === 'todos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({tenants.length})
          </button>
          <button
            onClick={() => setFilterState('activo')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterState === 'activo' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFilterState('suspendido_pago')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterState === 'suspendido_pago' ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Falta de Pago
          </button>
          <button
            onClick={() => setFilterState('bloqueado_plataforma')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterState === 'bloqueado_plataforma' ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Kill-Switch Plataforma
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE NEGOCIOS (TENANTS) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Store size={18} className="text-primary" />
            <span>Directorio de Negocios y Suscripciones SaaS</span>
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">{tenantsFiltrados.length} resultados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="py-3.5 px-6">Negocio / Slug</th>
                <th className="py-3.5 px-4">Administrador</th>
                <th className="py-3.5 px-4">Plan SaaS</th>
                <th className="py-3.5 px-4">Estado Suscripción</th>
                <th className="py-3.5 px-4">Métricas Mes</th>
                <th className="py-3.5 px-6 text-right">Acciones de Plataforma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Cargando datos de la plataforma...</span>
                  </td>
                </tr>
              ) : tenantsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No se encontraron negocios con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                tenantsFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/60 transition-colors">
                    {/* Columna 1: Negocio */}
                    <td className="py-4 px-6">
                      <a
                        href={`/super-admin/tenants/${t.id}`}
                        className="font-bold text-foreground text-sm hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{t.nombreComercial}</span>
                        <ExternalLink size={12} className="text-outline" />
                      </a>
                      <div className="text-[11px] font-mono text-muted-foreground">{t.slug}</div>
                    </td>

                    {/* Columna 2: Admin */}
                    <td className="py-4 px-4">
                      <div className="text-foreground font-semibold">{t.adminNombre}</div>
                      <div className="text-[11px] text-muted-foreground">{t.adminEmail}</div>
                    </td>

                    {/* Columna 3: Plan */}
                    <td className="py-4 px-4">
                      <select
                        value={t.planSuscripcion}
                        disabled={actionLoading === t.id}
                        onChange={(e) => handleCambiarPlan(t.id, e.target.value as any)}
                        className="bg-background border border-border rounded-lg text-xs px-2.5 py-1 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="independiente">Individual ($6/mo)</option>
                        <option value="basico">Básico ($29/mo)</option>
                        <option value="premium">Premium ($79/mo)</option>
                      </select>
                    </td>

                    {/* Columna 4: Estado Suscripción */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={t.estadoBarberia}
                          disabled={actionLoading === t.id}
                          onChange={(e) => handleCambiarEstado(t.id, e.target.value as any)}
                          className={`border rounded-lg text-xs px-2.5 py-1 font-extrabold focus:outline-none cursor-pointer ${
                            t.estadoBarberia === 'activo'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                              : t.estadoBarberia === 'suspendido_pago'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                              : 'bg-red-500/10 border-red-500/30 text-red-600'
                          }`}
                        >
                          <option value="activo">Activo</option>
                          <option value="suspendido_pago">Suspendido por Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>

                        {t.bloqueadoPorPlataforma && (
                          <span className="px-2 py-0.5 bg-red-600/10 border border-red-500/30 text-red-600 text-[10px] font-black rounded-md uppercase tracking-wider">
                            KILL-SWITCH
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Columna 5: Métricas Mes */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-foreground">${t.totalFacturadoMes.toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground">{t.totalCitasMes} citas · {t.totalEmpleados} empleados</div>
                    </td>

                    {/* Columna 6: Acciones de Plataforma */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleToggleKillSwitch(t.id, t.bloqueadoPorPlataforma)}
                        disabled={actionLoading === t.id}
                        className={`p-2 rounded-lg transition-all ${
                          t.bloqueadoPorPlataforma
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30'
                        }`}
                        title={t.bloqueadoPorPlataforma ? 'Descongelar Negocio' : 'Kill Switch de Emergencia'}
                      >
                        <Power size={16} />
                      </button>

                      <a
                        href={`/${t.slug}/admin`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 inline-flex bg-muted hover:bg-accent text-foreground rounded-lg transition-colors"
                        title="Inspeccionar Negocio (Solo lectura)"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CrearNegocioModal
        isOpen={modalCrearOpen}
        onClose={() => setModalCrearOpen(false)}
        onSuccess={loadTenants}
      />
    </div>
  );
}
