'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export interface AlertaSeguridad {
  id: string;
  tenantId?: string;
  tipo: string;
  nivel: 'info' | 'warning' | 'critical';
  mensaje: string;
  metadatos?: any;
  atendida: boolean;
  createdAt: string;
}

export default function AlertasSeguridadPanel() {
  const [alertas, setAlertas] = useState<AlertaSeguridad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'pendientes'>('pendientes');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAlertas = async () => {
    setLoading(true);
    try {
      const param = filtro === 'pendientes' ? '?atendida=false' : '';
      const data = await fetchApi<AlertaSeguridad[]>(`/super-admin/security-alerts${param}`);
      setAlertas(data || []);
    } catch (err) {
      console.error('Error cargando alertas de seguridad:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertas();
  }, [filtro]);

  const handleMarcarAtendida = async (id: string) => {
    setActionLoading(id);
    try {
      await fetchApi(`/super-admin/security-alerts/${id}/atendida`, {
        method: 'PATCH',
      });
      await loadAlertas();
    } catch (err: any) {
      alert('Error al actualizar alerta: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const RlsCanaryBreaches = alertas.filter(a => a.tipo === 'canario_rls' && !a.atendida);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Observabilidad & Alertas de Seguridad
            </h2>
            {RlsCanaryBreaches.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                🟢 Canario RLS: Íntegro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                🔴 Fuga RLS Detectada ({RlsCanaryBreaches.length})
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Monitoreo en tiempo real de logins fallidos a SuperAdmin, rate limiting y aislamiento RLS de la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-800 p-1 rounded-lg border border-zinc-700 text-xs">
            <button
              onClick={() => setFiltro('pendientes')}
              className={`px-3 py-1.5 rounded-md transition ${filtro === 'pendientes' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1.5 rounded-md transition ${filtro === 'todas' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={loadAlertas}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition border border-zinc-700"
            title="Recargar alertas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-zinc-500 text-sm">Cargando eventos de seguridad...</div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 bg-zinc-950/50 rounded-lg border border-zinc-800/80 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-zinc-300">No hay alertas de seguridad pendientes</p>
          <p className="text-xs text-zinc-500 mt-0.5">El sistema opera con total estabilidad y aislamiento de tenants.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                alerta.nivel === 'critical'
                  ? 'bg-red-950/30 border-red-800/50 text-red-200'
                  : alerta.nivel === 'warning'
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300'
              } ${alerta.atendida ? 'opacity-60' : ''}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                    alerta.nivel === 'critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {alerta.tipo.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(alerta.createdAt).toLocaleString('es-PA')}
                  </span>
                  {alerta.atendida && (
                    <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded font-medium">
                      Atendida
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white">{alerta.mensaje}</p>
                {alerta.metadatos && (
                  <pre className="text-[11px] text-zinc-400 font-mono bg-zinc-950/60 p-2 rounded border border-zinc-800 overflow-x-auto max-w-xl">
                    {JSON.stringify(alerta.metadatos, null, 2)}
                  </pre>
                )}
              </div>

              {!alerta.atendida && (
                <button
                  onClick={() => handleMarcarAtendida(alerta.id)}
                  disabled={actionLoading === alerta.id}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white rounded-md border border-zinc-600 transition whitespace-nowrap self-start md:self-center"
                >
                  {actionLoading === alerta.id ? 'Guardando...' : 'Marcar Atendida'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
