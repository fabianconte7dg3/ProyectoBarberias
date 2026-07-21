'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  ArrowLeft, TrendingUp, DollarSign, QrCode, CreditCard, Users, 
  AlertTriangle, RefreshCw, Calendar, Award, Receipt, ChevronDown, Check, Scissors, ShoppingBag, Package, PieChart as PieChartIcon, ShieldAlert, BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, subMonths } from 'date-fns';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';

interface RendimientoBarbero {
  barberoId: string;
  nombreCompleto: string;
  porcentajeComision: number;
  porcentajeComisionProducto?: number;
  totalCitas: number;
  totalFacturado: number;
  comisionTotal: number;
  propinaTotal: number;
}

interface TopServicio {
  servicioId: string;
  nombre: string;
  totalCitas: number;
  totalRecaudado: number;
}

interface TopProducto {
  productoId: string;
  nombre: string;
  totalVendidos: number;
  totalRecaudado: number;
}

interface PuntoTendenciaDiaria {
  fecha: string;
  label: string;
  servicios: number;
  productos: number;
  total: number;
}

interface ProductoStockBajo {
  id: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
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
  ingresosServicios?: number;
  ingresosProductos?: number;
  totalTransacciones: number;
  desgloseMetodosPago: {
    efectivo: number;
    yappy: number;
    mixto: number;
  };
  tendenciaDiaria?: PuntoTendenciaDiaria[];
  topServicios: TopServicio[];
  topProductos?: TopProducto[];
  productosStockBajoCount?: number;
  productosStockBajoList?: ProductoStockBajo[];
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

export type SubDashboardTab = 'finanzas' | 'ventas' | 'staff' | 'riesgos';

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

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sub-Dashboard Tab activo
  const [activeTab, setActiveTab] = useState<SubDashboardTab>('finanzas');

