'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  Users, UserPlus, Clock, Edit2, ShieldCheck, AlertTriangle, RefreshCw, Save, X, Scissors, Award, CheckCircle2, ArrowLeft 
} from 'lucide-react';
import { HorariosModal } from '@/components/admin/HorariosModal';
import { InviteBarberoModal } from '@/components/admin/InviteBarberoModal';

interface UsuarioStaff {
  id: string;
  nombreCompleto: string;
  email?: string;
  rol: 'admin' | 'barbero' | 'recepcion';
  porcentajeComision?: string;
  porcentajeComisionProducto?: string;
  activo: boolean;
  tokenActivacion?: string;
}

export default function AdminBarberosPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);

  const [staff, setStaff] = useState<UsuarioStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modales
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [horariosModalBarbero, setHorariosModalBarbero] = useState<{ id: string; nombre: string } | null>(null);

  // Edición rápida de comisión
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [comisionServicioInput, setComisionServicioInput] = useState<string>('60');
  const [comisionProductoInput, setComisionProductoInput] = useState<string>('0');
  const [savingComision, setSavingComision] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }

    if (currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }

    loadStaff();
  }, [currentUser, tenantSlug, router]);

  const loadStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<UsuarioStaff[]>('/usuarios');
      setStaff(res || []);
    } catch (err: any) {
      console.error('Error cargando lista de staff:', err);
      setError(err.message || 'Error al obtener integrantes del equipo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComision = async (usuarioId: string) => {
    const valServicio = parseFloat(comisionServicioInput);
    const valProducto = parseFloat(comisionProductoInput || '0');

    if (isNaN(valServicio) || valServicio < 0 || valServicio > 100) {
      setError('La comisión de servicios debe estar entre 0% y 100%.');
      return;
    }

    if (isNaN(valProducto) || valProducto < 0 || valProducto > 100) {
      setError('La comisión de productos debe estar entre 0% y 100%.');
      return;
    }

    setSavingComision(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi(`/usuarios/${usuarioId}/comision`, {
        method: 'PATCH',
        body: JSON.stringify({
          porcentajeComision: valServicio,
          porcentajeComisionProducto: valProducto,
        }),
      });

      setSuccessMsg('Porcentajes de comisión actualizados correctamente.');
      setEditingUserId(null);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar comisiones.');
    } finally {
      setSavingComision(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando equipo de barberos y staff...</span>
        </div>
      </div>
    );
  }

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
              <Users size={20} className="text-primary" />
              <span>Gestión de Barberos & Equipo de Staff</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Administra el equipo de tu barbería, comisiones por venta y horarios laborales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <UserPlus size={16} />
            <span>+ Invitar Nuevo Barbero</span>
          </button>

          <button
            onClick={loadStaff}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border rounded-xl transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tarjetas de Barberos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((u) => {
            const isEditingThis = editingUserId === u.id;
            return (
              <div 
                key={u.id} 
                className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-border/80 transition-all"
              >
                {/* Header Tarjeta */}
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-extrabold text-primary text-sm">
                      {u.nombreCompleto.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-foreground">{u.nombreCompleto}</h3>
                      <p className="text-xs text-muted-foreground">{u.email || 'Acceso por PIN'}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-secondary border border-border shrink-0">
                    {u.rol}
                  </span>
                </div>

                {/* Info Estado & Comisiones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estado Acceso:</span>
                    {u.activo ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck size={14} /> Activo (Con PIN)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={14} /> Pendiente de PIN
                      </span>
                    )}
                  </div>

                  {u.rol === 'barbero' && (
                    <div className="bg-secondary/30 p-3 rounded-xl border border-border space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Esquema de Comisiones
                      </div>

                      {isEditingThis ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Comisión Servicios:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={comisionServicioInput}
                                onChange={(e) => setComisionServicioInput(e.target.value)}
                                className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                              />
                              <span className="font-bold">%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Comisión Productos:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={comisionProductoInput}
                                onChange={(e) => setComisionProductoInput(e.target.value)}
                                className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                              />
                              <span className="font-bold">%</span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveComision(u.id)}
                              disabled={savingComision}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Save size={14} /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {u.porcentajeComision || '0'}% Serv.
                            </span>
                            {Number(u.porcentajeComisionProducto || 0) > 0 ? (
                              <span className="font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                {u.porcentajeComisionProducto}% Prod.
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">
                                (0% Prod.)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setComisionServicioInput(u.porcentajeComision || '60');
                              setComisionProductoInput(u.porcentajeComisionProducto || '0');
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                            title="Editar comisiones"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones Rápidas en Footer */}
                {u.rol === 'barbero' && (
                  <div className="pt-2 border-t border-border flex items-center gap-2">
                    <button
                      onClick={() => setHorariosModalBarbero({ id: u.id, nombre: u.nombreCompleto })}
                      className="w-full py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Clock size={15} className="text-primary" />
                      <span>Horarios & Vacaciones</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>

      {/* Modal Invitar Barbero */}
      <InviteBarberoModal
        isOpen={isInviteModalOpen}
        tenantSlug={tenantSlug}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={loadStaff}
      />

      {/* Modal Configuración Horario Barbero */}
      {horariosModalBarbero && (
        <HorariosModal
          isOpen={!!horariosModalBarbero}
          barberoId={horariosModalBarbero.id}
          barberoNombre={horariosModalBarbero.nombre}
          onClose={() => setHorariosModalBarbero(null)}
        />
      )}
    </div>
  );
}
