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
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Observabilidad & Alertas de Seguridad
            </h2>
            {RlsCanaryBreaches.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                🟢 Canario RLS: Íntegro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                🔴 Fuga RLS Detectada ({RlsCanaryBreaches.length})
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoreo en tiempo real de logins fallidos a SuperAdmin, rate limiting y aislamiento RLS de la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setFiltro('pendientes')}
              className={`px-3 py-1.5 rounded-md transition ${filtro === 'pendientes' ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1.5 rounded-md transition ${filtro === 'todas' ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={loadAlertas}
            disabled={loading}
            className="p-2 bg-muted hover:bg-accent text-foreground rounded-lg transition border border-border"
            title="Recargar alertas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando eventos de seguridad...</div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 bg-muted/50 rounded-lg border border-border text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-foreground">No hay alertas de seguridad pendientes</p>
          <p className="text-xs text-muted-foreground mt-0.5">El sistema opera con total estabilidad y aislamiento de tenants.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                alerta.nivel === 'critical'
                  ? 'bg-red-500/5 border-red-500/20 text-red-700'
                  : alerta.nivel === 'warning'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-700'
                  : 'bg-muted border-border text-foreground'
              } ${alerta.atendida ? 'opacity-60' : ''}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                    alerta.nivel === 'critical'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                  }`}>
                    {alerta.tipo.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alerta.createdAt).toLocaleString('es-PA')}
                  </span>
                  {alerta.atendida && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                      Atendida
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{alerta.mensaje}</p>
                {alerta.metadatos && (
                  <pre className="text-[11px] text-muted-foreground font-mono bg-muted/60 p-2 rounded border border-border overflow-x-auto max-w-xl">
                    {JSON.stringify(alerta.metadatos, null, 2)}
                  </pre>
                )}
              </div>

              {!alerta.atendida && (
                <button
                  onClick={() => handleMarcarAtendida(alerta.id)}
                  disabled={actionLoading === alerta.id}
                  className="px-3 py-1.5 bg-muted hover:bg-accent text-xs font-semibold text-foreground rounded-md border border-border transition whitespace-nowrap self-start md:self-center"
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