  // Filtro por defecto: Últimos 30 días
  const today = new Date();
  const [preset, setPreset] = useState<PeriodoPreset>('ultimos_30_dias');
  const [fechaDesde, setFechaDesde] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(today, 'yyyy-MM-dd'));

  // Estado Menú Desplegable Personalizado
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

  const presetsList: PeriodoPreset[] = [
    'hoy',
    'ayer',
    'ultimos_7_dias',
    'ultimos_30_dias',
    'este_mes',
    'mes_anterior',
    'este_ano',
    'personalizado',
  ];

  // Datos para gráfico de métodos de pago
  const pieDataMetodosPago = data ? [
    { name: 'Efectivo', value: data.desgloseMetodosPago.efectivo },
    { name: 'Yappy', value: data.desgloseMetodosPago.yappy },
    { name: 'Mixto / Tarjeta', value: data.desgloseMetodosPago.mixto },
  ].filter(item => item.value > 0) : [];

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

        {/* Desplegable de Estilo Personalizado */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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
                        isActive
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-foreground hover:bg-secondary'
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
            onClick={() => loadDashboard(fechaDesde, fechaHasta)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border border-border"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {/* Sub-Dashboards Tabs Navigation */}
      <div className="border-b border-border bg-card/50 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto text-xs font-bold py-2">
          
          <button
            onClick={() => setActiveTab('finanzas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'finanzas'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <PieChartIcon size={16} />
            <span>Finanzas & Recaudación</span>
          </button>

          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'ventas'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Scissors size={16} />
            <span>Servicios & Productos</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Award size={16} />
            <span>Rendimiento de Staff</span>
          </button>

          <button
            onClick={() => setActiveTab('riesgos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'riesgos'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <ShieldAlert size={16} />
            <span>Riesgo CRM & Inventario</span>
          </button>

        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Banner Alerta Stock Bajo */}
        {(data?.productosStockBajoCount || 0) > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Package size={18} className="shrink-0" />
              <span>Hay <strong>{data?.productosStockBajoCount} productos</strong> con stock bajo en tu inventario.</span>
            </div>
            <button
              onClick={() => router.push(`/${tenantSlug}/admin/productos`)}
              className="px-3 py-1.5 bg-amber-500 text-white font-bold rounded-xl text-[11px] hover:opacity-90 transition-opacity shrink-0"
            >
              Ver Inventario
            </button>
          </div>
        )}

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

        {/* SUB-DASHBOARD 1: FINANZAS & RECAUDACIÓN */}
        {activeTab === 'finanzas' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
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
                  Servicios: ${(data?.ingresosServicios || 0).toFixed(2)} | Productos: ${(data?.ingresosProductos || 0).toFixed(2)}
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
                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  ${ticketPromedio}
                </div>
                <span className="text-[11px] text-muted-foreground block pt-1">
                  Ingreso promedio por operación
                </span>
              </div>
            </div>

            {/* GRÁFICO 1: TENDENCIA DE RECAUDACIÓN DÍA A DÍA */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <h2 className="text-base font-bold">Tendencia de Recaudación Diaria ($)</h2>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  EVOLUCIÓN DÍA A DÍA
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                {data?.tendenciaDiaria && data.tendenciaDiaria.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.tendenciaDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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

            {/* GRÁFICO 2: DESGLOSE MÉTODOS DE PAGO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tarjetas de Métodos de Pago */}
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

                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                      <CreditCard size={18} />
                      <span>Mixto / Tarjeta</span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-foreground">
                      ${(data?.desgloseMetodosPago.mixto || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico Donut Métodos de Pago */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
                  <PieChartIcon size={18} className="text-indigo-500" />
                  <span>Distribución Porcentual</span>
                </h2>

                <div className="h-64 w-full flex items-center justify-center">
                  {pieDataMetodosPago.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataMetodosPago}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieDataMetodosPago.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_METODOS_PAGO[index % COLORS_METODOS_PAGO.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Monto']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No hay transacciones registradas.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUB-DASHBOARD 2: VENTAS & PRODUCTOS */}
        {activeTab === 'ventas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Top Servicios */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
                <Scissors size={18} className="text-primary" />
                <span>Servicios Más Demandados</span>
              </h2>

              <div className="space-y-2.5">
                {(data?.topServicios || []).map((s, index) => (
                  <div key={s.servicioId} className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[10px] uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-foreground">{s.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block">${s.totalRecaudado.toFixed(2)}</span>
                      <span className="text-muted-foreground text-[10px]">{s.totalCitas} cita{s.totalCitas > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
                {(!data?.topServicios || data.topServicios.length === 0) && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No hay servicios registrados en este período.
                  </div>
                )}
              </div>
            </div>

            {/* Top Productos Retail */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2 border-b border-border pb-3">
                <ShoppingBag size={18} className="text-emerald-500" />
                <span>Productos Retail Más Vendidos</span>
              </h2>

              <div className="space-y-2.5">
                {(data?.topProductos || []).map((p, index) => (
                  <div key={p.productoId} className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-foreground">{p.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block">${p.totalRecaudado.toFixed(2)}</span>
                      <span className="text-muted-foreground text-[10px]">{p.totalVendidos} unidad{p.totalVendidos > 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                ))}
                {(!data?.topProductos || data.topProductos.length === 0) && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No hay ventas de productos registradas en este período.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-DASHBOARD 3: RENDIMIENTO DE STAFF */}
        {activeTab === 'staff' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
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
                    <th className="py-2.5 px-3 text-center">% Servicio / % Producto</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Comisión Total</th>
                    <th className="py-2.5 px-3 text-right text-rose-500">Propinas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.rendimientoBarberos || []).map((b) => (
                    <tr key={b.barberoId} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">{b.nombreCompleto}</td>
                      <td className="py-3 px-3 text-center font-mono">{b.totalCitas}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">${b.totalFacturado.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs font-bold font-mono">
                          {b.porcentajeComision}%
                          {Number(b.porcentajeComisionProducto || 0) > 0 && ` / ${b.porcentajeComisionProducto}% Prod`}
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
        )}

        {/* SUB-DASHBOARD 4: RIESGO CRM & INVENTARIO */}
        {activeTab === 'riesgos' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
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
                  {(data?.clientesStrikes || []).map((c) => (
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
        )}

      </main>
    </div>
  );
}
