'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { AlertTriangle, WifiOff, CalendarOff, ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react';
import Link from 'next/link';

export interface BusinessMetrics {
  nuevasMes: number;
  nuevasSemana: number;
  canceladasMes: number;
  barberiasBasico: number;
  barberiasPremium: number;
  barberiasEnRiesgo: Array<{
    id: string;
    nombreComercial: string;
    slug: string;
    estadoBarberia: string;
    whatsappConectado: boolean;
    ultimaCitaFecha: string | null;
    motivos: string[];
  }>;
}

export default function BarberiasEnRiesgoCard() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await fetchApi<BusinessMetrics>('/super-admin/business-metrics');
        setMetrics(data);
      } catch (err) {
        console.error('Error cargando métricas de negocio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return <div className="text-center py-6 text-zinc-500 text-sm">Cargando métricas de negocio...</div>;
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Card de Tendencia & Distribución de Planes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl lg:col-span-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-400" />
            Tendencia & Distribución por Plan
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-300">Nuevas este mes / semana</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                +{metrics.nuevasMes} ({metrics.nuevasSemana} esta sem.)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-300">Cancelaciones (Churn mes)</span>
              <span className="text-sm font-bold text-red-400 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" />
                {metrics.canceladasMes}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-400">Distribución de Planes</span>
                <span className="text-white font-bold">{metrics.barberiasBasico} Básico / {metrics.barberiasPremium} Premium</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-500 h-full"
                  style={{
                    width: `${
                      metrics.barberiasBasico + metrics.barberiasPremium > 0
                        ? (metrics.barberiasBasico / (metrics.barberiasBasico + metrics.barberiasPremium)) * 100
                        : 50
                    }%`,
                  }}
                  title="Plan Básico"
                />
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${
                      metrics.barberiasBasico + metrics.barberiasPremium > 0
                        ? (metrics.barberiasPremium / (metrics.barberiasBasico + metrics.barberiasPremium)) * 100
                        : 50
                    }%`,
                  }}
                  title="Plan Premium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Card de Barberías en Riesgo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Barberías en Riesgo de Churn ({metrics.barberiasEnRiesgo.length})
          </h3>
          <span className="text-xs text-zinc-500">Inactividad &gt; 7 días o WhatsApp Desconectado</span>
        </div>

        {metrics.barberiasEnRiesgo.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-lg border border-zinc-800">
            ✅ No hay barberías en riesgo inmediato. Todas están activas y operando.
          </div>
        ) : (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {metrics.barberiasEnRiesgo.map((b) => (
              <div
                key={b.id}
                className="p-3 bg-zinc-950/70 border border-amber-900/30 rounded-lg flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{b.nombreComercial}</span>
                    <span className="text-xs text-zinc-400">({b.slug})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {b.motivos.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      >
                        {m.includes('WhatsApp') ? <WifiOff className="w-3 h-3 text-red-400" /> : <CalendarOff className="w-3 h-3 text-amber-400" />}
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/super-admin/tenants/${b.id}`}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition"
                >
                  Ver Detalle
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
