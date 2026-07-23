'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import {
  ShieldCheck,
  TrendingUp,
  Store,
  AlertOctagon,
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  Power,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface PlatformStats {
  totalBarberias: number;
  barberiasActivas: number;
  barberiasSuspendidas: number;
  mrrEstimado: number;
  mrrEtiqueta: string;
  totalCitasMes: number;
  totalFacturadoMes: number;
}

interface TenantSummary {
  id: string;
  nombreComercial: string;
  slug: string;
  planSuscripcion: 'basico' | 'premium';
  estadoBarberia: 'activo' | 'suspendido_pago' | 'cancelado';
  bloqueadoPorPlataforma: boolean;
  adminEmail: string;
  adminNombre: string;
  createdAt: string;
  totalBarberos: number;
  totalCitasMes: number;
  totalFacturadoMes: number;
}

import CrearBarberiaModal from '@/components/super-admin/CrearBarberiaModal';
import AlertasSeguridadPanel from '@/components/super-admin/AlertasSeguridadPanel';
import BarberiasEnRiesgoCard from '@/components/super-admin/BarberiasEnRiesgoCard';

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'todos' | 'activo' | 'suspendido_pago' | 'bloqueado_plataforma'>('todos');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tenantsData] = await Promise.all([
        fetchApi<PlatformStats>('/super-admin/stats'),
        fetchApi<TenantSummary[]>('/super-admin/tenants'),
      ]);
      setStats(statsData);
      setTenants(tenantsData || []);
    } catch (err: any) {
      console.error('Error cargando consola superadmin:', err);
      if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('Token')) {
        router.push('/super-admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCambiarEstado = async (tenantId: string, nuevoEstado: 'activo' | 'suspendido_pago' | 'cancelado') => {
    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      await loadData();
    } catch (err: any) {
      alert('Error cambiando estado: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCambiarPlan = async (tenantId: string, nuevoPlan: 'basico' | 'premium') => {
    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: nuevoPlan }),
      });
      await loadData();
    } catch (err: any) {
      alert('Error cambiando plan: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleKillSwitch = async (tenantId: string, bloqueadoActual: boolean) => {
    const confirmMsg = bloqueadoActual
      ? '¿Deseas DESCONGELAR la barbería en la plataforma?'
      : '⚠️ ¿ACTIVAR KILL-SWITCH PREVENTIVO? Esta acción congelará inmediatamente la cuenta por motivos de seguridad.';
    
    if (!confirm(confirmMsg)) return;

    setActionLoading(tenantId);
    try {
      await fetchApi(`/super-admin/tenants/${tenantId}/kill-switch`, {
        method: 'POST',
        body: JSON.stringify({ bloqueado: !bloqueadoActual }),
      });
      await loadData();
    } catch (err: any) {
      alert('Error ejecutando Kill Switch: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (err) {}
    router.push('/super-admin/login');
  };

  // Filtrado dinámico
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Superior Global */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>BarberOS SaaS Platform</span>
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Super Admin
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Consola Central de Gestión de Barberías y Suscripciones</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalCrearOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Store size={16} />
            <span>+ Crear Barbería</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            title="Recargar datos"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: MRR Estimado */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">MRR Estimado</span>
              <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white tracking-tight">${stats?.mrrEstimado.toFixed(2) || '0.00'}</span>
              <p className="text-[10px] text-emerald-400/90 font-bold mt-1">
                {stats?.mrrEtiqueta || 'MRR Estimado (Basado en planes activos)'}
              </p>
            </div>
          </div>

          {/* Card 2: Barberías Activas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Barberías Activas</span>
              <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                <Store size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.barberiasActivas || 0}</span>
              <span className="text-xs text-slate-400 font-medium">de {stats?.totalBarberias || 0} registradas</span>
            </div>
          </div>

          {/* Card 3: Suspendidas / Bloqueadas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Suspendidas / Pausa</span>
              <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center">
                <AlertOctagon size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white">{stats?.barberiasSuspendidas || 0}</span>
              <p className="text-[10px] text-amber-400 font-medium mt-1">Por falta de pago o Kill-Switch</p>
            </div>
          </div>

          {/* Card 4: Volumen Mensual */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Volumen Mes</span>
              <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white">${stats?.totalFacturadoMes.toFixed(2) || '0.00'}</span>
              <p className="text-[10px] text-slate-400 font-medium mt-1">{stats?.totalCitasMes || 0} citas procesadas este mes</p>
            </div>
          </div>
        </div>

        {/* COMPONENTES DE OBSERVABILIDAD Y RIESGO DE NEGOCIO */}
        <AlertasSeguridadPanel />
        <BarberiasEnRiesgoCard />

        {/* CONTROLES DE FILTRO Y BÚSQUEDA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por negocio, slug o email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterState('todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterState === 'todos' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({tenants.length})
            </button>
            <button
              onClick={() => setFilterState('activo')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterState === 'activo' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setFilterState('suspendido_pago')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterState === 'suspendido_pago' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Falta de Pago
            </button>
            <button
              onClick={() => setFilterState('bloqueado_plataforma')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterState === 'bloqueado_plataforma' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Kill-Switch Plataforma
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE BARBERÍAS (TENANTS) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Store size={18} className="text-blue-400" />
              <span>Directorio de Barberías y Suscripciones SaaS</span>
            </h2>
            <span className="text-xs text-slate-400 font-semibold">{tenantsFiltrados.length} resultados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-6">Barbería / Slug</th>
                  <th className="py-3.5 px-4">Administrador</th>
                  <th className="py-3.5 px-4">Plan SaaS</th>
                  <th className="py-3.5 px-4">Estado Suscripción</th>
                  <th className="py-3.5 px-4">Métricas Mes</th>
                  <th className="py-3.5 px-6 text-right">Acciones de Plataforma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      <span>Cargando datos de la plataforma...</span>
                    </td>
                  </tr>
                ) : tenantsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No se encontraron barberías con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  tenantsFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Columna 1: Barbería */}
                      <td className="py-4 px-6">
                        <a
                          href={`/super-admin/tenants/${t.id}`}
                          className="font-bold text-white text-sm hover:text-blue-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{t.nombreComercial}</span>
                          <ExternalLink size={12} className="text-slate-500" />
                        </a>
                        <div className="text-[11px] font-mono text-slate-400">{t.slug}</div>
                      </td>

                      {/* Columna 2: Admin */}
                      <td className="py-4 px-4">
                        <div className="text-slate-200 font-semibold">{t.adminNombre}</div>
                        <div className="text-[11px] text-slate-400">{t.adminEmail}</div>
                      </td>

                      {/* Columna 3: Plan */}
                      <td className="py-4 px-4">
                        <select
                          value={t.planSuscripcion}
                          disabled={actionLoading === t.id}
                          onChange={(e) => handleCambiarPlan(t.id, e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-2.5 py-1 font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
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
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : t.estadoBarberia === 'suspendido_pago'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}
                          >
                            <option value="activo">Activo</option>
                            <option value="suspendido_pago">Suspendido por Pago</option>
                            <option value="cancelado">Cancelado</option>
                          </select>

                          {t.bloqueadoPorPlataforma && (
                            <span className="px-2 py-0.5 bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-black rounded-md uppercase tracking-wider">
                              KILL-SWITCH
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Columna 5: Métricas Mes */}
                      <td className="py-4 px-4 space-y-0.5">
                        <div className="font-bold text-white">${t.totalFacturadoMes.toFixed(2)}</div>
                        <div className="text-[11px] text-slate-400">{t.totalCitasMes} citas · {t.totalBarberos} barberos</div>
                      </td>

                      {/* Columna 6: Acciones de Plataforma */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {/* Botón Kill Switch */}
                        <button
                          onClick={() => handleToggleKillSwitch(t.id, t.bloqueadoPorPlataforma)}
                          disabled={actionLoading === t.id}
                          className={`p-2 rounded-xl transition-all ${
                            t.bloqueadoPorPlataforma
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                          title={t.bloqueadoPorPlataforma ? 'Descongelar Barbería' : 'Kill Switch de Emergencia'}
                        >
                          <Power size={16} />
                        </button>

                        {/* Enlace de Inspección Rápida */}
                        <a
                          href={`http://localhost:3001/${t.slug}/admin`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 inline-flex bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                          title="Inspeccionar Barbería (Solo lectura)"
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

      </main>

      <CrearBarberiaModal
        isOpen={modalCrearOpen}
        onClose={() => setModalCrearOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
