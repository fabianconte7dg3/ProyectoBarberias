'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTenant } from '@/lib/tenant-context';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  DollarSign, QrCode, CreditCard, Receipt, PieChart as PieChartIcon, BarChart3,
  AlertTriangle, RefreshCw, Calendar, ChevronDown, Check, Download,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, subMonths } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface PuntoTendenciaDiaria {
  fecha: string;
  label: string;
  servicios: number;
  productos: number;
  total: number;
}

interface FinanzasData {
  ingresosTotales: number;
  ingresosServicios?: number;
  ingresosProductos?: number;
  totalTransacciones: number;
  desgloseMetodosPago: {
    efectivo: number;
    yappy: number;
    mixto: number;
  };
  tendenciaDiaria?: PuntoTendenciaDiaria[];
}

type PeriodoPreset =
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
  ultimos_30_dias: 'Últimos 30 días',
  este_mes: 'Este mes',
  mes_anterior: 'Mes anterior',
  este_ano: 'Este año',
  personalizado: 'Rango personalizado',
};

const COLORS_METODOS_PAGO = ['#10b981', '#6366f1', '#3b82f6']; // Efectivo (Verde), Yappy (Indigo), Mixto (Azul)

export default function AdminFinanzasPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaServicio } = useTenant();

  useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  const [data, setData] = useState<FinanzasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const [preset, setPreset] = useState<PeriodoPreset>('ultimos_30_dias');
  const [fechaDesde, setFechaDesde] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(today, 'yyyy-MM-dd'));

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadFinanzas(fechaDesde, fechaHasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFinanzas = async (desde: string, hasta: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<FinanzasData>(`/reportes/dashboard?desde=${desde}&hasta=${hasta}`);
      setData(res);
    } catch (err: any) {
      console.error('Error cargando finanzas:', err);
      setError(err.message || 'Error al conectar con el reporte financiero.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (newPreset: PeriodoPreset) => {
    setPreset(newPreset);
    setIsDropdownOpen(false);

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
      loadFinanzas(d, h);
    }
  };

  const handleCustomDateApply = (e: React.FormEvent) => {
    e.preventDefault();
    loadFinanzas(fechaDesde, fechaHasta);
  };

  const handleExportar = () => {
    setExporting(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/datos/exportar/transacciones?desde=${fechaDesde}&hasta=${fechaHasta}`, '_blank');
    setTimeout(() => setExporting(false), 1500);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando finanzas...</span>
        </div>
      </div>
    );
  }

  const ticketPromedio = data && data.totalTransacciones > 0
    ? (data.ingresosTotales / data.totalTransacciones).toFixed(2)
    : '0.00';

  const presetsList: PeriodoPreset[] = [
    'hoy', 'ayer', 'ultimos_7_dias', 'ultimos_30_dias', 'este_mes', 'mes_anterior', 'este_ano', 'personalizado',
  ];

  const pieDataMetodosPago = data ? [
    { name: 'Efectivo', value: data.desgloseMetodosPago.efectivo },
    { name: 'Yappy', value: data.desgloseMetodosPago.yappy },
    { name: 'Mixto / Tarjeta', value: data.desgloseMetodosPago.mixto },
  ].filter((item) => item.value > 0) : [];

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground flex flex-col font-sans">

      <AdminPageHeader
        title="Finanzas y Reportes"
        description={`Resumen financiero del período: ${fechaDesde} al ${fechaHasta}`}
      >
        <button
          onClick={handleExportar}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border border-border disabled:opacity-60"
          title="Exportar transacciones del período en CSV"
        >
          <Download size={14} className={exporting ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">Exportar Reporte</span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 bg-secondary/80 hover:bg-secondary border border-border rounded-xl text-xs font-bold text-foreground transition-all shadow-xs"
          >
            <Calendar size={15} className="text-emerald-500" />
            <span>{PRESETS_LABEL[preset]}</span>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2">
              {presetsList.map((p) => {
                const isActive = preset === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePresetSelect(p)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>{PRESETS_LABEL[p]}</span>
                    {isActive && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => loadFinanzas(fechaDesde, fechaHasta)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border border-border"
          title="Actualizar datos"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </AdminPageHeader>

      <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">

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
              {terminologiaServicio}s: ${(data?.ingresosServicios || 0).toFixed(2)} | Productos: ${(data?.ingresosProductos || 0).toFixed(2)}
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Total Operaciones Cobradas
            </span>
            <div className="text-3xl font-extrabold text-foreground font-mono">
              {data?.totalTransacciones || 0}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Citas y ventas de mostrador
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Ticket Promedio por Cobro
            </span>
            <div className="text-3xl font-extrabold text-secondary dark:text-secondary font-mono">
              ${ticketPromedio}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Ingreso promedio por operación
            </span>
          </div>
        </div>

        {/* Tendencia de recaudación diaria */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-500" />
              <h2 className="text-base font-bold">Tendencia de Recaudación Diaria ($)</h2>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">EVOLUCIÓN DÍA A DÍA</span>
          </div>

          <div className="h-72 w-full pt-2">
            {data?.tendenciaDiaria && data.tendenciaDiaria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tendenciaDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Total Facturado']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                Sin datos suficientes para graficar la tendencia diaria.
              </div>
            )}
          </div>
        </div>

        {/* Desglose métodos de pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
              <Receipt size={18} className="text-indigo-500" />
              <span>Desglose por Métodos de Pago</span>
            </h2>

            <div className="space-y-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                  <DollarSign size={18} />
                  <span>Efectivo</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">
                  ${(data?.desgloseMetodosPago.efectivo || 0).toFixed(2)}
                </div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                  <QrCode size={18} />
                  <span>Yappy</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">
                  ${(data?.desgloseMetodosPago.yappy || 0).toFixed(2)}
                </div>
              </div>

              <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-secondary dark:text-secondary font-bold text-xs uppercase">
                  <CreditCard size={18} />
                  <span>Mixto / Tarjeta</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">
                  ${(data?.desgloseMetodosPago.mixto || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
              <PieChartIcon size={18} className="text-indigo-500" />
              <span>Distribución Porcentual</span>
            </h2>

            <div className="h-80 w-full flex items-center justify-center pt-2">
              {pieDataMetodosPago.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={pieDataMetodosPago}
                      cx="50%"
                      cy="42%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieDataMetodosPago.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_METODOS_PAGO[index % COLORS_METODOS_PAGO.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Monto']} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                      formatter={(value: string) => value.length > 20 ? `${value.substring(0, 18)}...` : value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground italic">No hay transacciones registradas.</div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
