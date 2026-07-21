'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  ArrowLeft, TrendingUp, DollarSign, QrCode, CreditCard, Users, 
  AlertTriangle, RefreshCw, Calendar, Award, Receipt, ChevronDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, subMonths } from 'date-fns';

interface RendimientoBarbero {
  barberoId: string;
  nombreCompleto: string;
  porcentajeComision: number;
  totalCitas: number;
  totalFacturado: number;
  comisionTotal: number;
  propinaTotal: number;
}

interface ClienteStrike {
  id: string;
  nombreCompleto: string;
  telefonoWhatsapp: string;
  strikesCount: number;
}

interface DashboardData {
  rangoFechas: { desde: string; hasta: string };
  ingresosTotales: number;
  totalTransacciones: number;
  desgloseMetodosPago: {
    efectivo: number;
    yappy: number;
    mixto: number;
  };
  rendimientoBarberos: RendimientoBarbero[];
  clientesStrikes: ClienteStrike[];
}

export type PeriodoPreset = 
  | 'hoy' 
  | 'ayer' 
  | 'ultimos_7_dias' 
  | 'ultimos_30_dias' 
  | 'este_mes' 
  | 'mes_anterior' 
  | 'este_ano' 
  | 'personalizado';

const PRESETS_LABEL: Record<PeriodoPreset, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  ultimos_7_dias: 'Últimos 7 días',
  ultimos_30_dias: 'Últimos 30 días ⭐',
  este_mes: 'Este mes',
  mes_anterior: 'Mes anterior',
  este_ano: 'Este año',
  personalizado: 'Rango personalizado',
};

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtro por defecto: Últimos 30 días ⭐
  const today = new Date();
  const [preset, setPreset] = useState<PeriodoPreset>('ultimos_30_dias');
  const [fechaDesde, setFechaDesde] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(today, 'yyyy-MM-dd'));

  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    if (currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }

    loadDashboard(fechaDesde, fechaHasta);
  }, [currentUser, tenantSlug, router]);

  const loadDashboard = async (desde: string, hasta: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<DashboardData>(`/reportes/dashboard?desde=${desde}&hasta=${hasta}`);
      setData(res);
    } catch (err: any) {
      console.error('Error cargando métricas:', err);
      setError(err.message || 'Error al conectar con el reporte de métricas.');
    } finally {
      setLoading(false);
    }
  };

  // Manejador exacto para cada uno de los 8 rangos de período
  const handlePresetChange = (newPreset: PeriodoPreset) => {
    setPreset(newPreset);
    const now = new Date();
    let d = format(now, 'yyyy-MM-dd');
    let h = format(now, 'yyyy-MM-dd');

    if (newPreset === 'hoy') {
      d = format(now, 'yyyy-MM-dd');
      h = format(now, 'yyyy-MM-dd');
    } else if (newPreset === 'ayer') {
      const ayer = subDays(now, 1);
      d = format(ayer, 'yyyy-MM-dd');
      h = format(ayer, 'yyyy-MM-dd');
    } else if (newPreset === 'ultimos_7_dias') {
      d = format(subDays(now, 7), 'yyyy-MM-dd');
      h = format(now, 'yyyy-MM-dd');
    } else if (newPreset === 'ultimos_30_dias') {
      d = format(subDays(now, 30), 'yyyy-MM-dd');
      h = format(now, 'yyyy-MM-dd');
    } else if (newPreset === 'este_mes') {
      d = format(startOfMonth(now), 'yyyy-MM-dd');
      h = format(endOfMonth(now), 'yyyy-MM-dd');
    } else if (newPreset === 'mes_anterior') {
      const prevMonth = subMonths(now, 1);
      d = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
      h = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
    } else if (newPreset === 'este_ano') {
      d = format(startOfYear(now), 'yyyy-MM-dd');
      h = format(now, 'yyyy-MM-dd');
    }

    if (newPreset !== 'personalizado') {
      setFechaDesde(d);
      setFechaHasta(h);
      loadDashboard(d, h);
    }
  };

  const handleCustomDateApply = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboard(fechaDesde, fechaHasta);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando analítica financiera ejecutiva...</span>
        </div>
      </div>
    );
  }

  const ticketPromedio = data && data.totalTransacciones > 0
    ? (data.ingresosTotales / data.totalTransacciones).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              <span>Analítica Ejecutiva & Finanzas</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Período: <strong className="text-foreground">{fechaDesde}</strong> al <strong className="text-foreground">{fechaHasta}</strong>
            </p>
          </div>
        </div>

        {/* Control de Seleccionar Período de 8 Opciones */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-xl border border-border">
            <Calendar size={16} className="text-primary" />
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as PeriodoPreset)}
              className="bg-transparent text-xs font-extrabold text-foreground border-0 focus:outline-hidden cursor-pointer"
            >
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="ultimos_7_dias">Últimos 7 días</option>
              <option value="ultimos_30_dias">Últimos 30 días ⭐</option>
              <option value="este_mes">Este mes</option>
              <option value="mes_anterior">Mes anterior</option>
              <option value="este_ano">Este año</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
          </div>

          <button
            onClick={() => loadDashboard(fechaDesde, fechaHasta)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border border-border"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Selector de Rango Personalizado */}
        {preset === 'personalizado' && (
          <form onSubmit={handleCustomDateApply} className="bg-card border border-border p-4 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Calendar size={16} className="text-primary" />
              <span>Seleccionar Rango de Fechas</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Desde:</span>
              <input
                type="date"
                required
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-1.5 bg-secondary/50 border border-border rounded-xl text-xs font-mono font-semibold"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Hasta:</span>
              <input
                type="date"
                required
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-1.5 bg-secondary/50 border border-border rounded-xl text-xs font-mono font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Aplicar Filtro
            </button>
          </form>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tarjetas KPI Top */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Ingresos Facturados Totales
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ${(data?.ingresosTotales || 0).toFixed(2)}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground block pt-1">
              Filtro: {PRESETS_LABEL[preset]} ({fechaDesde} a {fechaHasta})
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Total Citas Cobradas
            </span>
            <div className="text-3xl font-extrabold text-foreground font-mono">
              {data?.totalTransacciones || 0}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Operaciones procesadas
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Ticket Promedio por Cita
            </span>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              ${ticketPromedio}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Ingreso promedio por atención
            </span>
          </div>

        </div>

        {/* Desglose por Método de Pago */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
            <Receipt size={18} className="text-indigo-500" />
            <span>Desglose por Métodos de Pago</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase">
                <DollarSign size={16} />
                <span>Efectivo</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${(data?.desgloseMetodosPago.efectivo || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase">
                <QrCode size={16} />
                <span>Yappy</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${(data?.desgloseMetodosPago.yappy || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase">
                <CreditCard size={16} />
                <span>Mixto / Tarjeta</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${(data?.desgloseMetodosPago.mixto || 0).toFixed(2)}
              </div>
            </div>

          </div>
        </div>

        {/* Rendimiento & Comisiones por Barbero */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
            <Award size={18} className="text-emerald-500" />
            <span>Rendimiento & Cálculo Neto de Comisiones ({PRESETS_LABEL[preset]})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Barbero</th>
                  <th className="py-2.5 px-3 text-center">Citas</th>
                  <th className="py-2.5 px-3 text-right">Facturado Bruto</th>
                  <th className="py-2.5 px-3 text-center">% Pactado</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Comisión a Pagar</th>
                  <th className="py-2.5 px-3 text-right text-rose-500">Propinas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.rendimientoBarberos.map((b) => (
                  <tr key={b.barberoId} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">{b.nombreCompleto}</td>
                    <td className="py-3 px-3 text-center font-mono">{b.totalCitas}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">${b.totalFacturado.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs font-bold font-mono">
                        {b.porcentajeComision}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${b.comisionTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-rose-500">
                      ${b.propinaTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!data?.rendimientoBarberos || data.rendimientoBarberos.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-sm text-foreground">No hay registros de comisiones en el período seleccionado.</p>
                      <p className="text-muted-foreground">Prueba seleccionando otro rango de fechas o registrando el cobro de una cita.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CRM de Ausencias & Strikes */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
            <Users size={18} className="text-rose-500" />
            <span>CRM de Clientes & Registro de Ausencias (Strikes)</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3 text-center">Ausencias (Strikes)</th>
                  <th className="py-2.5 px-3 text-right">Estado CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.clientesStrikes.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 font-semibold">{c.nombreCompleto || 'Cliente Registrado'}</td>
                    <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{c.telefonoWhatsapp}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs">
                        {c.strikesCount} strike{c.strikesCount > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.strikesCount >= 3 ? (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">BLOQUEADO</span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">ADVERTENCIA</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.clientesStrikes || data.clientesStrikes.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                      No hay clientes registrados con ausencias/strikes. ¡Excelente historial!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
