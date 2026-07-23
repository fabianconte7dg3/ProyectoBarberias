import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, MoreVertical, Phone, Scissors, User, AlertTriangle, XCircle, Play, DollarSign } from 'lucide-react';

export interface CitaAgenda {
  id: string;
  inicioEstimado: string;
  finEstimado: string;
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'ausente_strike';
  origen: 'web_cliente' | 'recepcion_walkin' | 'manual';
  barberoId: string;
  barberoNombre: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  servicioId: string;
  servicioNombre: string;
  servicioPrecio: number;
  servicioDuracion: number;
}

interface CitaCardProps {
  cita: CitaAgenda;
  onStatusChange: (citaId: string, nuevoEstado: CitaAgenda['estado']) => void;
  onCobrarClick?: (cita: CitaAgenda) => void;
  canEdit: boolean;
}

const ESTADOS_CONFIG = {
  programada: {
    label: 'Pendiente',
    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  en_curso: {
    label: 'En Sillón',
    bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-pulse',
    dot: 'bg-emerald-500',
  },
  completada: {
    label: 'Completada',
    bg: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'bg-muted border-border text-muted-foreground line-through opacity-60',
    dot: 'bg-zinc-400',
  },
  ausente_strike: {
    label: 'Ausente (Strike)',
    bg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

export function CitaCard({ cita, onStatusChange, onCobrarClick, canEdit }: CitaCardProps) {
  const [showPopover, setShowPopover] = useState(false);

  const inicio = new Date(cita.inicioEstimado);
  const fin = new Date(cita.finEstimado);
  const config = ESTADOS_CONFIG[cita.estado] || ESTADOS_CONFIG.programada;

  const handleWhatsappClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cita.clienteTelefono) return;
    const cleanPhone = cita.clienteTelefono.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div
      className={`relative w-full h-full rounded-xl border p-2.5 shadow-xs transition-all duration-200 hover:shadow-md ${config.bg} flex flex-col justify-between overflow-hidden`}
    >
      {/* Top row: Hora + Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
          <Clock size={12} className="opacity-70" />
          <span>
            {format(inicio, 'HH:mm')} - {format(fin, 'HH:mm')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">{config.label}</span>
          
          {canEdit && cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
            <button
              onClick={() => setShowPopover(!showPopover)}
              className="ml-1 p-1 hover:bg-background/50 rounded-md text-foreground transition-colors"
            >
              <MoreVertical size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Cliente y Servicio */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground truncate">
            <User size={14} className="opacity-70 shrink-0" />
            <span className="truncate">{cita.clienteNombre}</span>
          </div>

          {cita.clienteTelefono && (
            <button
              onClick={handleWhatsappClick}
              className="p-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0"
              title="Abrir WhatsApp"
            >
              <Phone size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <Scissors size={12} className="opacity-70 shrink-0" />
            <span className="truncate">{cita.servicioNombre}</span>
          </div>
          <span className="font-semibold text-foreground shrink-0">${cita.servicioPrecio}</span>
        </div>
      </div>

      {/* Popover de Cambio Rápido de Estado */}
      {showPopover && (
        <div className="absolute right-2 top-10 z-40 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-1.5 w-48 animate-in fade-in zoom-in-95">
          <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 border-b border-border mb-1">
            Cambiar estado
          </div>
          
          {cita.estado !== 'en_curso' && (
            <button
              onClick={() => { onStatusChange(cita.id, 'en_curso'); setShowPopover(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              <Play size={14} />
              <span>Pasar a Sillón</span>
            </button>
          )}

          {onCobrarClick && cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
            <button
              onClick={() => { onCobrarClick(cita); setShowPopover(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <DollarSign size={14} />
              <span>Cobrar Cita</span>
            </button>
          )}

          {cita.estado !== 'ausente_strike' && (
            <button
              onClick={() => { onStatusChange(cita.id, 'ausente_strike'); setShowPopover(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              <AlertTriangle size={14} />
              <span>Marcar Ausente (Strike)</span>
            </button>
          )}

          {cita.estado !== 'cancelada' && (
            <button
              onClick={() => { onStatusChange(cita.id, 'cancelada'); setShowPopover(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-lg text-zinc-500 hover:bg-zinc-500/10 transition-colors"
            >
              <XCircle size={14} />
              <span>Cancelar Cita</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
