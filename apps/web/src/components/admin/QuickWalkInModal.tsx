import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Calendar, Clock, PawPrint, Users, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fetchApi } from '@/lib/api';
import { useTenant } from '@/lib/tenant-context';
import { requierePaciente, requiereMotivo } from '@/lib/industrias';

interface Empleado {
  id: string;
  nombreCompleto: string;
}

interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioBase: number;
}

interface Paciente {
  id: string;
  nombre: string;
}

interface ClienteEncontrado {
  id: string;
  ausenciasStrikes: number;
  bloqueado: boolean;
}

// Citas grupales (cliente + acompañante) — ver
// docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §3.
// Todos los acompañantes comparten fecha/hora con la persona principal (walk-in
// "ahora mismo", no una secuencia con horarios distintos — decisión de alcance).
interface Acompanante {
  pacienteId: string;
  servicioId: string;
  empleadoId: string;
  notas: string;
}

interface QuickWalkInModalProps {
  tenantSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empleados: Empleado[];
  initialDate?: Date;
}

export function QuickWalkInModal({
  tenantSlug,
  isOpen,
  onClose,
  onSuccess,
  empleados,
  initialDate,
}: QuickWalkInModalProps) {
  const { industria, terminologiaCliente } = useTenant();
  const mostrarPaciente = requierePaciente(industria);
  const mostrarMotivo = requiereMotivo(industria);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id || '');
  const [notas, setNotas] = useState('');

  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inicioHora, setInicioHora] = useState('12:00');

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pacientesDelCliente, setPacientesDelCliente] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [clienteExistenteId, setClienteExistenteId] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteEncontrado | null>(null);
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 1. Cargar lista de servicios
      fetchApi<Servicio[]>('/servicios')
        .then((data) => {
          setServicios(data);
          if (data.length > 0) setServicioId(data[0].id);
        })
        .catch((err) => console.error('Error cargando servicios:', err));

      // 2. Prellenar Fecha seleccionada y Hora actual
      const baseDate = initialDate || new Date();
      setFecha(format(baseDate, 'yyyy-MM-dd'));

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setInicioHora(`${hh}:${mm}`);

      setPacientesDelCliente([]);
      setPacienteId('');
      setClienteExistenteId('');
      setClienteEncontrado(null);
      setAcompanantes([]);
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleTelefonoBlur = async () => {
    if (!telefonoWhatsapp.trim()) return;
    try {
      const resultados = await fetchApi<ClienteEncontrado[]>(`/clientes?q=${encodeURIComponent(telefonoWhatsapp.trim())}`);
      if (resultados.length > 0) {
        setClienteEncontrado(resultados[0]);
        if (!mostrarPaciente) return;
        setClienteExistenteId(resultados[0].id);
        const pacientes = await fetchApi<Paciente[]>(`/pacientes?clienteId=${resultados[0].id}`);
        setPacientesDelCliente(pacientes || []);
      } else {
        setClienteEncontrado(null);
        setClienteExistenteId('');
        setPacientesDelCliente([]);
      }
    } catch (err) {
      console.error('Error buscando cliente/pacientes existentes:', err);
    }
  };

  const handleAddAcompanante = () => {
    setAcompanantes((prev) => [
      ...prev,
      { pacienteId: '', servicioId: servicios[0]?.id || '', empleadoId, notas: '' },
    ]);
  };

  const handleRemoveAcompanante = (idx: number) => {
    setAcompanantes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAcompananteChange = (idx: number, campo: keyof Acompanante, valor: string) => {
    setAcompanantes((prev) => prev.map((a, i) => (i === idx ? { ...a, [campo]: valor } : a)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto || !telefonoWhatsapp || !servicioId || !empleadoId || !fecha || !inicioHora) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    if (acompanantes.some((a) => !a.servicioId || !a.empleadoId)) {
      setError('Completa el servicio y empleado de cada acompañante, o quítalo de la lista.');
      return;
    }
    if (mostrarMotivo && (!notas.trim() || acompanantes.some((a) => !a.notas.trim()))) {
      setError('Indica el motivo de la visita para cada persona.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Crear o buscar cliente
      let clienteId: string;
      try {
        const nuevoCliente = await fetchApi<{ id: string }>('/clientes', {
          method: 'POST',
          body: JSON.stringify({ nombreCompleto, telefonoWhatsapp }),
        });
        clienteId = nuevoCliente.id;
      } catch (err: any) {
        // Si el cliente ya existe (409 Conflict), buscar por teléfono
        const resultados = await fetchApi<{ id: string }[]>(`/clientes?q=${encodeURIComponent(telefonoWhatsapp)}`);
        if (resultados.length > 0) {
          clienteId = resultados[0].id;
        } else {
          throw err;
        }
      }

      // 2. Armar fecha y hora exactas (compartida por la persona principal y sus
      // acompañantes — walk-in "ahora mismo", no una secuencia con horarios distintos)
      const [yyyy, monthIndex, dd] = fecha.split('-').map(Number);
      const [hh, mm] = inicioHora.split(':').map(Number);
      const inicioEstimado = new Date(yyyy, monthIndex - 1, dd, hh, mm).toISOString();

      const citaPrincipal = {
        clienteId,
        empleadoId,
        servicioId,
        ...(mostrarPaciente && pacienteId && { pacienteId }),
        ...(notas.trim() && { notas: notas.trim() }),
        inicioEstimado,
        origen: 'walk_in' as const,
      };

      if (acompanantes.length === 0) {
        // 3a. Cita individual (comportamiento sin cambios)
        await fetchApi('/citas', {
          method: 'POST',
          body: JSON.stringify(citaPrincipal),
        });
      } else {
        // 3b. Cita grupal: la persona principal + cada acompañante, mismo cliente,
        // agrupadas por grupoReservaId generado en el servidor (transaccional — si
        // un horario choca, ningún acompañante queda a medio agendar).
        const citasGrupo = [
          citaPrincipal,
          ...acompanantes.map((a) => ({
            clienteId,
            empleadoId: a.empleadoId,
            servicioId: a.servicioId,
            ...(mostrarPaciente && a.pacienteId && { pacienteId: a.pacienteId }),
            ...(a.notas.trim() && { notas: a.notas.trim() }),
            inicioEstimado,
            origen: 'walk_in' as const,
          })),
        ];
        await fetchApi('/citas/grupo', {
          method: 'POST',
          body: JSON.stringify({ citas: citasGrupo }),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al agendar cita manual:', err);
      setError(err.message || 'Error al agendar la cita');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <UserPlus size={20} className="text-primary" />
            <span>Nueva Cita (Manual / Walk-in)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Nombre Cliente */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Pedro Gómez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
            />
          </div>

          {/* Teléfono WhatsApp */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Teléfono WhatsApp
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="tel"
                required
                placeholder="61234567"
                value={telefonoWhatsapp}
                onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                onBlur={handleTelefonoBlur}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
              />
            </div>
            {/* Alerta de inasistencias/bloqueo — no bloquea automático, solo informa al
                staff (ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §3) */}
            {clienteEncontrado && (clienteEncontrado.ausenciasStrikes > 0 || clienteEncontrado.bloqueado) && (
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-snug">
                  {clienteEncontrado.bloqueado && 'Este cliente está bloqueado. '}
                  {clienteEncontrado.ausenciasStrikes > 0 &&
                    `${clienteEncontrado.ausenciasStrikes} ${clienteEncontrado.ausenciasStrikes === 1 ? 'inasistencia registrada' : 'inasistencias registradas'}.`}
                </p>
              </div>
            )}
          </div>

          {/* Selección de Paciente (mascota) — solo industrias que lo requieren */}
          {mostrarPaciente && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                <PawPrint size={13} />
                <span>Paciente</span>
              </label>
              {clienteExistenteId ? (
                pacientesDelCliente.length > 0 ? (
                  <select
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
                  >
                    <option value="">Sin especificar</option>
                    {pacientesDelCliente.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    Este {terminologiaCliente.toLowerCase()} no tiene pacientes registrados todavía — agrégalo desde Clientes.
                  </p>
                )
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Escribe el teléfono para buscar al {terminologiaCliente.toLowerCase()} y sus pacientes registrados.
                </p>
              )}
            </div>
          )}

          {/* Selección Empleado */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Empleado Asignado
            </label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
            >
              {empleados.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombreCompleto}
                </option>
              ))}
            </select>
          </div>

          {/* Selección Servicio */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Servicio
            </label>
            <select
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
            >
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} (${s.precioBase} - {s.duracionMinutos} min)
                </option>
              ))}
            </select>
          </div>

          {/* Motivo de la visita — solo industrias que lo requieren (veterinaria/clínica) */}
          {mostrarMotivo && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Motivo de la visita
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Chequeo de rutina, vacunación..."
                rows={2}
                className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm resize-none"
              />
            </div>
          )}

          {/* Acompañantes (citas grupales) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users size={13} />
                <span>Acompañantes</span>
              </label>
              <button
                type="button"
                onClick={handleAddAcompanante}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                + Agregar acompañante
              </button>
            </div>

            {acompanantes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">
                ¿Vino acompañado? Agrega otra persona para atenderla en la misma visita.
              </p>
            ) : (
              <div className="space-y-2">
                {acompanantes.map((a, idx) => (
                  <div key={idx} className="p-2.5 bg-secondary/30 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Acompañante {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAcompanante(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-md"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {mostrarPaciente && (
                      pacientesDelCliente.length > 0 ? (
                        <select
                          value={a.pacienteId}
                          onChange={(e) => handleAcompananteChange(idx, 'pacienteId', e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                        >
                          <option value="">Sin especificar paciente</option>
                          {pacientesDelCliente.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          Escribe el teléfono arriba para elegir el paciente del acompañante.
                        </p>
                      )
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={a.servicioId}
                        onChange={(e) => handleAcompananteChange(idx, 'servicioId', e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                      >
                        {servicios.map((s) => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={a.empleadoId}
                        onChange={(e) => handleAcompananteChange(idx, 'empleadoId', e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                      >
                        {empleados.map((b) => (
                          <option key={b.id} value={b.id}>{b.nombreCompleto}</option>
                        ))}
                      </select>
                      {mostrarMotivo && (
                        <textarea
                          value={a.notas}
                          onChange={(e) => handleAcompananteChange(idx, 'notas', e.target.value)}
                          placeholder="Motivo de la visita"
                          rows={2}
                          className="col-span-2 px-3 py-2 bg-background border border-border rounded-lg text-xs resize-none"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fecha y Hora de Inicio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Fecha
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Hora de Inicio
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="time"
                  required
                  value={inicioHora}
                  onChange={(e) => setInicioHora(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              {isLoading ? 'Agendando...' : 'Confirmar Cita'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
