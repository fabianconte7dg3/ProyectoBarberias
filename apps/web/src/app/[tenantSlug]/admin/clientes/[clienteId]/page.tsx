'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTenant } from '@/lib/tenant-context';
import { requierePaciente } from '@/lib/industrias';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  ArrowLeft, Mail, MessageSquare, Ban, ShieldCheck, RefreshCw, Plus, FileClock,
  PawPrint, StickyNote, History, UserCheck, AlertTriangle, CheckCircle2, Save, X,
} from 'lucide-react';

interface Cliente {
  id: string;
  telefonoWhatsapp: string;
  nombreCompleto: string | null;
  emailFacturacion: string | null;
  notasPreferencia: string | null;
  totalAsistencias: number;
  ausenciasStrikes: number;
  totalGastado: string | number;
  bloqueado: boolean;
  aceptaMarketing: boolean;
  createdAt: string;
}

interface Paciente {
  id: string;
  clienteId: string;
  nombre: string;
  camposPersonalizados: Record<string, unknown>;
  activo: boolean;
  createdAt: string;
}

interface NotaClinicaMetadata {
  id: string;
  citaId: string;
  empleadoId: string;
  empleadoNombre: string | null;
  proximaRevisionEn: string | null;
  createdAt: string;
}

interface CitaHistorial {
  id: string;
  inicioEstimado: string;
  estado: string;
  empleado: { nombreCompleto: string } | null;
  servicio: { nombre: string } | null;
  combo: { nombre: string } | null;
  transaccion: { totalFacturado: string; metodoPago: string } | null;
}

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  programada: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  en_curso: { label: 'En Sillón', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  completada: { label: 'Completada', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  cancelada: { label: 'Cancelada', className: 'bg-secondary text-muted-foreground border-border' },
  ausente_strike: { label: 'Ausente (Strike)', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  revision_manual: { label: 'Revisión Manual', className: 'bg-secondary text-muted-foreground border-border' },
};

type Tab = 'resumen' | 'historial' | 'pacientes' | 'notas';

export default function PerfilClientePage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const clienteId = params.clienteId as string;

  const currentUser = useAdminStore((state) => state.user);
  const { industria, configCamposPersonalizados, terminologiaCliente } = useTenant();
  const mostrarPacientes = requierePaciente(industria);

  useAdminAuth({ tenantSlug });

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('resumen');
  const [successMsg, setSuccessMsg] = useState('');

  // Edición inline de datos básicos (tab Resumen)
  const [editing, setEditing] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAceptaMkt, setFormAceptaMkt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Fechas de inasistencia (respalda el badge de strikes)
  const [inasistencias, setInasistencias] = useState<{ fecha: string }[] | null>(null);

  // Historial de citas
  const [citasList, setCitasList] = useState<CitaHistorial[] | null>(null);
  const [loadingCitas, setLoadingCitas] = useState(false);

  // Ficha de Pacientes (multi-industria)
  const [pacientesList, setPacientesList] = useState<Paciente[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [formPacienteNombre, setFormPacienteNombre] = useState('');
  const [formPacienteCampos, setFormPacienteCampos] = useState<Record<string, string>>({});
  const [savingPaciente, setSavingPaciente] = useState(false);
  const [pacienteErrorMsg, setPacienteErrorMsg] = useState('');
  const [notasMetadataPorPaciente, setNotasMetadataPorPaciente] = useState<Record<string, NotaClinicaMetadata[]>>({});
  const [pacienteHistorialAbierto, setPacienteHistorialAbierto] = useState<string | null>(null);

  // Notas Internas
  const [formNotas, setFormNotas] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);

  useEffect(() => {
    loadCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCliente = async () => {
    setLoading(true);
    setError('');
    try {
      const c = await fetchApi<Cliente>(`/clientes/${clienteId}`);
      setCliente(c);
      setFormNombre(c.nombreCompleto || '');
      setFormEmail(c.emailFacturacion || '');
      setFormAceptaMkt(c.aceptaMarketing);
      setFormNotas(c.notasPreferencia || '');
      if (c.ausenciasStrikes > 0) {
        fetchApi<{ fecha: string }[]>(`/clientes/${clienteId}/inasistencias`)
          .then((res) => setInasistencias(res || []))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando el cliente.');
    } finally {
      setLoading(false);
    }
  };

  const loadCitas = async () => {
    setLoadingCitas(true);
    try {
      const res = await fetchApi<CitaHistorial[]>(`/clientes/${clienteId}/citas`);
      setCitasList(res || []);
    } catch (err: any) {
      console.error('Error cargando historial de citas:', err);
    } finally {
      setLoadingCitas(false);
    }
  };

  const loadPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const res = await fetchApi<Paciente[]>(`/pacientes?clienteId=${clienteId}`);
      setPacientesList(res || []);
    } catch (err: any) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoadingPacientes(false);
    }
  };

  useEffect(() => {
    if (tab === 'historial' && citasList === null) loadCitas();
    if (tab === 'pacientes' && mostrarPacientes) loadPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleGuardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSuccessMsg('');
    try {
      const actualizado = await fetchApi<Cliente>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombreCompleto: formNombre.trim() || undefined,
          emailFacturacion: formEmail.trim() || undefined,
          aceptaMarketing: formAceptaMkt,
        }),
      });
      setCliente(actualizado);
      setEditing(false);
      setSuccessMsg('Datos actualizados con éxito.');
    } catch (err: any) {
      setSaveError(err.message || 'Error guardando los datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBloqueo = async () => {
    if (!cliente) return;
    try {
      const actualizado = await fetchApi<Cliente>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ bloqueado: !cliente.bloqueado }),
      });
      setCliente(actualizado);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de bloqueo.');
    }
  };

  const handleToggleMkt = async () => {
    if (!cliente) return;
    try {
      const actualizado = await fetchApi<Cliente>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ aceptaMarketing: !cliente.aceptaMarketing }),
      });
      setCliente(actualizado);
      setFormAceptaMkt(actualizado.aceptaMarketing);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar preferencia Ley 81.');
    }
  };

  const handleGuardarNotas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotas(true);
    setSaveError('');
    setSuccessMsg('');
    try {
      const actualizado = await fetchApi<Cliente>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notasPreferencia: formNotas.trim() || undefined }),
      });
      setCliente(actualizado);
      setSuccessMsg('Notas internas guardadas.');
    } catch (err: any) {
      setSaveError(err.message || 'Error guardando las notas.');
    } finally {
      setSavingNotas(false);
    }
  };

  const resetFormPaciente = () => {
    setFormPacienteNombre('');
    setFormPacienteCampos({});
    setPacienteErrorMsg('');
  };

  const handleAddPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPacienteNombre.trim()) {
      setPacienteErrorMsg(`El nombre de ${terminologiaCliente === 'Dueño de mascota' ? 'la mascota' : 'el paciente'} es requerido.`);
      return;
    }

    setSavingPaciente(true);
    setPacienteErrorMsg('');
    try {
      await fetchApi('/pacientes', {
        method: 'POST',
        body: JSON.stringify({
          clienteId,
          nombre: formPacienteNombre.trim(),
          camposPersonalizados: formPacienteCampos,
        }),
      });
      resetFormPaciente();
      loadPacientes();
    } catch (err: any) {
      setPacienteErrorMsg(err.message || 'Error al registrar.');
    } finally {
      setSavingPaciente(false);
    }
  };

  const handleVerHistorialClinico = async (pacienteId: string) => {
    if (pacienteHistorialAbierto === pacienteId) {
      setPacienteHistorialAbierto(null);
      return;
    }
    setPacienteHistorialAbierto(pacienteId);
    if (!notasMetadataPorPaciente[pacienteId]) {
      try {
        const res = await fetchApi<NotaClinicaMetadata[]>(`/notas-clinicas/metadata/paciente/${pacienteId}`);
        setNotasMetadataPorPaciente((prev) => ({ ...prev, [pacienteId]: res || [] }));
      } catch (err: any) {
        console.error('Error cargando historial clínico (metadata):', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando perfil del cliente...</span>
        </div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex items-center gap-3 text-destructive text-sm font-medium">
          <AlertTriangle size={20} />
          <span>{error || 'Cliente no encontrado.'}</span>
        </div>
        <button
          onClick={() => router.push(`/${tenantSlug}/admin/clientes`)}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-xs font-bold rounded-xl"
        >
          Volver a Clientes
        </button>
      </div>
    );
  }

  const esVip = Number(cliente.totalGastado || 0) >= 50;
  const initial = (cliente.nombreCompleto || 'C').charAt(0).toUpperCase();
  const cleanPhone = cliente.telefonoWhatsapp.replace(/[^0-9]/g, '');

  const tabs: { key: Tab; label: string; icon: typeof UserCheck; badge?: number }[] = [
    { key: 'resumen', label: 'Resumen', icon: UserCheck },
    { key: 'historial', label: 'Historial de Citas', icon: History },
    ...(mostrarPacientes ? [{ key: 'pacientes' as Tab, label: `Ficha de ${terminologiaCliente === 'Dueño de mascota' ? 'Mascotas' : 'Pacientes'}`, icon: PawPrint, badge: pacientesList.length }] : []),
    { key: 'notas', label: 'Notas Internas', icon: StickyNote },
  ];

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground flex flex-col font-sans">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
        <button
          onClick={() => router.push(`/${tenantSlug}/admin/clientes`)}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Volver a Clientes</span>
        </button>
      </div>

      <AdminPageHeader
        title={cliente.nombreCompleto || 'Cliente Registrado'}
        description={esVip ? 'Cliente VIP · alto valor de consumo' : undefined}
      >
        <div className="flex items-center gap-2">
          {cliente.bloqueado && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">
              Bloqueado
            </span>
          )}
          <button
            onClick={handleToggleMkt}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              cliente.aceptaMarketing
                ? 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20'
                : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
            }`}
            title="Haz clic para cambiar permiso Ley 81"
          >
            {cliente.aceptaMarketing ? 'LEY 81: AUTORIZADO' : 'LEY 81: NO OPT-IN'}
          </button>
          <button
            onClick={handleToggleBloqueo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              cliente.bloqueado
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-secondary hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border-border'
            }`}
          >
            <Ban size={14} />
            <span>{cliente.bloqueado ? 'Desbloquear' : 'Bloquear'}</span>
          </button>
        </div>
      </AdminPageHeader>

      <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna izquierda: resumen + tabs verticales */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 flex flex-col items-center text-center border-b border-border bg-secondary/20">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-card text-primary font-bold text-2xl flex items-center justify-center shadow-xs mb-3">
                  {initial}
                </div>
                <h2 className="font-bold text-base text-foreground">{cliente.nombreCompleto || 'Cliente Registrado'}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliente desde {new Date(cliente.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                {esVip && (
                  <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    VIP
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Gastado</p>
                    <p className="text-base font-extrabold text-primary font-mono">${Number(cliente.totalGastado || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Asistencias</p>
                    <p className="text-base font-extrabold text-foreground font-mono">{cliente.totalAsistencias}</p>
                  </div>
                </div>

                {cliente.ausenciasStrikes > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                      {cliente.ausenciasStrikes} {cliente.ausenciasStrikes === 1 ? 'strike' : 'strikes'} de inasistencia
                    </p>
                    {inasistencias === null ? (
                      <p className="text-[11px] text-muted-foreground">Cargando fechas...</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {inasistencias.map((i, idx) => (
                          <li key={idx} className="text-[11px] font-mono text-muted-foreground">
                            {new Date(i.fecha).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-xs pt-1">
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors font-semibold"
                  >
                    <MessageSquare size={15} className="text-muted-foreground shrink-0" />
                    <span className="font-mono">{cliente.telefonoWhatsapp}</span>
                  </a>
                  {cliente.emailFacturacion && (
                    <a
                      href={`mailto:${cliente.emailFacturacion}`}
                      className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors font-semibold"
                    >
                      <Mail size={15} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{cliente.emailFacturacion}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="shrink-0" />
                      <span>{t.label}</span>
                    </div>
                    {t.badge !== undefined && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Columna derecha: contenido de la tab activa */}
          <div className="lg:col-span-8 space-y-4">

            {tab === 'resumen' && (
              <div className="bg-card border border-border rounded-2xl shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold">Datos del Cliente</h3>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-xs font-bold rounded-xl"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={handleGuardarDatos} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Email de Facturación</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    {saveError && (
                      <p className="text-xs text-destructive font-medium">{saveError}</p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setEditing(false); setFormNombre(cliente.nombreCompleto || ''); setFormEmail(cliente.emailFacturacion || ''); setSaveError(''); }}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-xs font-bold rounded-xl flex items-center gap-1.5"
                      >
                        <X size={14} />
                        <span>Cancelar</span>
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1.5"
                      >
                        <Save size={14} />
                        <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">WhatsApp</p>
                      <p className="font-mono font-semibold">{cliente.telefonoWhatsapp}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">Email</p>
                      <p className="font-semibold">{cliente.emailFacturacion || 'Sin registrar'}</p>
                    </div>
                  </div>
                )}

                {cliente.notasPreferencia && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1.5">
                      <ShieldCheck size={12} />
                      <span>Preferencias registradas</span>
                    </p>
                    <p className="text-xs text-muted-foreground italic">"{cliente.notasPreferencia}"</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'historial' && (
              <div className="bg-card border border-border rounded-2xl shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <History size={18} className="text-primary" />
                    <span>Historial de Citas</span>
                  </h3>
                  <button onClick={loadCitas} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
                    <RefreshCw size={14} className={loadingCitas ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loadingCitas && citasList === null ? (
                  <p className="text-xs text-muted-foreground">Cargando historial...</p>
                ) : citasList && citasList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Este cliente aún no tiene citas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {(citasList || []).map((c) => {
                      const estadoInfo = ESTADO_LABELS[c.estado] || ESTADO_LABELS.programada;
                      return (
                        <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-secondary/20 border border-border rounded-xl">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {c.servicio?.nombre || c.combo?.nombre || 'Servicio'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${estadoInfo.className}`}>
                                {estadoInfo.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(c.inicioEstimado).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {' · '}
                              {c.empleado?.nombreCompleto || 'Sin asignar'}
                            </p>
                          </div>
                          {c.transaccion && (
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                              ${Number(c.transaccion.totalFacturado).toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'pacientes' && mostrarPacientes && (
              <div className="bg-card border border-border rounded-2xl shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <PawPrint size={18} className="text-primary" />
                    <span>{terminologiaCliente === 'Dueño de mascota' ? 'Mascotas Registradas' : 'Pacientes Registrados'}</span>
                  </h3>
                </div>

                {loadingPacientes ? (
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                ) : (
                  <div className="space-y-2">
                    {pacientesList.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aún no hay pacientes registrados.</p>
                    )}
                    {pacientesList.map((p) => (
                      <div key={p.id} className="bg-secondary/30 border border-border rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-foreground block">{p.nombre}</span>
                            {Object.entries(p.camposPersonalizados || {}).filter(([, v]) => v).length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Object.entries(p.camposPersonalizados)
                                  .filter(([, v]) => v)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' · ')}
                              </span>
                            )}
                          </div>
                          {currentUser?.rol === 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleVerHistorialClinico(p.id)}
                              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
                              title="Ver historial clínico (metadata, sin contenido)"
                            >
                              <FileClock size={14} />
                            </button>
                          )}
                        </div>

                        {pacienteHistorialAbierto === p.id && (
                          <div className="bg-background/60 border border-border rounded-lg p-2 space-y-1">
                            {(notasMetadataPorPaciente[p.id] || []).length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic">Sin notas clínicas registradas.</p>
                            ) : (
                              notasMetadataPorPaciente[p.id].map((n) => (
                                <div key={n.id} className="text-[10px] text-muted-foreground flex items-center justify-between">
                                  <span>{new Date(n.createdAt).toLocaleDateString()} — {n.empleadoNombre || 'Empleado'}</span>
                                  {n.proximaRevisionEn && <span className="font-semibold">Próx. revisión: {n.proximaRevisionEn}</span>}
                                </div>
                              ))
                            )}
                            <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border">
                              Solo el profesional autor puede ver el contenido clínico completo.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-3 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formPacienteNombre}
                      onChange={(e) => setFormPacienteNombre(e.target.value)}
                      placeholder="Ej. Firulais"
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold"
                    />
                  </div>

                  {configCamposPersonalizados
                    .filter((campo) => campo.entidad === 'paciente')
                    .map((campo) => (
                      <div key={campo.clave}>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                          {campo.etiqueta}{campo.requerido && ' *'}
                        </label>
                        <input
                          type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
                          value={formPacienteCampos[campo.clave] || ''}
                          onChange={(e) => setFormPacienteCampos((prev) => ({ ...prev, [campo.clave]: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold"
                        />
                      </div>
                    ))}

                  {pacienteErrorMsg && (
                    <p className="text-[10px] text-destructive font-medium">{pacienteErrorMsg}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleAddPaciente}
                    disabled={savingPaciente}
                    className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>{savingPaciente ? 'Guardando...' : 'Registrar Paciente'}</span>
                  </button>
                </div>
              </div>
            )}

            {tab === 'notas' && (
              <form onSubmit={handleGuardarNotas} className="bg-card border border-border rounded-2xl shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <StickyNote size={18} className="text-primary" />
                  <h3 className="text-base font-bold">Notas Internas</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preferencias, alergias u observaciones que el equipo debe tener en cuenta al atender a este cliente.
                </p>
                <textarea
                  rows={6}
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Ej. Prefiere degradado bajo con tijera arriba, bebe café sin azúcar..."
                  className="w-full p-3 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                />
                {saveError && (
                  <p className="text-xs text-destructive font-medium">{saveError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingNotas}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{savingNotas ? 'Guardando...' : 'Guardar Notas'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
