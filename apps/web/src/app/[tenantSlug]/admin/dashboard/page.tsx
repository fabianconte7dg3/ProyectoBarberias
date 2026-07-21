'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  ArrowLeft, TrendingUp, DollarSign, QrCode, CreditCard, Users, 
  AlertTriangle, RefreshCw, Calendar, Award, Receipt
} from 'lucide-react';

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

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    if (currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }

    loadDashboard();
  }, [currentUser, tenantSlug, router]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<DashboardData>('/reportes/dashboard');
      setData(res);
    } catch (err: any) {
      console.error('Error cargando métricas:', err);
      setError(err.message || 'Error al conectar con el reporte de métricas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
              <TrendingUp size={20} className="text-emerald-500" />
              <span>Analítica Ejecutiva & Finanzas</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Métricas consolidadas · Desglose por Barbero y Método de Pago
            </p>
          </div>
        </div>

        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tarjetas KPI Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Ingresos Facturados Totales
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ${(data?.ingresosTotales || 0).toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Período actual
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
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
            <span>Rendimiento & Cálculo Neto de Comisiones</span>
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
                    <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                      No hay registros de comisiones en el período seleccionado.
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
