'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import {
  Users,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  History,
  ExternalLink,
} from 'lucide-react';

interface TenantDetail {
  barberia: {
    id: string;
    nombreComercial: string;
    slug: string;
    estado: 'activo' | 'suspendido_pago' | 'cancelado';
    planId: 'basico' | 'premium';
    planSuscripcion: 'basico' | 'premium';
    bloqueadoPorPlataforma: boolean;
    createdAt: string;
  };
  staff: Array<{
    id: string;
    nombreCompleto: string;
    email: string;
    rol: string;
    activo: boolean;
  }>;
  whatsappConfig: {
    estado: string;
    qrCode?: string;
    updatedAt?: string;
  };
  metricas: {
    totalCitas: number;
    citasCompletadas: number;
    citasCanceladas: number;
    totalFacturado: number;
  };
  auditLogs: Array<{
    id: string;
    accion: string;
    tablaAfectada: string;
    payloadAntes: any;
    payloadDespues: any;
    createdAt: string;
  }>;
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<TenantDetail>(`/super-admin/tenants/${id}`);
      setDetail(res);
    } catch (err: any) {
      console.error('Error cargando detalle de tenant:', err);
      setError(err.message || 'Error cargando detalle del negocio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Cargando inspección detallada RLS Scope...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Error de Inspección</h2>
          <p className="text-xs text-muted-foreground">{error || 'No se encontró información para este negocio.'}</p>
          <button
            onClick={() => router.push('/super-admin/tenants')}
            className="px-4 py-2 bg-muted hover:bg-accent text-foreground text-xs font-bold rounded-xl"
          >
            Volver al Directorio de Negocios
          </button>
        </div>
      </div>
    );
  }

  const { barberia, staff, whatsappConfig, metricas, auditLogs } = detail;

  return (
    <div className="pb-16">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/super-admin/tenants')}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>{barberia.nombreComercial}</span>
              <span className="text-xs font-mono text-muted-foreground">({barberia.slug})</span>
            </h1>
            <p className="text-[11px] text-muted-foreground">ID Tenant: {barberia.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/${barberia.slug}/admin`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-muted hover:bg-accent text-foreground text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <span>Inspección Rápida</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* RESUMEN Y BADGES DE ESTADO */}
        <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Estado Suscripción</span>
            <span className={`inline-flex px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider ${
              barberia.estado === 'activo'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
            }`}>
              {barberia.estado}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Plan Actual</span>
            <span className="inline-flex px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
              {barberia.planId || barberia.planSuscripcion}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Kill-Switch Plataforma</span>
            <span className={`inline-flex px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider ${
              barberia.bloqueadoPorPlataforma
                ? 'bg-red-500/10 text-red-600 border border-red-500/40'
                : 'bg-muted text-muted-foreground'
            }`}>
              {barberia.bloqueadoPorPlataforma ? 'ACTIVADO (BLOQUEADO)' : 'DESACTIVADO (NORMAL)'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Conexión WhatsApp</span>
            <span className={`inline-flex px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider ${
              whatsappConfig.estado === 'conectado'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
            }`}>
              {whatsappConfig.estado}
            </span>
          </div>
        </div>

        {/* METRICAS DEL TENANT */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Facturación Histórica</span>
            <div className="mt-2 text-2xl font-bold text-foreground">${metricas.totalFacturado.toFixed(2)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Citas Completadas</span>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{metricas.citasCompletadas}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Citas Canceladas</span>
            <div className="mt-2 text-2xl font-bold text-red-600">{metricas.citasCanceladas}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Integrantes Staff</span>
            <div className="mt-2 text-2xl font-bold text-primary">{staff.length}</div>
          </div>
        </div>

        {/* TABLA DE STAFF Y EQUIPO */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <span>Integrantes del Equipo (Staff & Administración)</span>
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">{staff.length} registrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                  <th className="py-3 px-6">Nombre Completo</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-6 text-right">Estado Cuenta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-medium">
                {staff.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/60 transition-colors">
                    <td className="py-3 px-6 font-bold text-foreground">{u.nombreCompleto}</td>
                    <td className="py-3 px-4 text-foreground">{u.email || 'Sin correo'}</td>
                    <td className="py-3 px-4 uppercase font-bold text-muted-foreground">{u.rol}</td>
                    <td className="py-3 px-6 text-right">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase ${
                        u.activo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {u.activo ? 'Activo' : 'Pendiente Activación'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUDIT LOGS DE PLATAFORMA SOBRE ESTE TENANT */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <History size={18} className="text-secondary" />
              <span>Historial de Auditoría de Plataforma (Audit Logs)</span>
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">{auditLogs.length} registros</span>
          </div>

          <div className="p-6 space-y-4">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay eventos registrados en la auditoría de plataforma para este negocio.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-muted border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-secondary uppercase">{log.accion}</span>
                      <span className="text-muted-foreground">· Tabla: {log.tablaAfectada}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {log.payloadDespues ? `Valores aplicados: ${JSON.stringify(log.payloadDespues)}` : 'Sin detalles adicionales'}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-[11px] font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleString('es-PA')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
