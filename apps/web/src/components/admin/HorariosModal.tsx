import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Save, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HorariosModalProps {
  isOpen: boolean;
  barberoId: string;
  barberoNombre: string;
  onClose: () => void;
}

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIAS_SEMANA_CONFIG: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

interface DiaState {
  diaSemana: DiaSemana;
  activo: boolean;
  horaInicio: string;
  horaFin: string;
  horaAlmuerzoInicio: string;
  horaAlmuerzoFin: string;
}

interface BloqueoItem {
  id: string;
  inicio: string;
  fin: string;
  tipo: string;
  notas?: string;
}

export function HorariosModal({ isOpen, barberoId, barberoNombre, onClose }: HorariosModalProps) {
  const [activeTab, setActiveTab] = useState<'semanal' | 'bloqueos'>('semanal');
  const [dias, setDias] = useState<Record<DiaSemana, DiaState>>({
    lunes: { diaSemana: 'lunes', activo: true, horaInicio: '09:00', horaFin: '19:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    martes: { diaSemana: 'martes', activo: true, horaInicio: '09:00', horaFin: '19:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    miercoles: { diaSemana: 'miercoles', activo: true, horaInicio: '09:00', horaFin: '19:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    jueves: { diaSemana: 'jueves', activo: true, horaInicio: '09:00', horaFin: '19:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    viernes: { diaSemana: 'viernes', activo: true, horaInicio: '09:00', horaFin: '19:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    sabado: { diaSemana: 'sabado', activo: true, horaInicio: '09:00', horaFin: '18:00', horaAlmuerzoInicio: '13:00', horaAlmuerzoFin: '14:00' },
    domingo: { diaSemana: 'domingo', activo: false, horaInicio: '09:00', horaFin: '17:00', horaAlmuerzoInicio: '', horaAlmuerzoFin: '' },
  });

  const [bloqueos, setBloqueos] = useState<BloqueoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario nuevo bloqueo
  const [bloqueoInicio, setBloqueoInicio] = useState('');
  const [bloqueoFin, setBloqueoFin] = useState('');
  const [bloqueoTipo, setBloqueoTipo] = useState('vacaciones');
  const [bloqueoNotas, setBloqueoNotas] = useState('');

  useEffect(() => {
    if (isOpen && barberoId) {
      loadHorarioAndBloqueos();
    }
  }, [isOpen, barberoId]);

  const loadHorarioAndBloqueos = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const [resHorarios, resBloqueos] = await Promise.all([
        fetchApi<any[]>(`/horarios/barbero/${barberoId}`),
        fetchApi<any[]>(`/horarios/bloqueos/${barberoId}`),
      ]);

      if (resHorarios && resHorarios.length > 0) {
        setDias(prev => {
          const next = { ...prev };
          // reset inactivos por defecto
          DIAS_SEMANA_CONFIG.forEach(d => {
            next[d.key] = { ...next[d.key], activo: false };
          });

          resHorarios.forEach(h => {
            const k = h.diaSemana as DiaSemana;
            if (next[k]) {
              next[k] = {
                diaSemana: k,
                activo: h.activo,
                horaInicio: h.horaInicio || '09:00',
                horaFin: h.horaFin || '19:00',
                horaAlmuerzoInicio: h.horaAlmuerzoInicio || '',
                horaAlmuerzoFin: h.horaAlmuerzoFin || '',
              };
            }
          });
          return next;
        });
      }

      setBloqueos(resBloqueos || []);
    } catch (err: any) {
      console.error('Error cargando horario de barbero:', err);
      setError(err.message || 'Error al cargar horario.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleToggleDia = (key: DiaSemana) => {
    setDias(prev => ({
      ...prev,
      [key]: { ...prev[key], activo: !prev[key].activo }
    }));
  };

  const handleChangeDia = (key: DiaSemana, field: keyof DiaState, val: string) => {
    setDias(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }));
  };

  const handleSaveHorarioSemanal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const diasActivos = Object.values(dias)
        .filter(d => d.activo)
        .map(d => ({
          diaSemana: d.diaSemana,
          horaInicio: d.horaInicio,
          horaFin: d.horaFin,
          horaAlmuerzoInicio: d.horaAlmuerzoInicio || undefined,
          horaAlmuerzoFin: d.horaAlmuerzoFin || undefined,
        }));

      await fetchApi(`/horarios/barbero/${barberoId}`, {
        method: 'POST',
        body: JSON.stringify({ dias: diasActivos }),
      });

      setSuccessMsg('Jornada laboral semanal guardada correctamente.');
    } catch (err: any) {
      console.error('Error guardando horario:', err);
      setError(err.message || 'Error al guardar horario.');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloqueoInicio || !bloqueoFin) {
      setError('Debes especificar fecha/hora de inicio y fin para el bloqueo.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi('/horarios/bloqueos', {
        method: 'POST',
        body: JSON.stringify({
          barberoId,
          inicio: new Date(bloqueoInicio).toISOString(),
          fin: new Date(bloqueoFin).toISOString(),
          tipo: bloqueoTipo,
          motivo: bloqueoNotas,
        }),
      });

      setSuccessMsg('Bloqueo temporal registrado.');
      setBloqueoInicio('');
      setBloqueoFin('');
      setBloqueoNotas('');
      loadHorarioAndBloqueos();
    } catch (err: any) {
      console.error('Error creando bloqueo:', err);
      setError(err.message || 'Error al crear bloqueo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-base">
            <Clock size={20} className="text-primary" />
            <span>Configuración de Horario: <strong>{barberoNombre}</strong></span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-6 bg-secondary/10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('semanal')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'semanal'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock size={15} />
            <span>Plantilla Semanal Regular</span>
          </button>

          <button
            onClick={() => setActiveTab('bloqueos')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bloqueos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar size={15} />
            <span>Bloqueos y Vacaciones</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PLANTILLA SEMANAL */}
          {activeTab === 'semanal' && (
            <form onSubmit={handleSaveHorarioSemanal} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Define los días laborables, el rango de horas de atención y el receso de almuerzo para {barberoNombre}.
              </p>

              <div className="space-y-2.5">
                {DIAS_SEMANA_CONFIG.map(({ key, label }) => {
                  const d = dias[key];
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        d.activo
                          ? 'bg-card border-border shadow-xs'
                          : 'bg-secondary/20 border-border/50 opacity-60'
                      }`}
                    >
                      {/* Checkbox Día */}
                      <label className="flex items-center gap-2.5 font-bold text-foreground cursor-pointer min-w-32">
                        <input
                          type="checkbox"
                          checked={d.activo}
                          onChange={() => handleToggleDia(key)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span>{label}</span>
                      </label>

                      {/* Inputs Horario */}
                      {d.activo ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-lg border border-border">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Turno:</span>
                            <input
                              type="time"
                              required
                              value={d.horaInicio}
                              onChange={(e) => handleChangeDia(key, 'horaInicio', e.target.value)}
                              className="bg-transparent text-xs font-mono font-bold"
                            />
                            <span className="text-muted-foreground">-</span>
                            <input
                              type="time"
                              required
                              value={d.horaFin}
                              onChange={(e) => handleChangeDia(key, 'horaFin', e.target.value)}
                              className="bg-transparent text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <span className="text-[10px] uppercase font-bold">Almuerzo:</span>
                            <input
                              type="time"
                              value={d.horaAlmuerzoInicio}
                              onChange={(e) => handleChangeDia(key, 'horaAlmuerzoInicio', e.target.value)}
                              className="bg-transparent text-xs font-mono font-bold"
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={d.horaAlmuerzoFin}
                              onChange={(e) => handleChangeDia(key, 'horaAlmuerzoFin', e.target.value)}
                              className="bg-transparent text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No laborable (Cerrado)</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-secondary text-foreground text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <Save size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar Horario Semanal'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BLOQUEOS Y VACACIONES */}
          {activeTab === 'bloqueos' && (
            <div className="space-y-6">
              
              {/* Formulario Crear Bloqueo */}
              <form onSubmit={handleCrearBloqueo} className="bg-secondary/30 p-4 rounded-xl border border-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Plus size={14} className="text-primary" />
                  <span>Agregar Nuevo Bloqueo / Vacaciones</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Fecha / Hora Inicio</label>
                    <input
                      type="datetime-local"
                      required
                      value={bloqueoInicio}
                      onChange={(e) => setBloqueoInicio(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Fecha / Hora Fin</label>
                    <input
                      type="datetime-local"
                      required
                      value={bloqueoFin}
                      onChange={(e) => setBloqueoFin(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Tipo de Bloqueo</label>
                    <select
                      value={bloqueoTipo}
                      onChange={(e) => setBloqueoTipo(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold"
                    >
                      <option value="vacaciones">Vacaciones</option>
                      <option value="permiso_personal">Permiso Personal</option>
                      <option value="emergencia">Emergencia / Médico</option>
                      <option value="mantenimiento">Capacitación / Evento</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Notas / Motivo (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. Viaje programado"
                      value={bloqueoNotas}
                      onChange={(e) => setBloqueoNotas(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Registrar Bloqueo
                  </button>
                </div>
              </form>

              {/* Lista Bloqueos Vigentes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Bloqueos Vigentes</h3>
                <div className="space-y-2">
                  {bloqueos.map(b => (
                    <div key={b.id} className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-foreground uppercase text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary w-max mb-1 border border-primary/20">
                          {b.tipo}
                        </div>
                        <div className="font-mono text-muted-foreground">
                          {new Date(b.inicio).toLocaleString()} — {new Date(b.fin).toLocaleString()}
                        </div>
                        {b.notas && <p className="text-xs text-foreground italic mt-0.5">{b.notas}</p>}
                      </div>
                    </div>
                  ))}

                  {bloqueos.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No hay bloqueos temporales vigentes para este barbero.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
