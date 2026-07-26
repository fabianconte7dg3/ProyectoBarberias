'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { TrendingUp, Store, AlertOctagon, RefreshCw, DollarSign } from 'lucide-react';

interface PlatformStats {
  totalBarberias: number;
  barberiasActivas: number;
  barberiasSuspendidas: number;
  mrrEstimado: number;
  mrrEtiqueta: string;
  totalCitasMes: number;
  totalFacturadoMes: number;
}

import AlertasSeguridadPanel from '@/components/super-admin/AlertasSeguridadPanel';
import NegociosEnRiesgoCard from '@/components/super-admin/NegociosEnRiesgoCard';

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<PlatformStats>('/super-admin/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Error cargando métricas de la plataforma:', err);
      if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('Token')) {
        router.push('/super-admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Encabezado de página */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resumen General</h1>
          <p className="text-sm text-muted-foreground mt-1">Métricas de la plataforma y actividad de los negocios.</p>
        </div>
        <button
          onClick={loadStats}
          className="p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-xl transition-all"
          title="Recargar datos"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">MRR Estimado</span>
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground tracking-tight">${stats?.mrrEstimado.toFixed(2) || '0.00'}</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">
              {stats?.mrrEtiqueta || 'MRR Estimado (Basado en planes activos)'}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Negocios Activos</span>
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Store size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{stats?.barberiasActivas || 0}</span>
            <span className="text-xs text-muted-foreground font-medium">de {stats?.totalBarberias || 0} registrados</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Suspendidas / Pausa</span>
            <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center">
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">{stats?.barberiasSuspendidas || 0}</span>
            <p className="text-[10px] text-amber-600 font-medium mt-1">Por falta de pago o Kill-Switch</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Volumen Mes</span>
            <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-foreground">${stats?.totalFacturadoMes.toFixed(2) || '0.00'}</span>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">{stats?.totalCitasMes || 0} citas procesadas este mes</p>
          </div>
        </div>
      </div>

      {/* OBSERVABILIDAD Y RIESGO DE NEGOCIO */}
      <AlertasSeguridadPanel />
      <NegociosEnRiesgoCard />
    </div>
  );
}
