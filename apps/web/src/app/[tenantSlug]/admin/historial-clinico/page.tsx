'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTenant } from '@/lib/tenant-context';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RefreshCw, AlertTriangle, Stethoscope, ClipboardList } from 'lucide-react';

interface NotaClinicaPropia {
  id: string;
  diagnostico: string | null;
  tratamiento: string | null;
  proximaRevisionEn: string | null;
  createdAt: string;
  paciente: { nombre: string; cliente: { nombreCompleto: string | null } | null } | null;
  cita: { inicioEstimado: string; notas: string | null } | null;
}

export default function HistorialClinicoPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaCliente } = useTenant();

  useAdminAuth({ tenantSlug });

  const [notas, setNotas] = useState<NotaClinicaPropia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadNotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<NotaClinicaPropia[]>('/notas-clinicas/mias');
      setNotas(res || []);
      setSelectedId((prev) => prev ?? (res && res.length > 0 ? res[0].id : null));
    } catch (err: any) {
      setError(err.message || 'Error al cargar tu historial clínico.');
    } finally {
      setLoading(false);
    }
  };

  const selected = notas.find((n) => n.id === selectedId) || null;

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground flex flex-col font-sans">

      <AdminPageHeader
        title="Historial Clínico"
        description="Tus propias notas clínicas — el diagnóstico y tratamiento son visibles solo para ti."
      >
        <button
          onClick={loadNotas}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors border border-border"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </AdminPageHeader>

      <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && notas.length === 0 && !error && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
            <Stethoscope size={28} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Aún no has registrado notas clínicas.</p>
            <p className="text-xs text-muted-foreground">
              Se crean al cobrar/cerrar una cita con un paciente asignado — quedarán aquí, visibles solo para ti.
            </p>
          </div>
        )}

        {notas.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline de mis notas */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl shadow-xs flex flex-col max-h-[70vh]">
              <div className="p-4 border-b border-border shrink-0">
                <h3 className="text-sm font-bold">Tus Notas ({notas.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {notas.map((n) => {
                  const active = n.id === selectedId;
                  const fecha = n.cita?.inicioEstimado || n.createdAt;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        active ? 'bg-primary/10 border-primary/40' : 'bg-secondary/20 border-border hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{n.paciente?.nombre || 'Paciente'}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {new Date(fecha).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {n.paciente?.cliente?.nombreCompleto && (
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {terminologiaCliente}: {n.paciente.cliente.nombreCompleto}
                        </span>
                      )}
                      {n.diagnostico && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.diagnostico}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalle de la nota seleccionada */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-xs p-6 space-y-4">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <ClipboardList size={18} className="text-primary shrink-0" />
                        <span className="truncate">{selected.paciente?.nombre || 'Paciente'}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selected.paciente?.cliente?.nombreCompleto && `${terminologiaCliente}: ${selected.paciente.cliente.nombreCompleto} · `}
                        {new Date(selected.cita?.inicioEstimado || selected.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    {selected.proximaRevisionEn && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-secondary/10 text-secondary border border-secondary/20 whitespace-nowrap shrink-0">
                        Próx. revisión: {new Date(selected.proximaRevisionEn).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {selected.cita?.notas && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Motivo de la Visita</h4>
                      <p className="text-sm text-foreground">{selected.cita.notas}</p>
                    </div>
                  )}

                  {selected.diagnostico && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Diagnóstico</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selected.diagnostico}</p>
                    </div>
                  )}

                  {selected.tratamiento && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tratamiento</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selected.tratamiento}</p>
                    </div>
                  )}

                  {!selected.diagnostico && !selected.tratamiento && (
                    <p className="text-xs text-muted-foreground italic">
                      Esta nota no tiene diagnóstico ni tratamiento registrado — solo la fecha de próxima revisión.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Selecciona una nota del historial.</p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
