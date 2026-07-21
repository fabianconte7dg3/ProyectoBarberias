import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fetchApi } from '@/lib/api';

interface Barbero {
  id: string;
  nombreCompleto: string;
}

interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioBase: number;
}

interface QuickWalkInModalProps {
  tenantSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barberos: Barbero[];
  initialDate?: Date;
}

export function QuickWalkInModal({
  tenantSlug,
  isOpen,
  onClose,
  onSuccess,
  barberos,
  initialDate,
}: QuickWalkInModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [barberoId, setBarberoId] = useState(barberos[0]?.id || '');
  
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inicioHora, setInicioHora] = useState('12:00');

  const [servicios, setServicios] = useState<Servicio[]>([]);
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
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto || !telefonoWhatsapp || !servicioId || !barberoId || !fecha || !inicioHora) {
      setError('Por favor completa todos los campos requeridos');
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
        const resultados = await fetchApi<{ id: string }[]>(`/clientes?q=${telefonoWhatsapp}`);
        if (resultados.length > 0) {
          clienteId = resultados[0].id;
        } else {
          throw err;
        }
      }

      // 2. Armar fecha y hora exactas
      const [yyyy, monthIndex, dd] = fecha.split('-').map(Number);
      const [hh, mm] = inicioHora.split(':').map(Number);
      const inicioEstimado = new Date(yyyy, monthIndex - 1, dd, hh, mm);

      // 3. Crear cita (Walk-in / Manual)
      await fetchApi('/citas', {
        method: 'POST',
        body: JSON.stringify({
          clienteId,
          barberoId,
          servicioId,
          inicioEstimado: inicioEstimado.toISOString(),
          origen: 'walk_in',
        }),
      });

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
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
              />
            </div>
          </div>

          {/* Selección Barbero */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Barbero Asignado
            </label>
            <select
              value={barberoId}
              onChange={(e) => setBarberoId(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-hidden text-sm"
            >
              {barberos.map((b) => (
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
