import React from 'react';
import { CitaAgenda, CitaCard } from './CitaCard';
import { Clock, Scissors, User, Calendar } from 'lucide-react';

interface BarberoColumn {
  id: string;
  nombreCompleto: string;
  rol: string;
}

interface ListaTurnosViewProps {
  barberos: BarberoColumn[];
  citas: CitaAgenda[];
  selectedDate: Date;
  currentUserId: string;
  currentUserRole: string;
  onStatusChange: (citaId: string, nuevoEstado: CitaAgenda['estado']) => void;
  onCobrarClick?: (cita: CitaAgenda) => void;
}

export function ListaTurnosView({
  barberos,
  citas,
  selectedDate,
  currentUserId,
  currentUserRole,
  onStatusChange,
  onCobrarClick,
}: ListaTurnosViewProps) {
  // Ordenar citas por hora de inicio cronológicamente
  const citasOrdenadas = [...citas].sort((a, b) => 
    new Date(a.inicioEstimado).getTime() - new Date(b.inicioEstimado).getTime()
  );

  const totalCompletadas = citasOrdenadas.filter((c) => c.estado === 'completada').length;
  const totalPendientes = citasOrdenadas.filter((c) => c.estado === 'programada' || c.estado === 'en_curso').length;

  return (
    <div className="flex-1 bg-background p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4">
      
      {/* Resumen del Día */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar size={18} className="text-primary" />
          <span className="text-sm font-extrabold text-foreground">
            Lista de Turnos ({citasOrdenadas.length} cita{citasOrdenadas.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
            {totalCompletadas} Completadas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
            {totalPendientes} Pendientes
          </span>
        </div>
      </div>

      {/* Lista de Turnos */}
      {citasOrdenadas.length > 0 ? (
        <div className="space-y-3">
          {citasOrdenadas.map((cita) => {
            const esMiCita = cita.barberoId === currentUserId;
            const canEdit = currentUserRole === 'admin' || currentUserRole === 'recepcion' || esMiCita;

            return (
              <div key={cita.id} className="relative">
                <CitaCard
                  cita={cita}
                  onStatusChange={onStatusChange}
                  onCobrarClick={onCobrarClick}
                  canEdit={canEdit}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 bg-card border border-border rounded-2xl text-center space-y-2 p-6">
          <Clock size={32} className="mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-bold text-foreground">No hay citas programadas para esta fecha</h3>
          <p className="text-xs text-muted-foreground">Utiliza el botón "+ Cita" para agendar un nuevo servicio.</p>
        </div>
      )}

    </div>
  );
}
