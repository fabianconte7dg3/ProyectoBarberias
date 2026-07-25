'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useTenant } from '@/lib/tenant-context';
import { requierePaciente } from '@/lib/industrias';
import {
  ArrowLeft, Search, Plus, UserCheck, ShieldCheck, AlertTriangle,
  MessageSquare, Edit, Ban, RefreshCw, X, Check, Mail, Phone, Calendar, DollarSign, Lock, ShieldAlert,
  PawPrint, FileClock
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

export default function AdminClientesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const logoutStore = useAdminStore((state) => state.logout);
  const { industria, configCamposPersonalizados, terminologiaCliente } = useTenant();
  const mostrarPacientes = requierePaciente(industria);


  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMkt, setFiltroMkt] = useState<'todos' | 'ley81' | 'strikes' | 'bloqueados'>('todos');

  // Modal Crear / Editar Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formAceptaMkt, setFormAceptaMkt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Multi-industria: pacientes (mascotas) del cliente en edición
  const [pacientesList, setPacientesList] = useState<Paciente[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [formPacienteNombre, setFormPacienteNombre] = useState('');
  const [formPacienteCampos, setFormPacienteCampos] = useState<Record<string, string>>({});
  const [savingPaciente, setSavingPaciente] = useState(false);
  const [pacienteErrorMsg, setPacienteErrorMsg] = useState('');
  const [notasMetadataPorPaciente, setNotasMetadataPorPaciente] = useState<Record<string, NotaClinicaMetadata[]>>({});
  const [pacienteHistorialAbierto, setPacienteHistorialAbierto] = useState<string | null>(null);

  // 1. Guard de autenticación — usa hook centralizado para evitar cierre de
  //    sesión causado por storage events de otras pestañas (ej. página de reservas)
  useAdminAuth({ tenantSlug });


  // Cargar datos al montar
  useEffect(() => {
    loadClientes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<Cliente[]>('/clientes');
      setClientesList(res);
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
      setError(err.message || 'Error cargando la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCliente(null);
    setFormNombre('');
    setFormTelefono('+507');
    setFormEmail('');
    setFormNotas('');
    setFormAceptaMkt(false);
    setFormError('');
    setPacientesList([]);
    setNotasMetadataPorPaciente({});
    setPacienteHistorialAbierto(null);
    resetFormPaciente();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Cliente) => {
    setEditingCliente(c);
    setFormNombre(c.nombreCompleto || '');
    setFormTelefono(c.telefonoWhatsapp);
    setFormEmail(c.emailFacturacion || '');
    setFormNotas(c.notasPreferencia || '');
    setFormAceptaMkt(c.aceptaMarketing);
    setFormError('');
    setPacientesList([]);
    setNotasMetadataPorPaciente({});
    setPacienteHistorialAbierto(null);
    resetFormPaciente();
    setIsModalOpen(true);
    if (mostrarPacientes) {
      loadPacientes(c.id);
    }
  };

  const resetFormPaciente = () => {
    setFormPacienteNombre('');
    setFormPacienteCampos({});
    setPacienteErrorMsg('');
  };

  const loadPacientes = async (clienteId: string) => {
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

  const handleAddPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente || !formPacienteNombre.trim()) {
      setPacienteErrorMsg(`El nombre de ${terminologiaCliente === 'Dueño de mascota' ? 'la mascota' : 'el paciente'} es requerido.`);
      return;
    }

    setSavingPaciente(true);
    setPacienteErrorMsg('');
    try {
      await fetchApi('/pacientes', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: editingCliente.id,
          nombre: formPacienteNombre.trim(),
          camposPersonalizados: formPacienteCampos,
        }),
      });
      resetFormPaciente();
      loadPacientes(editingCliente.id);
    } catch (err: any) {
      setPacienteErrorMsg(err.message || 'Error al registrar.');
    } finally {
      setSavingPaciente(false);
    }
  };

  const handleVerHistorial = async (pacienteId: string) => {
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

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTelefono.trim()) {
      setFormError('El teléfono de WhatsApp es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingCliente) {
        // Actualizar Cliente
        await fetchApi(`/clientes/${editingCliente.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            nombreCompleto: formNombre.trim() || undefined,
            emailFacturacion: formEmail.trim() || undefined,
            notasPreferencia: formNotas.trim() || undefined,
            aceptaMarketing: formAceptaMkt,
          }),
        });
      } else {
        // Crear Cliente
        await fetchApi('/clientes', {
          method: 'POST',
          body: JSON.stringify({
            nombreCompleto: formNombre.trim() || 'Cliente Registrado',
            telefonoWhatsapp: formTelefono.trim(),
            notasPreferencia: formNotas.trim() || undefined,
          }),
        });
      }

      setIsModalOpen(false);
      loadClientes();
    } catch (err: any) {
      console.error('Error guardando cliente:', err);
      setFormError(err.message || 'Error guardando datos del cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBloqueo = async (c: Cliente) => {
    try {
      await fetchApi(`/clientes/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ bloqueado: !c.bloqueado }),
      });
      loadClientes();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de bloqueo.');
    }
  };

  const handleToggleMarketingDirect = async (c: Cliente) => {
    try {
      await fetchApi(`/clientes/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ aceptaMarketing: !c.aceptaMarketing }),
      });
      loadClientes();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar preferencia Ley 81.');
    }
  };

  // Filtrado de Lista
  const filteredClientes = clientesList.filter((c) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.nombreCompleto || '').toLowerCase().includes(search) ||
      c.telefonoWhatsapp.includes(search) ||
      (c.emailFacturacion || '').toLowerCase().includes(search);

    if (!matchesSearch) return false;

    if (filtroMkt === 'ley81') return c.aceptaMarketing;
    if (filtroMkt === 'strikes') return c.ausenciasStrikes > 0;
    if (filtroMkt === 'bloqueados') return c.bloqueado;

    return true;
  });

  // Métricas Rápidas
  const totalClientes = clientesList.length;
  const optInMktCount = clientesList.filter((c) => c.aceptaMarketing).length;
  const clientesFielesCount = clientesList.filter((c) => Number(c.totalGastado || 0) >= 50).length;
  const clientesStrikesCount = clientesList.filter((c) => c.ausenciasStrikes > 0).length;




  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin Estándar */}
      {currentUser && (
        <AdminHeader
          tenantSlug={tenantSlug}
          userName={currentUser.nombreCompleto}
          userRole={currentUser.rol}
          selectedDate={new Date()}
          onDateChange={() => {}}
          onLogout={() => {
            logoutStore();
            router.push(`/${tenantSlug}/admin/login`);
          }}
          onNewCitaClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
        />
      )}

      {/* Sub-Header CRM */}
      <div className="border-b border-border bg-card/60 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
                <UserCheck size={20} className="text-primary" />
                <span>CRM & Base de Clientes</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Directorio de clientes, historial de consumo (LTV), ausencias y consentimientos Ley 81
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-xs"
          >
            <Plus size={16} />
            <span>Registrar Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {loading && clientesList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="animate-spin text-primary" size={24} />
            <span className="font-semibold text-xs">Cargando directorio de clientes...</span>
          </div>
        ) : (
          <>
            {/* TARJETAS KPI TOP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Clientes</span>
                <div className="text-2xl font-extrabold text-foreground font-mono">{totalClientes}</div>
                <span className="text-[10px] text-muted-foreground block">Registrados en sistema</span>
              </div>

              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Clientes VIP (LTV &gt; $50)</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{clientesFielesCount}</div>
                <span className="text-[10px] text-muted-foreground block">Alto valor de consumo</span>
              </div>

              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Opt-In Ley 81</span>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">{optInMktCount}</div>
                <span className="text-[10px] text-muted-foreground block">Autorizan mensajería</span>
              </div>

              <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Con Ausencias</span>
                <div className="text-2xl font-extrabold text-rose-500 font-mono">{clientesStrikesCount}</div>
                <span className="text-[10px] text-muted-foreground block">Con strikes registrados</span>
              </div>
            </div>

            {/* BUSCADOR Y FILTROS */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Buscador */}
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, WhatsApp o email..."
                  className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Filtros de Píldoras */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto text-xs font-bold">
                <button
                  onClick={() => setFiltroMkt('todos')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    filtroMkt === 'todos' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Todos ({totalClientes})
                </button>
                <button
                  onClick={() => setFiltroMkt('ley81')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    filtroMkt === 'ley81' ? 'bg-blue-600 text-white' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Opt-In Ley 81 ({optInMktCount})
                </button>
                <button
                  onClick={() => setFiltroMkt('strikes')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    filtroMkt === 'strikes' ? 'bg-amber-500 text-white' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Con Ausencias ({clientesStrikesCount})
                </button>
                <button
                  onClick={() => setFiltroMkt('bloqueados')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    filtroMkt === 'bloqueados' ? 'bg-rose-600 text-white' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Bloqueados
                </button>
              </div>

            </div>

            {/* TABLA EJECUTIVA DE CLIENTES */}
            <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">WhatsApp & Contacto</th>
                      <th className="py-3 px-4 text-center">Asistencias</th>
                      <th className="py-3 px-4 text-right">Consumo (LTV)</th>
                      <th className="py-3 px-4 text-center">Strikes</th>
                      <th className="py-3 px-4 text-center">Ley 81 Opt-In</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredClientes.map((c) => {
                      const initial = (c.nombreCompleto || 'C').charAt(0).toUpperCase();
                      const cleanPhone = c.telefonoWhatsapp.replace(/[^0-9]/g, '');

                      return (
                        <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                          
                          {/* Cliente Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                {initial}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">{c.nombreCompleto || 'Cliente Registrado'}</span>
                                {c.notasPreferencia && (
                                  <span className="text-[11px] text-muted-foreground italic truncate max-w-xs block">
                                    "{c.notasPreferencia}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* WhatsApp & Email */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                              >
                                <MessageSquare size={13} />
                                <span>{c.telefonoWhatsapp}</span>
                              </a>
                              {c.emailFacturacion && (
                                <span className="text-[11px] text-muted-foreground block font-mono">
                                  {c.emailFacturacion}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Asistencias */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                            {c.totalAsistencias}
                          </td>

                          {/* Consumo (LTV) */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${Number(c.totalGastado || 0).toFixed(2)}
                          </td>

                          {/* Strikes */}
                          <td className="py-3.5 px-4 text-center">
                            {c.ausenciasStrikes > 0 ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${
                                c.ausenciasStrikes >= 3 
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}>
                                {c.ausenciasStrikes} {c.ausenciasStrikes === 1 ? 'strike' : 'strikes'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">0</span>
                            )}
                          </td>

                          {/* Toggle Ley 81 */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleMarketingDirect(c)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-colors ${
                                c.aceptaMarketing
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                  : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                              }`}
                              title="Haz clic para cambiar permiso Ley 81"
                            >
                              {c.aceptaMarketing ? 'AUTORIZADO' : 'NO OPT-IN'}
                            </button>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(c)}
                                className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar Datos"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleBloqueo(c)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  c.bloqueado
                                    ? 'bg-rose-500 text-white border-rose-600 hover:opacity-90'
                                    : 'bg-secondary hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border-border'
                                }`}
                                title={c.bloqueado ? 'Desbloquear Cliente' : 'Bloquear Cliente'}
                              >
                                <Ban size={14} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}

                    {filteredClientes.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground space-y-1">
                          <p className="font-semibold text-sm text-foreground">No se encontraron clientes con este filtro.</p>
                          <p className="text-muted-foreground">Prueba modificando el término de búsqueda o seleccionando "Todos".</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`bg-card border border-border w-full ${editingCliente && mostrarPacientes ? 'max-w-lg' : 'max-w-md'} rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <UserCheck size={18} className="text-primary" />
                <span>{editingCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCliente} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">WhatsApp / Teléfono *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCliente}
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  placeholder="+50766001122"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-mono font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Email de Facturación</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="juan@email.com"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Notas / Preferencias de Corte</label>
                <textarea
                  rows={3}
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Ej. Prefiere degradado bajo con tijera arriba, bebe café sin azúcar..."
                  className="w-full p-3 bg-secondary/50 border border-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="p-3 bg-secondary/40 border border-border rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block text-foreground">Autorización Ley 81 (Marketing)</span>
                  <span className="text-[10px] text-muted-foreground block">El cliente autoriza recibir mensajes comerciales.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formAceptaMkt}
                  onChange={(e) => setFormAceptaMkt(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  {saving ? 'Guardando...' : (editingCliente ? 'Actualizar Cliente' : 'Guardar Cliente')}
                </button>
              </div>
            </form>

            {/* Multi-industria: pacientes/mascotas del cliente (solo en edición) */}
            {editingCliente && mostrarPacientes && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PawPrint size={14} className="text-primary" />
                  <span>Pacientes de {editingCliente.nombreCompleto || 'este cliente'}</span>
                </h3>

                {loadingPacientes ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Cargando...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pacientesList.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Aún no hay pacientes registrados.</p>
                    )}
                    {pacientesList.map((p) => (
                      <div key={p.id} className="bg-secondary/30 border border-border rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-foreground block">{p.nombre}</span>
                            {Object.entries(p.camposPersonalizados || {}).filter(([, v]) => v).length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
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
                              onClick={() => handleVerHistorial(p.id)}
                              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
                              title="Ver historial clínico (metadata, sin contenido)"
                            >
                              <FileClock size={13} />
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

                {/* Formulario para agregar un nuevo paciente */}
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
                    <Plus size={13} />
                    <span>{savingPaciente ? 'Guardando...' : 'Registrar Paciente'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
