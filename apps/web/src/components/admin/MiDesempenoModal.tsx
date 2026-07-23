import React, { useEffect, useState } from 'react';
import { X, Award, DollarSign, Scissors, ShoppingBag, RefreshCw, Calendar, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MiDesempenoData {
  barberoId: string;
  nombreCompleto: string;
  porcentajeComision: number;
  porcentajeComisionProducto: number;
  rangoFechas: { desde: string; hasta: string };
  totalCitas: number;
  totalFacturado: number;
  comisionServicios: number;
  comisionProductos: number;
  comisionTotal: number;
  propinaTotal: number;
  resumenDiario: Array<{
    fecha: string;
    label: string;
    citas: number;
    facturado: number;
    comision: number;
    propina: number;
  }>;
}

interface MiDesempenoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiDesempenoModal({ isOpen, onClose }: MiDesempenoModalProps) {
  const [data, setData] = useState<MiDesempenoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDesempeno();
    }
  }, [isOpen]);

  const loadDesempeno = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<MiDesempenoData>('/reportes/mi-desempeno');
      setData(res);
    } catch (err: any) {
      console.error('Error al cargar mi desempeño:', err);
      setError(err.message || 'Error al obtener tus métricas personales.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-base">
            <Award size={20} className="text-emerald-500" />
            <span>Mi Desempeño & Comisiones Ganadas</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="animate-spin text-primary" size={28} />
              <span className="text-xs font-semibold">Cargando tus comisiones y producción...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Saludo & Esquema */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                <div>
                  <h3 className="font-extrabold text-base text-foreground">Hola, {data.nombreCompleto}</h3>
                  <p className="text-xs text-muted-foreground">Resumen acumulado de tus ingresos y ganancias.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold text-xs">
                    {data.porcentajeComision > 0 ? `${data.porcentajeComision}% Serv.` : '100% Ingresos Directos'}
                  </span>
                  {data.porcentajeComisionProducto > 0 && (
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-mono font-bold text-xs">
                      {data.porcentajeComisionProducto}% Prod.
                    </span>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-secondary/40 border border-border p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Citas Atendidas</span>
                  <div className="text-2xl font-extrabold font-mono text-foreground">{data.totalCitas}</div>
                </div>

                <div className="bg-secondary/40 border border-border p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Facturación Bruta</span>
                  <div className="text-2xl font-extrabold font-mono text-foreground">${data.totalFacturado.toFixed(2)}</div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                    {data.porcentajeComision > 0 ? 'Comisión Total' : 'Ganancia Total'}
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">${data.comisionTotal.toFixed(2)}</div>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-500 block">Propinas</span>
                  <div className="text-2xl font-extrabold font-mono text-rose-500">${data.propinaTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Desglose diario */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span>Detalle de Producción Diaria</span>
                </h4>

                {data.resumenDiario.length === 0 ? (
                  <div className="py-8 px-4 text-center text-muted-foreground text-xs font-semibold bg-secondary/20 rounded-xl border border-dashed border-border flex flex-col items-center gap-1.5">
                    <Calendar size={20} className="text-muted-foreground/60 mb-1" />
                    <span>Sin actividad registrada en los últimos 30 días.</span>
                    <span className="text-[11px] text-muted-foreground/70">Tus citas y ventas cobradas aparecerán automáticamente aquí.</span>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-border rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-secondary/60 border-b border-border font-bold uppercase text-muted-foreground text-[10px]">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3 text-center">Citas</th>
                          <th className="py-2 px-3 text-right">Facturado</th>
                          <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                            {data.porcentajeComision > 0 ? 'Comisión' : 'Ganancia'}
                          </th>
                          <th className="py-2 px-3 text-right text-rose-500">Propinas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.resumenDiario.map((d) => (
                          <tr key={d.fecha} className="hover:bg-secondary/30">
                            <td className="py-2 px-3 font-semibold">{d.label}</td>
                            <td className="py-2 px-3 text-center font-mono">{d.citas}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">${d.facturado.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ${d.comision.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-rose-500">
                              ${d.propina.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
